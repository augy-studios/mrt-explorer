import { COLOR_THEMES, applyColorTheme, applyMode, getStoredColorTheme, getStoredMode, getModePreference, initTheme } from "./theme.js";
import { hydrateIcons, openModal, closeModal, closeTopModal, escapeHtml } from "./ui.js";
import { initUpdateBar } from "./update-bar.js";
import { LINES, lineStyle, codeBadge, codeBadges } from "./lines.js";
import { loadData, searchStations } from "./stations.js";
import { createMap, setVisibleLines, selectStation, zoomBy, fitNetwork } from "./map.js";

const HIDDEN_LINES_KEY = "mrtexplorer.hiddenLines";

let stations = [];
let visibleLines = new Set(LINES.map((l) => l.code));

/* Theme modal, per uwuapps-theme.md section 6. */

function buildThemeModal() {
  const grid = document.getElementById("swatchGrid");
  grid.innerHTML = COLOR_THEMES.map(
    (t) => `
      <button class="swatch" data-theme-id="${t.id}" style="--swatch-color:${t.hex}" type="button" aria-label="${t.label}">
        <span class="swatch-dot"></span>
        <span class="swatch-label">${t.label}</span>
      </button>`
  ).join("");

  syncThemeModalState();

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-id]");
    if (!btn) return;
    applyColorTheme(btn.dataset.themeId);
    syncThemeModalState();
  });

  document.getElementById("modeToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    applyMode(btn.dataset.mode);
    syncThemeModalState();
  });

  // A tab left open across 09:00 or 18:00 re-resolves itself; redraw the
  // modal so the note and pressed state stay in step with the change.
  document.addEventListener("uwu:modechange", syncThemeModalState);
}

function syncThemeModalState() {
  const activeTheme = getStoredColorTheme();
  const activePreference = getModePreference();
  const resolvedMode = getStoredMode();

  document.querySelectorAll("#swatchGrid .swatch").forEach((el) => {
    el.classList.toggle("active", el.dataset.themeId === activeTheme);
  });
  document.querySelectorAll("#modeToggle .mode-btn").forEach((el) => {
    const isActive = el.dataset.mode === activePreference;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-pressed", String(isActive));
  });

  const note = document.getElementById("modeNote");
  if (note) {
    note.hidden = activePreference !== "time";
    if (activePreference === "time") {
      note.textContent = `Following the clock. Currently ${resolvedMode}.`;
    }
  }

  updateThemeButtonIcon();
}

function updateThemeButtonIcon() {
  const span = document.querySelector("#themeBtn [data-icon]");
  span.setAttribute("data-icon", getStoredMode() === "dark" ? "moon" : "sun");
  hydrateIcons(document.getElementById("themeBtn"));
}

function wireModals() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });
  document.getElementById("themeBtn").addEventListener("click", () => openModal("themeModal"));
  document.getElementById("aboutBtn").addEventListener("click", () => openModal("aboutModal"));
}

/* Line toggles. */

function loadHiddenLines() {
  try {
    const hidden = JSON.parse(localStorage.getItem(HIDDEN_LINES_KEY) || "[]");
    visibleLines = new Set(LINES.map((l) => l.code).filter((c) => !hidden.includes(c)));
  } catch {
    // Unreadable or blocked storage: show everything.
  }
}

function saveHiddenLines() {
  try {
    const hidden = LINES.map((l) => l.code).filter((c) => !visibleLines.has(c));
    localStorage.setItem(HIDDEN_LINES_KEY, JSON.stringify(hidden));
  } catch {
    // Not persisted this time; the toggles still work for this visit.
  }
}

function buildLineToggles() {
  const list = document.getElementById("lineList");
  list.innerHTML = LINES.map(
    (l) => `
      <button class="line-chip" type="button" data-line="${l.code}" aria-pressed="true" style="${lineStyle(l)}">
        <span class="line-swatch"></span>${escapeHtml(l.name)}
      </button>`
  ).join("");

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-line]");
    if (!btn) return;
    const code = btn.dataset.line;
    if (visibleLines.has(code)) visibleLines.delete(code);
    else visibleLines.add(code);
    applyLineVisibility();
  });

  document.getElementById("showAllLines").addEventListener("click", () => {
    visibleLines = new Set(LINES.map((l) => l.code));
    applyLineVisibility();
  });

  const toggle = document.getElementById("linesToggle");
  const panel = document.getElementById("linesPanel");
  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("hidden") === false;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) closeResults();
  });
}

function applyLineVisibility() {
  document.querySelectorAll("#lineList .line-chip").forEach((el) => {
    el.setAttribute("aria-pressed", String(visibleLines.has(el.dataset.line)));
  });
  document.getElementById("linesCount").textContent = `${visibleLines.size} of ${LINES.length}`;
  setVisibleLines(visibleLines);
  saveHiddenLines();
}

/* Search. */

