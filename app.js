let devicesData = {};
let consumablesData = { categories: {} };
let dataReady = { devices: false, consumables: false };

/* currentView: {type:'home'} | {type:'group',name} | {type:'device',name}
   | {type:'category',name} | {type:'neuro'} */
let currentView = { type: "home" };

const sidebar = document.getElementById("sidebar");
const results = document.getElementById("results");
const searchInput = document.getElementById("searchInput");
document.getElementById("logoHome").addEventListener("click", () => goHome());

/* ---------- DEVICE GROUPING ----------
   Devices are sorted into clinical groups by name pattern, so new devices
   you add later fall into the right group automatically. Order shown below.
   Neurology / Hematology are listed but hidden until they contain a device. */
const DEVICE_GROUP_ORDER = ["Defibrillators", "Monitors", "ECG", "AED", "Neurology", "Hematology", "Other Devices"];
const DEVICE_GROUP_COLORS = {
  "Defibrillators": "#be123c",
  "Monitors": "#2563eb",
  "ECG": "#0d9488",
  "AED": "#ea580c",
  "Neurology": "#7c3aed",
  "Hematology": "#9d174d",
  "Other Devices": "#475569"
};
function classifyDevice(name) {
  const n = name.toLowerCase();
  if (n.includes("defib")) return "Defibrillators";
  if (n.includes("aed")) return "AED";
  if (n.startsWith("ecg-") || n.includes("electrocardio")) return "ECG";
  if (n.includes("monitor") || n.includes("life scope") || n.includes("bsm") || n.includes("csm")) return "Monitors";
  if (n.includes("eeg") || n.includes("emg") || n.includes("neuro") || n.includes("ncs") || n.includes("evoked")) return "Neurology";
  if (n.includes("hema") || n.includes("blood") || n.includes("cell counter") || n.includes("celltac")) return "Hematology";
  return "Other Devices";
}

/* ---------- CONSUMABLE GROUPING ---------- */
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
const NEURO_COLOR = "#7c3aed";
function isNeuroCat(cat) { return cat.indexOf("Neurology ") === 0; }
function neuroLabel(cat) { return cat.replace("Neurology ", ""); }

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
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done, fallback);
  else fallback();
  function fallback() {
    const t = document.createElement("textarea");
    t.value = value; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {}
    t.remove(); done();
  }
}
function devicePartCount(deviceName) {
  const d = devicesData[deviceName] || { categories: {} };
  return Object.values(d.categories || {}).reduce((a, p) => a + p.length, 0);
}
function deviceItems(deviceName) {
  const d = devicesData[deviceName] || { categories: {} };
  let items = [];
  Object.values(d.categories || {}).forEach(p => { items = items.concat(p); });
  return items;
}

/* Build ordered device groups that actually contain devices */
function deviceGroups() {
  const map = {};
  Object.keys(devicesData).forEach(name => {
    const g = classifyDevice(name);
    (map[g] = map[g] || []).push(name);
  });
  return DEVICE_GROUP_ORDER
    .filter(g => map[g] && map[g].length)
    .map(g => ({
      name: g,
      color: DEVICE_GROUP_COLORS[g] || "#475569",
      devices: map[g],
      partCount: map[g].reduce((a, d) => a + devicePartCount(d), 0)
    }));
}
function topConsumableCats() {
  return Object.keys(consumablesData.categories || {}).filter(c => !isNeuroCat(c));
}
function neuroCats() {
  return Object.keys(consumablesData.categories || {}).filter(isNeuroCat);
}
function allItems() {
  const out = [];
  Object.keys(devicesData).forEach(d => deviceItems(d).forEach(i => out.push(i)));
  Object.values(consumablesData.categories || {}).forEach(arr => arr.forEach(i => out.push(i)));
  return out;
}

/* ---------- SIDEBAR ---------- */
function navItem(label, opts) {
  opts = opts || {};
  const active = opts.active ? " active" : "";
  const dot = opts.color ? '<span class="ni-dot" style="background:' + opts.color + '"></span>' : "";
  const count = opts.count != null ? '<span class="ni-count">' + opts.count + "</span>" : "";
  const cls = opts.child ? "nav-item child" : "nav-item";
  const data = opts.data || "";
  return '<button class="' + cls + active + '" ' + data + ">" + dot + '<span class="ni-label">' + esc(label) + "</span>" + count + "</button>";
}

