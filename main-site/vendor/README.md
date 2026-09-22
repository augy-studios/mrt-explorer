# vendor

Third-party code served from this origin rather than a CDN, so it is
precached and works offline.

- `maplibre-gl/`: [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)
  6.10.0, BSD-3-Clause (`maplibre-gl/LICENSE.txt`). Copied unchanged from the
  npm package's `dist/`. The three `.mjs` files must stay side by side: the
  main module imports the shared chunk and starts the worker by a URL
  relative to itself.

To upgrade, copy `maplibre-gl.mjs`, `maplibre-gl-shared.mjs`,
`maplibre-gl-worker.mjs` and `maplibre-gl.css` from the new package's `dist/`,
update the version above, and bump `VERSION` in `sw.js`.
