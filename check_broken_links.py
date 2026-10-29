#!/usr/bin/env python3
"""Follow site links recursively, and check external links without crawling them.

Only HTTP(S) URLs are checked. Internal means the same scheme, hostname and
effective port as the start page after redirects. Fragments are ignored; query
strings are retained. HTML href/src links are checked, not CSS or JavaScript.
"""

import argparse
from collections import deque
from html.parser import HTMLParser
from pathlib import Path
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


HTML_LIMIT = 2 * 1024 * 1024


def normalize_url(value, base=""):
    parts = urlsplit(urljoin(base, value))
    if parts.scheme.lower() not in ("http", "https"):
        return None
    if not parts.hostname or parts.username or parts.password:
        raise ValueError("HTTP(S) URL must have a host and no credentials")
    parts.port  # Reject malformed ports before requesting a URL.
    host = parts.hostname.encode("idna").decode("ascii").lower()
    if ":" in host:
        host = f"[{host}]"
    if parts.port is not None:
        host = f"{host}:{parts.port}"
    return urlunsplit((
        parts.scheme.lower(), host,
        quote(parts.path or "/", safe="/%:@"),
        quote(parts.query, safe="=&?/:;+,%@"), "",
    ))


def origin(url):
    parts = urlsplit(url)
    port = parts.port if parts.port is not None else (443 if parts.scheme == "https" else 80)
    return parts.scheme, parts.hostname, port


class PageLinks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.base = None
        self.links = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "base":
            if self.base is None:
                self.base = attributes.get("href")
            return
        if tag in ("a", "area", "link") and attributes.get("href") is not None:
            self.links.append(attributes["href"])
        if tag in ("img", "script", "iframe", "audio", "video", "source"):
            if attributes.get("src") is not None:
                self.links.append(attributes["src"])


class BoundedRedirects(HTTPRedirectHandler):
    max_redirections = 5
    max_repeats = 2

    def redirect_request(self, request, response, code, message, headers, newurl):
        if urlsplit(newurl).scheme.lower() not in ("http", "https"):
            raise HTTPError(newurl, code, "Unsupported redirect scheme", headers, response)
        return super().redirect_request(request, response, code, message, headers, newurl)


class LinkChecker:
    def __init__(self, start, *, timeout=10, delay=1, limit=2000):
        self.start = normalize_url(start)
        if self.start is None:
            raise ValueError("start URL must use http or https")
        self.site_origin = origin(self.start)
        self.timeout = timeout
        self.delay = delay
        self.limit = limit
        self.opener = build_opener(BoundedRedirects())
        self.records = []
        self.discovered = {self.start}
        self.internal = deque([self.start])
        self.external = []
        self.requested = False

    def request(self, url, method):
        if self.requested and self.delay:
            time.sleep(self.delay)
        self.requested = True
        request = Request(url, method=method, headers={"User-Agent": "Reunicorn-Link-Checker/1.0"})
        return self.opener.open(request, timeout=self.timeout)

    def record(self, url, method, ok, detail):
        self.records.append({"url": url, "method": method, "ok": ok, "detail": str(detail)})

    def add_links(self, text, page_url):
        parser = PageLinks()
        parser.feed(text)
        base = page_url
        if parser.base is not None:
            try:
                candidate = normalize_url(parser.base, page_url)
                if candidate is None:
                    raise ValueError("base URL must use http or https")
                base = candidate
            except (ValueError, UnicodeError) as error:
                self.record(page_url, "PARSE", False, f"Invalid base URL: {error}")
        for value in parser.links:
            try:
                url = normalize_url(value, base)
            except (ValueError, UnicodeError) as error:
                self.record(page_url, "PARSE", False, f"Invalid linked URL: {error}")
                continue
            if url is None or url in self.discovered:
                continue
            if len(self.discovered) >= self.limit:
                self.record(page_url, "LIMIT", False, f"Incomplete check: URL limit {self.limit} reached")
                return False
            self.discovered.add(url)
            if origin(url) == self.site_origin:
                self.internal.append(url)
            else:
                self.external.append(url)
        return True

    def check_internal(self, url):
        try:
            with self.request(url, "GET") as response:
                final_url = normalize_url(response.geturl())
                if url == self.start:
                    self.site_origin = origin(final_url)
                status = response.status
                if not 200 <= status < 300:
                    raise ValueError(f"Unresolved HTTP status {status}")
                text = None
                if origin(final_url) == self.site_origin and response.headers.get_content_type() in (
                    "text/html", "application/xhtml+xml",
                ):
                    data = response.read(HTML_LIMIT + 1)
                    if len(data) > HTML_LIMIT:
                        raise ValueError("Incomplete check: HTML response exceeds 2 MiB")
                    text = data.decode(response.headers.get_content_charset() or "utf-8")
            self.record(url, "GET", True, f"HTTP {status}")
            return text is None or self.add_links(text, final_url)
        except (HTTPError, URLError, OSError, ValueError, UnicodeError, LookupError) as error:
            self.record(url, "GET", False, error)
            if isinstance(error, HTTPError):
                error.close()
            return True

    def check_external(self, url):
        method = "HEAD"
        try:
            try:
                response = self.request(url, method)
            except HTTPError as error:
                if error.code not in (405, 501):
                    raise
                error.close()
                method = "GET"
                response = self.request(url, method)
            with response:
                status = response.status
                if not 200 <= status < 300:
                    raise ValueError(f"Unresolved HTTP status {status}")
            # Never read or parse an external response, including after redirects.
            self.record(url, method, True, f"HTTP {status}")
        except (HTTPError, URLError, OSError, ValueError, UnicodeError) as error:
            self.record(url, method, False, error)
            if isinstance(error, HTTPError):
                error.close()

    def run(self):
        while self.internal:
            if not self.check_internal(self.internal.popleft()):
                break
        for url in self.external:
            self.check_external(url)
        return all(record["ok"] for record in self.records)

    def report(self):
        lines = ["Internal pages: recursive. External links: direct checks only."]
        for record in self.records:
            label = "OK" if record["ok"] else "ERROR"
            detail = record["detail"].replace("\n", " ").replace("\r", " ")
            lines.append(f"{label} {record['method']} {record['url']} - {detail}")
        failures = sum(not record["ok"] for record in self.records)
        lines.append(f"Checked {len(self.records)} URLs/operations; {failures} failed or incomplete.")
        return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--report", default="/tmp/reunicorn_broken_links.log")
    parser.add_argument("--timeout", type=float, default=10)
    parser.add_argument("--delay", type=float, default=1)
    parser.add_argument("--limit", type=int, default=2000)
    args = parser.parse_args()
    if args.timeout <= 0 or args.delay < 0 or args.limit < 1:
        parser.error("timeout and limit must be positive; delay must not be negative")
    try:
        checker = LinkChecker(args.url, timeout=args.timeout, delay=args.delay, limit=args.limit)
    except (ValueError, UnicodeError) as error:
        parser.error(str(error))
    success = checker.run()
    report = checker.report()
    Path(args.report).write_text(report, encoding="utf-8")
    print(report, end="")
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
