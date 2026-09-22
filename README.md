# MRT Map Explorer

An offline-capable PWA that shows Singapore's MRT and LRT network on an
interactive map. Toggle lines on and off, tap a station for its codes and its
names in English, Chinese and Tamil, or search by any of them.

Live at <https://mrtexplorer.uwuapps.org>

It is a reference tool. No journey planning, no live arrival times, no
accounts, no backend.

## Hosting

**Everything runs on Vercel as static files. Nothing in this app runs on the
Debian 13 VPS.** There is no API route, no database, no server process and no
environment variable. Vercel's root directory is `main-site`.

## Layout

```
README.md
.gitignore
main-site/     the site Vercel deploys, see main-site/README.md
scripts/       data vendoring and pre-deploy checks, see scripts/README.md
```

The `uwuapps-*.md`, `update-bar-spec.md` and `04-map-explorer.md` files at the
root are the specs this project is built to. `telethon-richmessage-retrofit.md`
applies to a Telethon bot, which this repo does not have.

## Before every deploy

1. Bump `VERSION` in `main-site/sw.js`. Without it, returning visitors keep the
   previous build and never see the update bar.
2. Run the checks:

```
node scripts/check-sw.mjs
node scripts/check-precache.mjs
node scripts/check-theme.mjs
```

## Checking offline by hand

Load the site once, wait a few seconds, go offline, then reload with a
**normal** reload. The map, search and font should all still work.

A hard reload (Ctrl+Shift+R) bypasses the service worker by design, in every
browser, so it will always fail offline. That is not a bug in the app.
