let devicesData = {};
let consumablesData = { categories: {} };
let dataReady = { devices: false, consumables: false };
let currentFilter = "all";

const filterbar = document.getElementById("filterbar");
const results = document.getElementById("results");
const searchInput = document.getElementById("searchInput");

/* Subtle accent color per category (helps the eye separate sections) */
const CATEGORY_COLORS = {
  "ECG Accessories": "#2563eb",
  "SpO2 Accessories": "#0891b2",
  "NIBP Accessories": "#7c3aed",
  "IBP Accessories": "#dc2626",
  "Temperature Measurement Accessories": "#ea580c",
  "CO2 Accessories": "#0d9488",
  "Resuscitation Accessories": "#be123c",
  "EEG Accessories": "#4f46e5",
  "Neurology EEG Accessories": "#059669",
  "Neurology EMG Accessories": "#16a34a",
  "Neurology NCS Accessories": "#65a30d",
  "Neurology EP Accessories": "#0284c7",
  "Neurology Ground Electrode Accessories": "#9333ea",
  "Neurology Skin Preparation Accessories": "#db2777"
};
const DEVICE_COLOR = "#475569";

const PLACEHOLDER =
  '<svg class="ph" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="9" cy="9" r="1.5"/></svg>';
const COPY_ICON =
  '<svg class="copyicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
  '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

/* ---------- LOAD DATA ---------- */
fetch("data/devices.json")
  .then(res => res.ok ? res.json() : {})
  .then(data => { devicesData = data || {}; dataReady.devices = true; init(); })
  .catch(() => { devicesData = {}; dataReady.devices = true; init(); });

fetch("data/consumables.json")
  .then(res => res.ok ? res.json() : { categories: {} })
  .then(data => { consumablesData = data && data.categories ? data : { categories: {} }; dataReady.consumables = true; init(); })
  .catch(() => { consumablesData = { categories: {} }; dataReady.consumables = true; init(); });

function init() {
  if (!dataReady.devices || !dataReady.consumables) return;
  buildFilters();
  render();
}

/* ---------- HELPERS ---------- */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function enableZoom(img) {
  img.style.cursor = "zoom-in";
  img.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); window.open(img.src, "_blank"); });
}

function copyValue(numEl, value) {
  const done = () => { numEl.classList.add("copied"); setTimeout(() => numEl.classList.remove("copied"), 950); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(done, fallback);
  } else { fallback(); }
  function fallback() {
    const t = document.createElement("textarea");
    t.value = value; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {}
    t.remove(); done();
  }
}

/* ---------- BUILD: ALL SECTIONS ---------- */
function getSections() {
  const sections = [];
  Object.entries(devicesData).forEach(([deviceName, device]) => {
    let items = [];
    Object.values(device.categories || {}).forEach(parts => { items = items.concat(parts); });
    sections.push({ key: "dev:" + deviceName, title: deviceName, kind: "Device", color: DEVICE_COLOR, type: "device", items });
  });
  Object.entries(consumablesData.categories || {}).forEach(([cat, items]) => {
    sections.push({ key: "con:" + cat, title: cat, kind: "Consumables", color: CATEGORY_COLORS[cat] || "#64748b", type: "consumable", items });
  });
  return sections;
}

function allItems() {
  const out = [];
  getSections().forEach(s => s.items.forEach(it => out.push(it)));
  return out;
}

/* ---------- FILTER CHIPS ---------- */
function buildFilters() {
  let html = '<span class="flabel">Jump to</span>';
  html += '<span class="chip ' + (currentFilter === "all" ? "active" : "") + '" data-f="all">All</span>';
  html += '<span class="fdiv"></span>';
  Object.keys(devicesData).forEach(name => {
    html += '<span class="chip" data-f="dev:' + esc(name) + '"><span class="cdot" style="background:' + DEVICE_COLOR + '"></span>' + esc(name) + '</span>';
  });
  if (Object.keys(consumablesData.categories || {}).length) html += '<span class="fdiv"></span>';
  Object.keys(consumablesData.categories || {}).forEach(cat => {
    const c = CATEGORY_COLORS[cat] || "#64748b";
    html += '<span class="chip" data-f="con:' + esc(cat) + '"><span class="cdot" style="background:' + c + '"></span>' + esc(cat) + '</span>';
  });
  filterbar.innerHTML = html;
  filterbar.querySelectorAll(".chip").forEach(ch => {
    ch.addEventListener("click", () => {
      currentFilter = ch.dataset.f;
      searchInput.value = "";
      render();
    });
  });
}

