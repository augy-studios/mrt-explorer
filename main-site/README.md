# main-site

The static site Vercel deploys, served at <https://mrtexplorer.uwuapps.org>.
No build step: these files are served as they are.

| Path | What it is |
|---|---|
| `index.html` | The map. Its `<head>` is the template every other page copies. |
| `404.html`, `404.css` | Not-found page. |
| `sw.js` | Service worker: offline shell, and the update bar's waiting worker. |
| `manifest.json` | PWA manifest. |
| `css/` | Theme system and app styles. |
| `js/` | ES modules. `app.js` is the entry point. |
| `data/` | Vendored sgraildata snapshot. |
| `vendor/` | Vendored Leaflet. |
| `images/` | Manifest screenshots. |

The map is Leaflet over the standard
[OpenStreetMap tiles](https://tile.openstreetmap.org), which need no key.
Dark mode is the same tiles inverted in CSS. The lines and stations come
from the vendored data, so they always draw, online or off.

The service worker caches tiles as they are viewed, for 30 days, capped at
1,500. It never prefetches: the
[OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
forbids it. So offline, an area not yet viewed shows as blank ground. The
policy also requires the attribution shown on the map, and OSM may throttle a
site whose traffic grows heavy; if that happens, move to a paid or
self-hosted tile source.

CARTO's basemaps were tried first and now need an API key, which this
project does not use.

Bump `VERSION` in `sw.js` on every change to anything in this directory.
