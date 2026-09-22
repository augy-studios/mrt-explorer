# vendor

Third-party code served from this origin rather than a CDN, so it is
precached and works offline.

- `leaflet/`: [Leaflet](https://leafletjs.com) 1.9.4, BSD-2-Clause
  (`leaflet/LICENSE.txt`). `leaflet.js` and `leaflet.css` copied unchanged
  from the npm package's `dist/`. Loaded as a classic deferred script before
  `js/app.js`, which reads it from `window.L`.

Leaflet's `images/` folder is left out on purpose: it only serves the
default pin and the layers control, and this app uses neither.

To upgrade, copy the two files from the new package's `dist/`, update the
version above, and bump `VERSION` in `sw.js`.
