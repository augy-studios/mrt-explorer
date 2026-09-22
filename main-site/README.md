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
| `vendor/` | Vendored MapLibre GL JS. |
| `images/` | Manifest screenshots. |

The map uses MapLibre with no basemap: the lines and stations sit on the
theme's flat background. Nothing is fetched from a tile server, so the map
works offline exactly as it does online.

Bump `VERSION` in `sw.js` on every change to anything in this directory.
