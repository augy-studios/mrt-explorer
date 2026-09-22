// The network map. Leaflet over the standard OpenStreetMap tiles, with the
// lines and stations drawn from the vendored GeoJSON. The service worker
// caches tiles as they are viewed; OSM's tile policy forbids prefetching, so
// offline, an area not yet viewed is blank, but the network always draws.

import { LINES, codeBadges } from "./lines.js";
import { escapeHtml } from "./ui.js";

// Leaflet 1.9 is a classic script; index.html loads it before this module.
const L = window.L;

// Below this, station dots shrink so the whole network stays readable on a
// phone. Above the next two, markers grow code badges, then names.
const SMALL_DOTS_BELOW_ZOOM = 10.75;
const CODES_FROM_ZOOM = 12.5;
const NAMES_FROM_ZOOM = 14;

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

let map = null;
let networkBounds = null;
const markers = new Map();
const lineLayers = new Map();
let selectedKey = null;

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function cssToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Room for the floating panels, so a fitted network is not hidden under them.
function fitOptions() {
  const small = window.innerWidth <= 480;
  return {
    paddingTopLeft: [20, small ? 150 : 170],
    paddingBottomRight: [small ? 60 : 80, 30],
  };
}

// Line widths by zoom: 2.5px at 10, 4px at 13, 7px at 16.
function lineWidth(zoom) {
  if (zoom <= 10) return 2.5;
  if (zoom <= 13) return 2.5 + ((zoom - 10) / 3) * 1.5;
  return Math.min(7, 4 + (zoom - 13));
}

function styleLines() {
  const w = lineWidth(map.getZoom());
  const ink = cssToken("--ink");
  for (const { casing, fill } of lineLayers.values()) {
    // The casing is what makes every official colour readable on both the
    // light and dark map: at 60% ink its edge clears 4.4:1 in all 14 theme
    // combinations, where the Circle Line orange alone manages 1.8:1 on light
    // and the Downtown Line blue 2.4:1 on dark.
    casing.setStyle({ color: ink, opacity: 0.6, weight: w + 2 });
    fill.setStyle({ weight: w });
  }
}

function markerHtml(station) {
  // Not in the tab order: 184 stops would bury everything else. Search is
  // the keyboard route to every station.
  return `
    <button class="stn-dot" type="button" tabindex="-1"
      aria-label="${escapeHtml(station.name)}, ${escapeHtml(station.codes.map((c) => c.code).join(" "))}"></button>
    <span class="stn-tag" aria-hidden="true">
      <span class="stn-codes">${codeBadges(station.codes)}</span>
      <span class="stn-name">${escapeHtml(station.name)}</span>
    </span>`;
}

function updateTier() {
  const z = map.getZoom();
  const el = map.getContainer();
  el.dataset.tier = z >= NAMES_FROM_ZOOM ? "2" : z >= CODES_FROM_ZOOM ? "1" : "0";
  el.toggleAttribute("data-small-dots", z < SMALL_DOTS_BELOW_ZOOM);
}

function toLatLng(lngLat) {
  return [lngLat[1], lngLat[0]];
}

