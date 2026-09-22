// Loads the vendored sgraildata snapshot and answers searches over it.

import { lineForStationCode } from "./lines.js";

export async function loadData() {
  const [stations, lines] = await Promise.all([
    fetch("/data/stations.geojson").then((r) => r.json()),
    fetch("/data/lines.geojson").then((r) => r.json()),
  ]);
  return { stations: stations.features.map(toStation), lines };
}

// Keyed by position, not by upstream id: sgraildata ids are not unique.
let nextKey = 0;

function toStation(feature) {
  const p = feature.properties;
  const codes = p.codes.map((code) => ({ code, line: lineForStationCode(code) }));
  return {
    key: `s${nextKey++}`,
    name: p.name,
    nameZh: p.name_zh,
    nameTa: p.name_ta,
    codes,
    lineCodes: [...new Set(codes.map((c) => c.line?.code).filter(Boolean))],
    lngLat: feature.geometry.coordinates,
    // Precomputed search keys.
    keys: [p.name, p.name_zh, p.name_ta].filter(Boolean).map(normalise),
    codeKeys: p.codes.map((c) => c.toLowerCase()),
  };
}

// Lower case, Latin accents dropped, punctuation as spaces. Only the Latin
// combining block is removed: Tamil vowel signs are combining marks too and
// must survive.
export function normalise(text) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s\-'’.()/]+/g, " ")
    .trim();
}

// Spacing ignored, so "one north" and "onenorth" both find "one-north".
const compact = (text) => text.replace(/ /g, "");

function codeNumber(code) {
  return Number(code.match(/\d+/)?.[0] ?? 0);
}

// Ranked: exact code, code prefix, name prefix, name contains.
export function searchStations(stations, query, limit = 30) {
  const q = normalise(query);
  if (!q) return [];
  const qc = compact(q);

  const hits = [];
  for (const s of stations) {
    let rank = Infinity;
    let sortCode = s.codeKeys[0];

    for (const c of s.codeKeys) {
      if (c === qc) { rank = 0; sortCode = c; break; }
      if (c.startsWith(qc) && rank > 1) { rank = 1; sortCode = c; }
    }
    if (rank > 2 && s.keys.some((k) => compact(k).startsWith(qc))) rank = 2;
    // Contains, but not across a word gap: "cg" is not in "Botanic Gardens".
    if (rank > 3 && s.keys.some((k) => k.includes(q))) rank = 3;

    if (rank !== Infinity) hits.push({ s, rank, sortCode });
  }

  hits.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    // Code matches read in line order, NS1, NS2 ... NS10.
    if (a.rank <= 1) return codeNumber(a.sortCode) - codeNumber(b.sortCode);
    return a.s.name.localeCompare(b.s.name);
  });

  return hits.slice(0, limit).map((h) => h.s);
}
