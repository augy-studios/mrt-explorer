# scripts

Run with plain Node 18 or later, from the repo root. No dependencies.

| Script | What it does |
|---|---|
| `vendor-sgraildata.mjs <clone>` | Rebuilds `main-site/data/` from a local sgraildata clone. |
| `check-sw.mjs` | Fails if `skipWaiting()` or `clients.claim()` appear outside the service worker's message handler, or other update-bar rules break. |
| `check-precache.mjs` | Fails if a `PRECACHE` entry is missing on disk, or a module or data file is not precached. |
| `check-theme.mjs` | Fails if a page's pre-paint script drifts from the hours or key in `js/theme.js`. |

Run all three checks before every deploy.
