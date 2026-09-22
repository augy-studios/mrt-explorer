// The network map. MapLibre with no basemap: lines and stations on the
// page's own flat background, so nothing is fetched beyond the app itself
// and the map works offline exactly as it does online.

import * as maplibregl from "/vendor/maplibre-gl/maplibre-gl.mjs";
import { LINES, codeBadges } from "./lines.js";
import { escapeHtml } from "./ui.js";

// Zoom levels at which markers grow their code badges, then their names.
const CODES_FROM_ZOOM = 12.5;
const NAMES_FROM_ZOOM = 14;

let map = null;
let networkBounds = null;
const markers = new Map();
let selectedKey = null;

function cssToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function boundsOf(stations) {
  const b = new maplibregl.LngLatBounds();
  stations.forEach((s) => b.extend(s.lngLat));
  return b;
}

// Room for the floating panels, so a fitted network is not hidden under them.
function viewPadding() {
  const small = window.innerWidth <= 480;
  return { top: small ? 150 : 170, bottom: 40, left: 30, right: small ? 60 : 80 };
}

function markerElement(station) {
  const el = document.createElement("div");
  el.className = "stn";
  if (station.codes.length > 1) el.classList.add("stn-interchange");
  el.dataset.key = station.key;

  // Not in the tab order: 184 stops would bury everything else. Search is
  // the keyboard route to every station.
  el.innerHTML = `
    <button class="stn-dot" type="button" tabindex="-1"
      aria-label="${escapeHtml(station.name)}, ${escapeHtml(station.codes.map((c) => c.code).join(" "))}"></button>
    <span class="stn-tag" aria-hidden="true">
      <span class="stn-codes">${codeBadges(station.codes)}</span>
      <span class="stn-name">${escapeHtml(station.name)}</span>
    </span>`;
  return el;
}

function updateTier() {
  const z = map.getZoom();
  const tier = z >= NAMES_FROM_ZOOM ? "2" : z >= CODES_FROM_ZOOM ? "1" : "0";
  map.getContainer().dataset.tier = tier;
}

function applyThemeToMap() {
  if (!map?.getLayer("line-casing")) return;
  map.setPaintProperty("line-casing", "line-color", cssToken("--ink"));
}

export function createMap({ container, stations, lines, onSelect, onClear }) {
  networkBounds = boundsOf(stations);

  map = new maplibregl.Map({
    container,
    // No sources beyond our own GeoJSON, no glyphs, no sprites: nothing that
    // needs a server. No background layer either, so the canvas is
    // transparent and the themed page colour shows through.
    style: { version: 8, sources: {}, layers: [] },
    bounds: networkBounds,
    fitBoundsOptions: { padding: viewPadding() },
    // Generous on purpose. The whole viewport must fit inside these, so a
    // tight box forces a tall phone screen to zoom in and crop the network.
    maxBounds: [
      [103.1, 0.5],
      [104.5, 2.2],
    ],
    minZoom: 9,
    maxZoom: 17.5,
    attributionControl: false,
    renderWorldCopies: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  });
  map.touchZoomRotate.disableRotation();

  map.on("load", () => {
    map.addSource("lines", { type: "geojson", data: lines });

    const width = ["interpolate", ["linear"], ["zoom"], 10, 2.5, 13, 4, 16, 7];
    const casingWidth = ["interpolate", ["linear"], ["zoom"], 10, 4.5, 13, 6, 16, 9];

    // The casing is what makes every official colour readable on both the
    // light and dark page: at 60% ink its edge clears 4.4:1 in all 14 theme
    // combinations, where the Circle Line orange alone manages 1.8:1 on light
    // and the Downtown Line blue 2.4:1 on dark.
    map.addLayer({
      id: "line-casing",
      type: "line",
      source: "lines",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": cssToken("--ink"), "line-opacity": 0.6, "line-width": casingWidth },
    });

    map.addLayer({
      id: "line-fill",
      type: "line",
      source: "lines",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": ["match", ["get", "line"], ...LINES.flatMap((l) => [l.code, l.color]), cssToken("--muted")],
        "line-width": width,
      },
    });
  });

  for (const station of stations) {
    const el = markerElement(station);
    el.querySelector(".stn-dot").addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect(station, { fromMap: true });
    });
    const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(station.lngLat).addTo(map);
    markers.set(station.key, { marker, el, station });
  }

  // Marker clicks stop propagation, so this is a tap on empty map.
  map.on("click", () => onClear?.());

  map.on("zoom", updateTier);
  updateTier();

  // Mode or swatch changed, by the person or by the clock at 09:00 or 18:00.
  new MutationObserver(applyThemeToMap).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-mode", "data-color-theme"],
  });

  return map;
}

export function setVisibleLines(visible) {
  const codes = [...visible];
  const apply = () => {
    const filter = ["in", ["get", "line"], ["literal", codes]];
    map.setFilter("line-casing", filter);
    map.setFilter("line-fill", filter);
  };
  if (map.getLayer("line-fill")) apply();
  else map.once("load", apply);

  // An interchange stays while any of its lines is showing.
  for (const { el, station } of markers.values()) {
    el.classList.toggle("stn-hidden", !station.lineCodes.some((c) => visible.has(c)));
  }
}

export function selectStation(station, { fly = true } = {}) {
  if (selectedKey) markers.get(selectedKey)?.el.classList.remove("stn-selected");
  selectedKey = station?.key ?? null;
  if (!station) return;

  const entry = markers.get(station.key);
  entry.el.classList.add("stn-selected");

  if (fly) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.easeTo({
      center: station.lngLat,
      zoom: Math.max(map.getZoom(), NAMES_FROM_ZOOM),
      duration: reduce ? 0 : 600,
      // Keep the station clear of the detail card at the bottom.
      offset: [0, -60],
    });
  }
}

export function zoomBy(delta) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  map.easeTo({ zoom: map.getZoom() + delta, duration: reduce ? 0 : 200 });
}

export function fitNetwork() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  map.fitBounds(networkBounds, { padding: viewPadding(), duration: reduce ? 0 : 600 });
}
