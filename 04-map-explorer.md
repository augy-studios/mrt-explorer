# Claude Code Prompt — MRT Map Explorer

## Read first, before writing any code

Do these two things before creating a single file. Do not scaffold, do not write
markup, do not write CSS until both are done.

**1. Read `uwuapps-theme.md`.** It defines the theme for this project: the
two-axis theming architecture (colour theme plus light and dark mode), the WCAG
AA contrast requirements, and the time-based mode switching with
boundary-crossing timers. Apply it throughout. Do not invent a visual style, and
do not approximate the theme from memory.

If `uwuapps-theme.md` is not in this repo, look in the sibling uwuapps project
directories. If it cannot be found, stop and ask. Do not proceed with a guess.

**2. Author the repo root `index.html` first, and treat its `<head>` block as the
template for every other HTML file in this repo.** Every subsequent page copies
that head structure exactly, changing only the title, description, and
page-specific tags. Do not write a fresh head block per page, and do not
restructure the head once it is set.

Both steps gate everything else. The full theming detail is in the "Theming and
HTML structure" section below.

## What to build

An offline-capable PWA that renders the Singapore MRT and LRT network as an
interactive map. Toggle lines on and off, tap a station to see its codes and
its names in English, Chinese and Tamil.

This is a reference tool, not a game. It has no accounts, no scores, and no
backend.

**It should work with no network connection after first load.** That is the
main thing that distinguishes it from opening a map website.

## Scope

Included:

- All MRT and LRT lines rendered from GeoJSON
- Station markers with tap-to-expand detail
- Per-line visibility toggles
- Search by station name in any of the three languages, or by station code
- Full offline operation via service worker

Deliberately excluded:

- Journey planning or routing
- Live arrival times
- Any backend, database, or user accounts
- Any leaderboard, score, or name submission

## Data

Source: `https://github.com/cheeaun/sgraildata` — the `/data` folder.

Roughly 170 MRT and LRT stations plus rail line geometry as GeoJSON.

Vendor a snapshot into the repo and serve it as a static asset. There is no
runtime data fetching and no API.

Caveats from the repo's own README, which should be handled and in one case
disclosed:

- Rail line coordinates are simplified and smoothed, and do not match the real
  tracks. Note this in the app's about section.
- Ids are not guaranteed unique, so do not key anything on them
- Station building and exit data is incomplete. This project does not use it.

Interchange stations carry multiple codes. Render them as a single marker
showing all codes rather than as overlapping markers.

## Optional: live service alerts

If adding a current-disruptions panel, the source is LTA DataMall's Train
Service Alerts endpoint. It requires an AccountKey.

**The AccountKey cannot go in client-side code.** It would need a serverless
proxy route to keep the key server-side. This also means the app is no longer
purely static.

Treat this as a later addition. Build and ship the offline map first.

## Rendering

MapLibre GL JS with a free raster or vector tile source that does not require
an API key, so the app stays dependency-free and deployable anywhere.

If a keyless tile source proves unworkable, the fallback is rendering the
GeoJSON on a plain background with no basemap at all. A schematic MRT map with
no streets underneath is arguably better for this use case anyway, and it
removes the tile dependency entirely.

Line colours should match the official network colours. Derive them from the
line codes rather than hardcoding a lookup in multiple places.

## Environment variables

None for the build described here. This app is fully static with no API, no
database, and no keys.

If a `.env` file or any environment variable reference appears in the output,
something has gone wrong. Do not add one.

The only variable this app could ever need is `LTA_ACCOUNT_KEY`, and only if the
optional service alerts panel above is built later. That is out of scope for this
prompt. Do not add it, and do not add a proxy route for it.

## Repo layout

```
mrt-map/
├── README.md
├── .gitignore
└── main-site/
    ├── README.md
    ├── index.html
    ├── manifest.json
    ├── sw.js
    └── data/            # vendored sgraildata snapshot
```

Vercel's root directory is set to `main-site`. There is no `api` directory
because this project has no backend. Every directory including the project
root gets a README.

## Theming and HTML structure

Read `uwuapps-theme.md` before writing any markup or CSS, and apply that theme
throughout. If it is not in this repo, look in the sibling uwuapps project
directories. Stop and ask rather than guessing at the theme if it cannot be
found.

Author the repo root `index.html` first. Its `<head>` block is the canonical
template for this repo: every other HTML file copies that head structure
exactly, changing only the title, description, and page-specific tags. Do not
write a fresh head block per page.

Theme switching follows the uwuFlights pattern: `data-color-theme` and
`data-mode` on the `html` element, seven brand swatches plus light and dark.
Light mode is the default and ignores OS preference. The default brand colour is
`#ccffcc` mint green.

Text and body contrast must meet WCAG AA.

### Visual style

Professional-looking glassmorphism. Glass cards over a flat background.

Backgrounds use static colours derived from the active theme. No gradients, no
orbs, no blobs, no animated background effects of any kind. If the background
needs visual interest, the answer is a different flat colour, not a gradient.

Jua is the font throughout, with no secondary typeface.

No emoji anywhere in the UI. Every icon is an inline SVG, including the ones a
first draft would reach for emoji to fill.

### File splitting

No single-file HTML. Markup, styles, and behaviour go in separate files:

```
index.html
css/style.css
js/app.js
```

Split further by concern as the app grows. Inline `<style>` and `<script>`
blocks are not acceptable except for the theme-flash-prevention snippet in the
head, if the theme doc calls for one.

### Buy Augy a Coffee button

Place it immediately next to the theme switcher button, styled to match it.

- A coffee icon as an inline SVG, no emoji
- Opens `https://donate.stripe.com/28o2akeAr3hv0DK6oo` in a new tab
- `rel="noopener noreferrer"`
- Accessible label, since the button is icon-only

### Delivery

Give every project file separately. Do not produce a zip or any other archive.
Deployment is handled manually.

### Hosting

Everything runs on Vercel as static files. Nothing in this app needs to run on
the Debian 13 VPS.

Say so explicitly in the root README. If any part of the build would require
something on the VPS, stop and flag it rather than adding it.

## PWA requirements

- Installable, with a complete manifest and icon set
- Service worker caches the GeoJSON, tiles if used, and the app shell
- Works fully offline on second load

Test the offline path explicitly. Load once, go offline, hard reload, confirm
the map still renders and search still works.

## Code style

Keep comments short. No decorative comment banners or long separator lines.

Deliver files individually. Do not produce a zip.

## Build order

0. Read `uwuapps-theme.md` and author the root `index.html` head block
1. Load and render the GeoJSON, one line, no interaction
2. All lines with visibility toggles
3. Station markers and detail panel
4. Multilingual search
5. Service worker and offline verification

This is the smallest of the MRT projects and has no database or API. It is a
reasonable one to build first to get the station data understood before
attempting anything that needs a backend.