function closeResults() {
  document.getElementById("searchResults").classList.add("hidden");
  document.getElementById("searchInput").setAttribute("aria-expanded", "false");
}

function renderResults(query) {
  const box = document.getElementById("searchResults");
  const input = document.getElementById("searchInput");
  const status = document.getElementById("searchStatus");

  if (!query.trim()) {
    closeResults();
    status.textContent = "";
    return;
  }

  const hits = searchStations(stations, query);
  status.textContent = hits.length ? `${hits.length} ${hits.length === 1 ? "station" : "stations"} found` : "No stations found";

  box.innerHTML = hits.length
    ? hits
        .map(
          (s) => `
        <li>
          <button class="result" type="button" data-key="${s.key}">
            <span class="result-codes">${codeBadges(s.codes)}</span>
            <span class="result-text">
              <span class="result-name">${escapeHtml(s.name)}</span>
              <span class="result-alt"><span lang="zh-Hans">${escapeHtml(s.nameZh)}</span> <span lang="ta">${escapeHtml(s.nameTa)}</span></span>
            </span>
          </button>
        </li>`
        )
        .join("")
    : `<li class="result-empty">No station matches that name or code.</li>`;

  box.classList.remove("hidden");
  input.setAttribute("aria-expanded", "true");
  document.getElementById("linesPanel").classList.add("hidden");
  document.getElementById("linesToggle").setAttribute("aria-expanded", "false");
}

function wireSearch() {
  const input = document.getElementById("searchInput");
  const box = document.getElementById("searchResults");
  const clear = document.getElementById("searchClear");

  input.addEventListener("input", () => {
    clear.classList.toggle("hidden", !input.value);
    renderResults(input.value);
  });

  input.addEventListener("focus", () => {
    if (input.value) renderResults(input.value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      box.querySelector(".result")?.focus();
    } else if (e.key === "Enter") {
      box.querySelector(".result")?.click();
    }
  });

  box.addEventListener("keydown", (e) => {
    const items = [...box.querySelectorAll(".result")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && i < items.length - 1) {
      e.preventDefault();
      items[i + 1].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (i > 0 ? items[i - 1] : input).focus();
    }
  });

  box.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-key]");
    if (!btn) return;
    const station = stations.find((s) => s.key === btn.dataset.key);
    closeResults();
    showDetail(station, { focus: true });
  });

  clear.addEventListener("click", () => {
    input.value = "";
    clear.classList.add("hidden");
    renderResults("");
    input.focus();
  });
}

/* Detail card. */

function showDetail(station, { focus = false, fromMap = false } = {}) {
  const card = document.getElementById("detail");

  // A station on a hidden line can still be found by search. Show its line
  // again rather than flying to an empty spot.
  if (!station.lineCodes.some((c) => visibleLines.has(c))) {
    station.lineCodes.forEach((c) => visibleLines.add(c));
    applyLineVisibility();
  }

  document.getElementById("detailName").textContent = station.name;
  document.getElementById("detailZh").textContent = station.nameZh;
  document.getElementById("detailTa").textContent = station.nameTa;
  document.getElementById("detailLines").innerHTML = station.codes
    .map(
      (c) => `
      <li class="detail-line">
        ${codeBadge(c)}
        <span>${escapeHtml(c.line?.name ?? "")}</span>
      </li>`
    )
    .join("");

  card.classList.remove("hidden");
  selectStation(station, { fly: !fromMap });
  if (focus) card.focus();
}

function hideDetail() {
  document.getElementById("detail").classList.add("hidden");
  selectStation(null);
}

/* Map controls and keys. */

function wireMapControls() {
  document.getElementById("zoomIn").addEventListener("click", () => zoomBy(1));
  document.getElementById("zoomOut").addEventListener("click", () => zoomBy(-1));
  document.getElementById("fitBtn").addEventListener("click", fitNetwork);
  document.getElementById("detailClose").addEventListener("click", hideDetail);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (closeTopModal()) return;
    if (!document.getElementById("searchResults").classList.contains("hidden")) {
      closeResults();
      document.getElementById("searchInput").focus();
      return;
    }
    hideDetail();
  });

  // Tapping away from the search closes its results.
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".search")) closeResults();
  });
}

async function boot() {
  initTheme();
  hydrateIcons();
  updateThemeButtonIcon();
  buildThemeModal();
  wireModals();
  initUpdateBar();

  loadHiddenLines();
  buildLineToggles();
  wireSearch();
  wireMapControls();

  try {
    const data = await loadData();
    stations = data.stations;
    createMap({
      container: "map",
      stations,
      lines: data.lines,
      onSelect: (station, opts) => showDetail(station, opts),
      onClear: hideDetail,
    });
    applyLineVisibility();
    document.getElementById("searchInput").disabled = false;
  } catch (cause) {
    console.error("could not load the network:", cause);
    const msg = document.getElementById("mapError");
    msg.classList.remove("hidden");
  }
}

boot();
