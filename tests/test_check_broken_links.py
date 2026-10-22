"""Exercise the crawler against two local origins; never use public websites."""

from contextlib import ExitStack
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest

from check_broken_links import HTML_LIMIT, LinkChecker, normalize_url


class FixtureSite:
    def __init__(self):
        self.routes = {}
        self.requests = []
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def respond(self):
                owner.requests.append((self.command, self.path))
                status, headers, body = owner.routes.get(
                    (self.command, self.path), owner.routes.get(self.path, (404, {}, "not found"))
                )
                if isinstance(body, str):
                    body = body.encode("utf-8")
                self.send_response(status)
                headers = {"Content-Type": "text/html; charset=utf-8", **headers}
                for key, value in headers.items():
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command != "HEAD":
                    try:
                        self.wfile.write(body)
                    except (BrokenPipeError, ConnectionResetError):
                        pass  # The checker intentionally does not read external bodies.

            do_GET = respond
            do_HEAD = respond

            def log_message(self, *_):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.01})
        self.thread.daemon = True

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def page(self, path, body, status=200, **headers):
        self.routes[path] = status, headers, body


class LinkCheckerTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.internal = self.stack.enter_context(FixtureSite())
        self.external = self.stack.enter_context(FixtureSite())

    def checker(self, path="/", **kwargs):
        return LinkChecker(self.internal.url + path, delay=0, timeout=1, **kwargs)

    def test_external_failure_on_deep_internal_page_is_reported(self):
        self.internal.page("/", '<a href="/one/">One</a>')
        self.internal.page("/one/", '<a href="two/">Two</a>')
        self.internal.page("/one/two/", f'<a href="{self.external.url}/missing">External</a>')
        checker = self.checker()
        self.assertFalse(checker.run())
        self.assertIn(("GET", "/one/two/"), self.internal.requests)
        self.assertEqual(self.external.requests, [("HEAD", "/missing")])
        self.assertIn("404", checker.report())

    def test_external_success_does_not_follow_its_links(self):
        self.internal.page("/", f'<a href="{self.external.url}/ok">External</a>')
        self.external.page("/ok", '<a href="/must-not-be-checked">Child</a>')
        checker = self.checker()
        self.assertTrue(checker.run())
        self.assertEqual(self.external.requests, [("HEAD", "/ok")])

    def test_head_405_and_501_fall_back_to_get_without_external_recursion(self):
        for code in (405, 501):
            with self.subTest(code=code):
                self.external.requests.clear()
                self.internal.page("/", f'<a href="{self.external.url}/no-head">External</a>')
                self.external.routes[("HEAD", "/no-head")] = code, {}, ""
                self.external.page("/no-head", '<a href="/not-followed">Child</a>')
                self.assertTrue(self.checker().run())
                self.assertEqual(self.external.requests, [("HEAD", "/no-head"), ("GET", "/no-head")])

    def test_internal_redirect_to_external_does_not_parse_destination(self):
        self.internal.page("/", '<a href="/leave">Leave</a>')
        self.internal.page("/leave", "", status=302, Location=self.external.url + "/outside")
        self.external.page("/outside", '<a href="/must-not-be-checked">Child</a>')
        self.assertTrue(self.checker().run())
        self.assertEqual(self.external.requests, [("GET", "/outside")])

    def test_start_redirect_establishes_canonical_origin(self):
        self.internal.page("/", "", status=302, Location=self.external.url + "/home/")
        self.external.page("/home/", '<a href="child/">Child</a>')
        self.external.page("/home/child/", "Done")
        self.assertTrue(self.checker().run())
        self.assertIn(("GET", "/home/child/"), self.external.requests)

    def test_redirect_to_ftp_is_rejected_before_fetching_it(self):
        self.internal.page("/", "", status=302, Location="ftp://127.0.0.1:1/file")
        checker = self.checker()
        self.assertFalse(checker.run())
        self.assertIn("Unsupported redirect scheme", checker.report())

    def test_connection_failure_is_reported_as_failure(self):
        site = FixtureSite()
        unused_url = site.url
        site.server.server_close()
        self.internal.page("/", f'<a href="{unused_url}/unreachable">Unavailable</a>')
        checker = self.checker()
        self.assertFalse(checker.run())
        self.assertIn("ERROR HEAD", checker.report())

    def test_base_relative_fragments_queries_assets_and_cycles(self):
        self.internal.page("/", '<base href="/docs/"><a href="page?q=1#one">First</a>'
                           '<a href="page?q=1#two">Same</a><a href="mailto:test@example.com">Mail</a>'
                           '<script src="script.js"></script><img src="image.png">')
        self.internal.page("/docs/page?q=1", '<a href="/">Cycle</a>')
        self.internal.page("/docs/script.js", "not parsed", **{"Content-Type": "text/javascript"})
        self.internal.page("/docs/image.png", b"not parsed", **{"Content-Type": "image/png"})
        self.assertTrue(self.checker().run())
        self.assertCountEqual(self.internal.requests, [
            ("GET", "/"), ("GET", "/docs/page?q=1"),
            ("GET", "/docs/script.js"), ("GET", "/docs/image.png"),
        ])

    def test_internal_failure_does_not_hide_other_links(self):
        self.internal.page("/", '<a href="/missing">Broken</a><a href="/ok">Fine</a>')
        self.internal.page("/ok", "OK")
        checker = self.checker()
        self.assertFalse(checker.run())
        self.assertIn(("GET", "/ok"), self.internal.requests)
        self.assertIn("ERROR GET", checker.report())

    def test_invalid_base_cannot_hide_a_broken_relative_link(self):
        for base in ("javascript:alert(1)", "data:text/plain,unused", "http://["):
            with self.subTest(base=base):
                self.internal.requests.clear()
                self.internal.page("/", f'<base href="{base}"><a href="/missing">Broken</a>')
                checker = self.checker()
                self.assertFalse(checker.run())
                self.assertIn("Invalid base URL", checker.report())
                self.assertIn(("GET", "/missing"), self.internal.requests)

    def test_limit_and_oversized_html_fail_instead_of_claiming_complete(self):
        self.internal.page("/", '<a href="/one">1</a><a href="/two">2</a>')
        checker = self.checker(limit=2)
        self.assertFalse(checker.run())
        self.assertIn("Incomplete check: URL limit", checker.report())
        self.internal.page("/", "x" * (HTML_LIMIT + 1))
        checker = self.checker()
        self.assertFalse(checker.run())
        self.assertIn("HTML response exceeds", checker.report())

    def test_invalid_http_link_fails_and_unsupported_schemes_are_not_requested(self):
        self.internal.page("/", '<a href="http://[">Invalid</a><a href="javascript:alert(1)">JS</a>'
                           '<a href="ftp://example.com/file">FTP</a>')
        checker = self.checker()
        self.assertFalse(checker.run())
        self.assertIn("Invalid linked URL", checker.report())
        self.assertEqual(len(self.internal.requests), 1)

    def test_url_normalization_and_rejection(self):
        self.assertEqual(normalize_url("../café?q=1#x", "https://EXAMPLE.com/a/"),
                         "https://example.com/caf%C3%A9?q=1")
        for invalid in ("file:///tmp/input", "mailto:example@example.com"):
            with self.subTest(url=invalid):
                with self.assertRaises(ValueError):
                    LinkChecker(invalid)
        for invalid in ("http://user:password@example.com/", "http://example.com:invalid/"):
            with self.subTest(url=invalid):
                with self.assertRaises(ValueError):
                    LinkChecker(invalid)

    def test_shell_entrypoint_reports_failure_outside_repository_cwd(self):
        self.internal.page("/", f'<a href="{self.external.url}/missing">Broken</a>')
        script = Path(__file__).resolve().parents[1] / "check_broken_links.sh"
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report with spaces.log"
            result = subprocess.run([
                "bash", str(script), self.internal.url, "--delay", "0", "--report", str(report),
            ], cwd=directory, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIn("404", report.read_text())
            self.assertEqual(result.stdout, report.read_text())


if __name__ == "__main__":
    unittest.main()
