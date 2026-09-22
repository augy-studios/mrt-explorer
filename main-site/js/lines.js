// The one place line colours and names live. Everything else, map layers,
// badges, toggles, derives from a line code through here.

import { escapeHtml } from "./ui.js";

// Official network colours. Fixed meaning, so they stay the same across
// every theme, like the footer heart.
export const LINES = [
  { code: "NS", name: "North-South Line", color: "#d42e12" },
  { code: "EW", name: "East-West Line", color: "#009645", prefixes: ["EW", "CG"] },
  { code: "NE", name: "North East Line", color: "#9900aa" },
  { code: "CC", name: "Circle Line", color: "#fa9e0d", prefixes: ["CC", "CE"] },
  { code: "DT", name: "Downtown Line", color: "#005ec4" },
  { code: "TE", name: "Thomson-East Coast Line", color: "#9d5b25" },
  { code: "BP", name: "Bukit Panjang LRT", color: "#748477" },
  { code: "SK", name: "Sengkang LRT", color: "#748477", prefixes: ["SE", "SW", "STC"] },
  { code: "PG", name: "Punggol LRT", color: "#748477", prefixes: ["PE", "PW", "PTC"] },
];

const byCode = new Map(LINES.map((l) => [l.code, l]));

const byPrefix = new Map();
for (const line of LINES) {
  for (const p of line.prefixes ?? [line.code]) byPrefix.set(p, line);
}

export function getLine(code) {
  return byCode.get(code);
}

// "NS17" -> North-South Line, "STC" -> Sengkang LRT, "CG" -> East-West Line.
export function lineForStationCode(stationCode) {
  const prefix = stationCode.match(/^[A-Z]+/)?.[0];
  return byPrefix.get(prefix);
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Text on a line colour: white or dark ink, whichever contrasts more.
// Every official colour clears 4.5:1 with one of the two.
export function inkOn(hex) {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onDark = (l + 0.05) / (luminance("#121815") + 0.05);
  return onWhite >= onDark ? "#ffffff" : "#121815";
}

// Inline custom properties for a badge or dot in a line's colour.
export function lineStyle(line) {
  return `--line:${line.color};--line-ink:${inkOn(line.color)}`;
}

// A station code as a badge in its line's colour.
export function codeBadge({ code, line }) {
  const style = line ? ` style="${lineStyle(line)}"` : "";
  return `<span class="code-badge"${style}>${escapeHtml(code)}</span>`;
}

export function codeBadges(codes) {
  return codes.map(codeBadge).join("");
}
