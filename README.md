# Coagulate.Social

[![CI/CD](https://github.com/LGro/coagulate.social/actions/workflows/ci_cd.yaml/badge.svg)](https://github.com/LGro/coagulate.social/actions/workflows/ci_cd.yaml)
[![No Broken Links](https://github.com/LGro/coagulate.social/actions/workflows/broken_links.yaml/badge.svg)](https://github.com/LGro/coagulate.social/actions/workflows/broken_links.yaml)

The website accompanying the Coagulate smartphone app, built with [Hugo](https://gohugo.io).

## Building & Running

```
hugo server -D
```

For running in production, ensure that you're running HTTPS so that the secret
in the URL does not leak.

Run `wasm_build.sh release` in the Veilid repository at `veilid/veilid-wasm` to update the files contained in `static/js/`.

## Dependencies

We're including a fixed version of the MIT licensed [kjua](https://github.com/lrsjng/kjua) for qrcode rendering.