function buildSidebar() {
  const groups = deviceGroups();
  const activeGroup =
    currentView.type === "group" ? currentView.name :
    currentView.type === "device" ? classifyDevice(currentView.name) : null;
  const neuroOpen = currentView.type === "neuro" || (currentView.type === "category" && isNeuroCat(currentView.name));

  let h = "";
  h += '<button class="nav-home' + (currentView.type === "home" ? " active" : "") + '" data-home="1">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>Home</button>';

  /* DEVICES */
  h += '<div class="nav-section">Devices</div>';
  groups.forEach(g => {
    const open = activeGroup === g.name;
    h += '<button class="nav-group-head' + (currentView.type === "group" && currentView.name === g.name ? " active" : "") + '" data-group="' + esc(g.name) + '">' +
      '<span class="caret' + (open ? " open" : "") + '">▸</span>' +
      '<span class="ni-dot" style="background:' + g.color + '"></span>' +
      '<span class="ni-label">' + esc(g.name) + '</span>' +
      '<span class="ni-count">' + g.devices.length + '</span></button>';
    if (open) {
      h += '<div class="nav-children">';
      g.devices.forEach(dn => {
        h += navItem(dn, { child: true, active: currentView.type === "device" && currentView.name === dn, count: devicePartCount(dn), data: 'data-device="' + esc(dn) + '"' });
      });
      h += "</div>";
    }
  });

  /* CONSUMABLES */
  h += '<div class="nav-section">Consumables</div>';
  topConsumableCats().forEach(cat => {
    h += navItem(cat, {
      active: currentView.type === "category" && currentView.name === cat,
      color: CATEGORY_COLORS[cat] || "#64748b",
      count: (consumablesData.categories[cat] || []).length,
      data: 'data-category="' + esc(cat) + '"'
    });
  });
  const neuros = neuroCats();
  if (neuros.length) {
    h += '<button class="nav-group-head' + (currentView.type === "neuro" ? " active" : "") + '" data-neuro="1">' +
      '<span class="caret' + (neuroOpen ? " open" : "") + '">▸</span>' +
      '<span class="ni-dot" style="background:' + NEURO_COLOR + '"></span>' +
      '<span class="ni-label">Neurology</span>' +
      '<span class="ni-count">' + neuros.length + '</span></button>';
    if (neuroOpen) {
      h += '<div class="nav-children">';
      neuros.forEach(cat => {
        h += navItem(neuroLabel(cat), { child: true, active: currentView.type === "category" && currentView.name === cat, count: (consumablesData.categories[cat] || []).length, data: 'data-category="' + esc(cat) + '"' });
      });
      h += "</div>";
    }
  }

  sidebar.innerHTML = h;

  sidebar.querySelector("[data-home]").addEventListener("click", goHome);
  sidebar.querySelectorAll("[data-group]").forEach(b => b.addEventListener("click", () => { currentView = { type: "group", name: b.dataset.group }; afterNav(); }));
  sidebar.querySelectorAll("[data-device]").forEach(b => b.addEventListener("click", () => { currentView = { type: "device", name: b.dataset.device }; afterNav(); }));
  sidebar.querySelectorAll("[data-category]").forEach(b => b.addEventListener("click", () => { currentView = { type: "category", name: b.dataset.category }; afterNav(); }));
  const nb = sidebar.querySelector("[data-neuro]");
  if (nb) nb.addEventListener("click", () => { currentView = { type: "neuro" }; afterNav(); });
}

function goHome() { currentView = { type: "home" }; searchInput.value = ""; render(); results.scrollTop = 0; }
function afterNav() { searchInput.value = ""; render(); results.scrollTop = 0; }

/* ---------- ROWS ---------- */
function numCell(cls, tag, value) {
  const has = value && String(value).trim();
  const inner = has
    ? '<span class="v" data-copy="' + esc(value) + '">' + esc(value) + "</span>" + COPY_ICON
    : '<span class="v empty">not set</span>';
  return '<div class="numcell ' + cls + '"><span class="tag">' + tag + '</span><div class="num">' + inner + "</div></div>";
}
function rowHTML(it) {
  const nk = it.nk_part_number !== undefined ? it.nk_part_number : it.part_number;
  const nkCell = numCell("nk", "Nihon Kohden", nk);
  const lapCell = numCell("lap", "Lapidot", it.lapidot_part_number);
  let compat = "";
  if (Array.isArray(it.compatible) && it.compatible.length) {
    const parts = it.compatible.map(dev => devicesData[dev]
      ? '<span class="compat-device" data-dev="' + esc(dev) + '">' + esc(dev) + "</span>"
      : esc(dev));
    compat = '<div class="rcompat">Fits: ' + parts.join(", ") + "</div>";
  }
  const img = it.image ? '<img src="' + esc(it.image) + '" alt="" onerror="this.remove()" />' : "";
  return '<div class="row"><div class="rthumb">' + img + PLACEHOLDER + "</div>" +
    '<div><div class="rname">' + esc(it.name) + "</div>" +
    (it.description ? '<div class="rdesc">' + esc(it.description) + "</div>" : "") +
    compat + "</div>" + nkCell + lapCell + "</div>";
}
function itemsWithSubheads(items) {
  let html = "", lastSub = null;
  items.forEach(it => {
    if (it.subcategory && it.subcategory !== lastSub) { html += '<div class="subhead">' + esc(it.subcategory) + "</div>"; lastSub = it.subcategory; }
    html += rowHTML(it);
  });
  return html;
}
function sectionHTML(title, kind, color, items, opts) {
  opts = opts || {};
  const body = opts.subheads ? itemsWithSubheads(items) : items.map(rowHTML).join("");
  return '<div class="section-row"><span class="pip" style="background:' + (color || "#94a3b8") + '"></span>' +
    "<h2>" + esc(title) + '</h2><span class="count">' + kind + " · " + items.length + " item" + (items.length !== 1 ? "s" : "") + '</span><span class="rule"></span></div>' + body;
}
function pageTitle(text, sub) {
  return '<div class="page-title"><h1>' + esc(text) + "</h1>" + (sub ? '<span class="pt-sub">' + esc(sub) + "</span>" : "") + "</div>";
}