function setActiveChip() {
  filterbar.querySelectorAll(".chip").forEach(ch =>
    ch.classList.toggle("active", ch.dataset.f === currentFilter && !searchInput.value.trim())
  );
}

/* ---------- ROW ---------- */
function numCell(cls, tag, value) {
  const has = value && String(value).trim();
  const inner = has
    ? '<span class="v" data-copy="' + esc(value) + '">' + esc(value) + "</span>" + COPY_ICON
    : '<span class="v empty">not set</span>';
  return '<div class="numcell ' + cls + '"><span class="tag">' + tag + '</span><div class="num">' + inner + "</div></div>";
}

function rowHTML(it) {
  let nkCell, lapCell;
  if (it.nk_part_number !== undefined) {
    nkCell = numCell("nk", "Nihon Kohden", it.nk_part_number);
    lapCell = numCell("lap", "Lapidot", it.lapidot_part_number);
  } else {
    nkCell = numCell("nk", "Nihon Kohden", it.part_number);
    lapCell = numCell("lap", "Lapidot", it.lapidot_part_number);
  }

  let compat = "";
  if (Array.isArray(it.compatible) && it.compatible.length) {
    const parts = it.compatible.map(dev => {
      if (devicesData[dev]) return '<span class="compat-device" data-dev="' + esc(dev) + '">' + esc(dev) + "</span>";
      return esc(dev);
    });
    compat = '<div class="rcompat">Fits: ' + parts.join(", ") + "</div>";
  }

  const img = it.image
    ? '<img src="' + esc(it.image) + '" alt="" onerror="this.remove()" />'
    : "";

  return (
    '<div class="row">' +
    '<div class="rthumb">' + img + PLACEHOLDER + "</div>" +
    "<div><div class=\"rname\">" + esc(it.name) + "</div>" +
    (it.description ? '<div class="rdesc">' + esc(it.description) + "</div>" : "") +
    compat + "</div>" +
    nkCell + lapCell +
    "</div>"
  );
}

/* Render a list of items for a consumable section, grouping by subcategory */
function itemsWithSubheads(items) {
  let html = "";
  let lastSub = null;
  items.forEach(it => {
    if (it.subcategory && it.subcategory !== lastSub) {
      html += '<div class="subhead">' + esc(it.subcategory) + "</div>";
      lastSub = it.subcategory;
    }
    html += rowHTML(it);
  });
  return html;
}

function sectionHTML(s) {
  const body = s.type === "consumable" ? itemsWithSubheads(s.items) : s.items.map(rowHTML).join("");
  return (
    '<div class="section-row"><span class="pip" style="background:' + s.color + '"></span>' +
    "<h2>" + esc(s.title) + '</h2><span class="count">' + s.kind + " · " + s.items.length + ' item' + (s.items.length !== 1 ? "s" : "") + '</span><span class="rule"></span></div>' +
    body
  );
}

/* ---------- RENDER ---------- */
function render() {
  setActiveChip();
  const q = searchInput.value.trim().toLowerCase();

  if (q) {
    const hits = allItems().filter(it => JSON.stringify(it).toLowerCase().includes(q));
    results.innerHTML =
      '<div class="section-row"><h2>Search results</h2><span class="count">' +
      hits.length + " match" + (hits.length !== 1 ? "es" : "") + ' · "' + esc(q) + '"</span><span class="rule"></span></div>' +
      (hits.length ? hits.map(rowHTML).join("") : '<div class="empty-state">No parts match "' + esc(q) + '". Try an NK number, Lapidot number, or device name.</div>');
    wire();
    return;
  }

  let sections = getSections();
  if (currentFilter !== "all") sections = sections.filter(s => s.key === currentFilter);

  if (!sections.length) {
    results.innerHTML = '<div class="empty-state">Nothing to show yet.</div>';
    return;
  }
  results.innerHTML = sections.map(sectionHTML).join("");
  wire();
}

function wire() {
  results.querySelectorAll(".rthumb img").forEach(enableZoom);
  results.querySelectorAll(".num .v[data-copy]").forEach(v =>
    v.addEventListener("click", () => copyValue(v.closest(".num"), v.dataset.copy))
  );
  results.querySelectorAll(".compat-device").forEach(chip =>
    chip.addEventListener("click", () => {
      currentFilter = "dev:" + chip.dataset.dev;
      searchInput.value = "";
      render();
      results.scrollTop = 0;
    })
  );
}

/* ---------- SEARCH EVENTS ---------- */
searchInput.addEventListener("input", render);
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.activeElement === searchInput) { searchInput.value = ""; render(); }
});