export function createMap({ container, stations, lines, onSelect, onClear }) {
  networkBounds = L.latLngBounds(stations.map((s) => toLatLng(s.lngLat)));

  map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    minZoom: 9,
    maxZoom: 18,
    zoomSnap: 0.25,
    wheelPxPerZoomLevel: 90,
    maxBounds: L.latLngBounds([0.9, 103.2], [1.8, 104.4]),
    maxBoundsViscosity: 1,
  });
  map.fitBounds(networkBounds, fitOptions());

  // Dark mode is these same tiles inverted in CSS; OSM has one style.
  L.tileLayer(TILE_URL, {
    maxZoom: 19,
    // CORS rather than opaque, so the service worker can cache tiles at
    // their real size. An opaque response costs megabytes of quota each.
    crossOrigin: true,
  }).addTo(map);

  // Two panes, so every casing sits under every coloured line, even after a
  // line is hidden and shown again.
  map.createPane("casing").style.zIndex = 410;
  map.createPane("lines").style.zIndex = 420;

  const colours = new Map(LINES.map((l) => [l.code, l.color]));
  for (const feature of lines.features) {
    const code = feature.properties.line;
    const casing = L.geoJSON(feature, { pane: "casing", interactive: false, style: { lineCap: "round", lineJoin: "round" } });
    const fill = L.geoJSON(feature, {
      pane: "lines",
      interactive: false,
      style: { color: colours.get(code) ?? cssToken("--muted"), opacity: 1, lineCap: "round", lineJoin: "round" },
    });
    // A line code can span several features: Sengkang and Punggol have two
    // loops each. Feature groups pass setStyle through to every part.
    const entry = lineLayers.get(code) ?? { casing: L.featureGroup().addTo(map), fill: L.featureGroup().addTo(map) };
    entry.casing.addLayer(casing);
    entry.fill.addLayer(fill);
    lineLayers.set(code, entry);
  }
  styleLines();

  for (const station of stations) {
    const interchange = station.codes.length > 1;
    const size = interchange ? 16 : 12;
    const marker = L.marker(toLatLng(station.lngLat), {
      icon: L.divIcon({
        className: interchange ? "stn stn-interchange" : "stn",
        html: markerHtml(station),
        iconSize: [size, size],
      }),
      keyboard: false,
    }).addTo(map);
    marker.on("click", () => onSelect(station, { fromMap: true }));
    markers.set(station.key, { marker, el: marker.getElement(), station });
  }

  // Marker clicks do not bubble to the map, so this is a tap on empty map.
  map.on("click", () => onClear?.());
  map.on("zoom", updateTier);
  map.on("zoomend", styleLines);
  updateTier();

  // Mode changed, by the person or by the clock at 09:00 or 18:00. The tiles
  // follow through CSS; the casing colour is set here.
  new MutationObserver(styleLines).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-mode", "data-color-theme"],
  });

  return map;
}

export function setVisibleLines(visible) {
  for (const [code, { casing, fill }] of lineLayers) {
    const on = visible.has(code);
    for (const layer of [casing, fill]) {
      if (on && !map.hasLayer(layer)) layer.addTo(map);
      if (!on && map.hasLayer(layer)) map.removeLayer(layer);
    }
  }

  // An interchange stays while any of its lines is showing.
  for (const { el, station } of markers.values()) {
    el.classList.toggle("stn-hidden", !station.lineCodes.some((c) => visible.has(c)));
  }
}

export function selectStation(station, { fly = true } = {}) {
  if (selectedKey) {
    const prev = markers.get(selectedKey);
    prev?.el.classList.remove("stn-selected");
    prev?.marker.setZIndexOffset(0);
  }
  selectedKey = station?.key ?? null;
  if (!station) return;

  const entry = markers.get(station.key);
  entry.el.classList.add("stn-selected");
  entry.marker.setZIndexOffset(1000);

  if (fly) {
    const zoom = Math.max(map.getZoom(), NAMES_FROM_ZOOM);
    // Centre the dot and its label together, not the dot alone, so the label
    // does not run off a phone screen or under the zoom controls. And a
    // little below, keeping the station clear of the detail card.
    const tagWidth = entry.el.querySelector(".stn-tag")?.offsetWidth ?? 0;
    const centre = map.unproject(map.project(toLatLng(station.lngLat), zoom).add([tagWidth / 2, 60]), zoom);
    map.setView(centre, zoom, { animate: !reduceMotion() });
  }
}

export function zoomBy(delta) {
  map.setZoom(map.getZoom() + delta, { animate: !reduceMotion() });
}

// Back to the opening view: the whole network in frame.
export function resetZoom() {
  map.fitBounds(networkBounds, { ...fitOptions(), animate: !reduceMotion() });
}