/* ---------- HOME (tiles) ---------- */
function tile(label, sub, color, data) {
  return '<button class="tile" ' + data + '><span class="tile-bar" style="background:' + color + '"></span>' +
    '<span class="tile-label">' + esc(label) + "</span>" +
    '<span class="tile-sub">' + esc(sub) + "</span></button>";
}
function renderHome() {
  const groups = deviceGroups();
  let h = pageTitle("Parts catalog", "Browse by device type or consumable category, or search at the top.");

  h += '<div class="tile-section">Devices</div><div class="tile-grid">';
  groups.forEach(g => {
    h += tile(g.name, g.devices.length + " device" + (g.devices.length !== 1 ? "s" : "") + " · " + g.partCount + " parts", g.color, 'data-tgroup="' + esc(g.name) + '"');
  });
  h += "</div>";

  h += '<div class="tile-section">Consumables</div><div class="tile-grid">';
  topConsumableCats().forEach(cat => {
    const n = (consumablesData.categories[cat] || []).length;
    h += tile(cat.replace(" Accessories", ""), n + " item" + (n !== 1 ? "s" : ""), CATEGORY_COLORS[cat] || "#64748b", 'data-tcat="' + esc(cat) + '"');
  });
  const neuros = neuroCats();
  if (neuros.length) {
    const total = neuros.reduce((a, c) => a + (consumablesData.categories[c] || []).length, 0);
    h += tile("Neurology", neuros.length + " categories · " + total + " items", NEURO_COLOR, 'data-tneuro="1"');
  }
  h += "</div>";

  results.innerHTML = h;
  results.querySelectorAll("[data-tgroup]").forEach(b => b.addEventListener("click", () => { currentView = { type: "group", name: b.dataset.tgroup }; afterNav(); }));
  results.querySelectorAll("[data-tcat]").forEach(b => b.addEventListener("click", () => { currentView = { type: "category", name: b.dataset.tcat }; afterNav(); }));
  const tn = results.querySelector("[data-tneuro]");
  if (tn) tn.addEventListener("click", () => { currentView = { type: "neuro" }; afterNav(); });
}

/* ---------- RENDER ---------- */
function render() {
  buildSidebar();
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

  if (currentView.type === "home") { renderHome(); return; }

  if (currentView.type === "group") {
    const g = deviceGroups().find(x => x.name === currentView.name);
    if (!g) { goHome(); return; }
    let h = pageTitle(g.name, "Device group");
    g.devices.forEach(dn => { h += sectionHTML(dn, "Device", g.color, deviceItems(dn)); });
    results.innerHTML = h; wire(); return;
  }

  if (currentView.type === "device") {
    const color = DEVICE_GROUP_COLORS[classifyDevice(currentView.name)] || "#475569";
    const d = devicesData[currentView.name];
    if (!d) { goHome(); return; }
    let h = pageTitle(currentView.name, "Device parts");
    Object.entries(d.categories || {}).forEach(([cat, parts]) => { h += sectionHTML(cat, "Parts", color, parts); });
    results.innerHTML = h; wire(); return;
  }

  if (currentView.type === "category") {
    const items = (consumablesData.categories || {})[currentView.name] || [];
    const color = CATEGORY_COLORS[currentView.name] || "#64748b";
    results.innerHTML = pageTitle(currentView.name, "Consumables") + sectionHTML(currentView.name, "Consumables", color, items, { subheads: true });
    wire(); return;
  }

  if (currentView.type === "neuro") {
    let h = pageTitle("Neurology", "Consumables");
    neuroCats().forEach(cat => { h += sectionHTML(neuroLabel(cat), "Consumables", CATEGORY_COLORS[cat] || NEURO_COLOR, consumablesData.categories[cat] || [], { subheads: true }); });
    results.innerHTML = h; wire(); return;
  }
}

function wire() {
  results.querySelectorAll(".rthumb img").forEach(enableZoom);
  results.querySelectorAll(".num .v[data-copy]").forEach(v =>
    v.addEventListener("click", () => copyValue(v.closest(".num"), v.dataset.copy)));
  results.querySelectorAll(".compat-device").forEach(chip =>
    chip.addEventListener("click", () => { currentView = { type: "device", name: chip.dataset.dev }; afterNav(); }));
}

/* ---------- SEARCH ---------- */
searchInput.addEventListener("input", () => { render(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.activeElement === searchInput) { searchInput.value = ""; render(); }
});
