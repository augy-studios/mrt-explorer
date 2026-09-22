# data

A snapshot of [cheeaun/sgraildata](https://github.com/cheeaun/sgraildata),
`data/v1/sg-rail.geojson`, at commit `d64f9408` (12 July 2026). Built by
`scripts/vendor-sgraildata.mjs`; do not edit these files by hand.

- `stations.geojson`: 184 stations. Properties `name`, `name_zh`
  (Simplified Chinese), `name_ta` and `codes`. An interchange is one feature
  with several codes.
- `lines.geojson`: 11 line features, each with a `line` code (`NS`, `EW`,
  `SK` and so on) that `js/lines.js` maps to a name and colour.

Station exits and building outlines are left out: they are incomplete
upstream and this app does not use them.

Caveats from upstream:

- Line coordinates are simplified and smoothed and do not match the real
  tracks. The app says so in its About dialog.
- Upstream ids are not unique, so nothing here is keyed on them.

Upstream sources: LTA DataMall, data.gov.sg, Wikipedia (Chinese and Tamil
names) and OpenStreetMap (some line geometry, ODbL, credited on the map).

To refresh:

```
git clone --depth 1 https://github.com/cheeaun/sgraildata.git <somewhere>
node scripts/vendor-sgraildata.mjs <somewhere>/sgraildata
```

Then update the commit and date above and in the About dialog in
`index.html`, and bump `VERSION` in `sw.js`.
