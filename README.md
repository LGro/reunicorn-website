# Coagulate.Social

The website accompanying the Coagulate smartphone app, built with [Hugo](https://gohugo.io).

## Building & Running

```
hugo server -D
```

For running in production, ensure that you're running HTTPS so that the secret
in the URL does not leak.

Run `build_wasm.sh release` in the Veilid repository at `veilid/veilid-wasm` to update the files contained in `static/js/`.
