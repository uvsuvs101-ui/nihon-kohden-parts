let devicesData = {};
let consumablesData = {};

const deviceListEl = document.getElementById("deviceList");
const consumablesListEl = document.getElementById("consumablesList");
const mainContent = document.getElementById("mainContent");
const toggleBtn = document.getElementById("devicesToggle");
const consumablesToggleBtn = document.getElementById("consumablesToggle");

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

/* ---------- LOAD DATA ---------- */

fetch("data/devices.json")
  .then(res => res.json())
  .then(data => {
    devicesData = data;
    renderDeviceList();
  });

fetch("data/consumables.json")
  .then(res => res.ok ? res.json() : { categories: {} })
  .then(data => {
    consumablesData = data && data.categories ? data : { categories: {} };
    renderConsumablesList();
  })
  .catch(() => {
    consumablesData = { categories: {} };
    renderConsumablesList();
  });

/* ---------- SIDEBAR TOGGLES ---------- */

toggleBtn.addEventListener("click", () => {
  deviceListEl.classList.toggle("hidden");
  toggleBtn.textContent = deviceListEl.classList.contains("hidden")
    ? "▸ Devices"
    : "▾ Devices";
});

consumablesToggleBtn.addEventListener("click", () => {
  consumablesListEl.classList.toggle("hidden");
  consumablesToggleBtn.textContent = consumablesListEl.classList.contains("hidden")
    ? "▸ Consumables"
    : "▾ Consumables";
});

/* ---------- IMAGE ENLARGE (BULLETPROOF) ---------- */

function enableZoom(img) {
  img.style.cursor = "zoom-in";
  img.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(img.src, "_blank"); // ✅ ALWAYS WORKS
  });
}

/* ---------- SHARED: RENDER ONE CATEGORY ---------- */

function buildCategory(categoryName, parts) {
  const catDiv = document.createElement("div");
  catDiv.className = "category";
  const accent = CATEGORY_COLORS[categoryName] || "#475569";
  catDiv.style.setProperty("--cat-color", accent);

  const h3 = document.createElement("h3");
  h3.textContent = categoryName;
  catDiv.appendChild(h3);

  let lastSub = null;

  parts.forEach(part => {
    // Subcategory sub-header (consumables only)
    if (part.subcategory && part.subcategory !== lastSub) {
      const h4 = document.createElement("h4");
      h4.className = "subcategory";
      h4.textContent = part.subcategory;
      catDiv.appendChild(h4);
      lastSub = part.subcategory;
    }

    const partDiv = document.createElement("div");
    partDiv.className = "part";

    if (part.image) {
      const img = document.createElement("img");
      img.src = part.image;
      img.onerror = () => { img.style.display = "none"; };
      enableZoom(img);
      partDiv.appendChild(img);
    }

    const text = document.createElement("div");

    const nameEl = document.createElement("strong");
    nameEl.textContent = part.name;
    text.appendChild(nameEl);

    if (part.description) {
      const desc = document.createElement("div");
      desc.className = "part-desc";
      desc.textContent = part.description;
      text.appendChild(desc);
    }

    // Part numbers as tagged badge rows (NK vs Lapidot stand out)
    const nums = document.createElement("div");
    nums.className = "pn-block";
    function pnRow(tagText, tagClass, value) {
      const row = document.createElement("div");
      row.className = "pn-row";
      const tag = document.createElement("span");
      tag.className = "pn-tag " + tagClass;
      tag.textContent = tagText;
      const val = document.createElement("span");
      val.className = "pn-val";
      val.textContent = value;
      row.appendChild(tag);
      row.appendChild(val);
      return row;
    }
    if (part.nk_part_number || part.lapidot_part_number !== undefined) {
      if (part.nk_part_number) nums.appendChild(pnRow("NK", "nk", part.nk_part_number));
      nums.appendChild(pnRow("LAP", "lap", part.lapidot_part_number ? part.lapidot_part_number : "—"));
    } else if (part.part_number) {
      nums.appendChild(pnRow("PART", "nk", part.part_number));
    }
    text.appendChild(nums);

    // Compatible devices (clickable when the device exists in the catalog)
    if (Array.isArray(part.compatible) && part.compatible.length) {
      const compDiv = document.createElement("div");
      compDiv.className = "compatible";

      const label = document.createElement("span");
      label.textContent = "Compatible with: ";
      compDiv.appendChild(label);

      part.compatible.forEach((devName, idx) => {
        const chip = document.createElement("span");
        chip.textContent = devName;
        if (devicesData[devName]) {
          chip.className = "compat-device";
          chip.addEventListener("click", () => renderDevice(devName));
        }
        compDiv.appendChild(chip);
        if (idx < part.compatible.length - 1) {
          compDiv.appendChild(document.createTextNode(", "));
        }
      });

      text.appendChild(compDiv);
    }

    partDiv.appendChild(text);
    catDiv.appendChild(partDiv);
  });

  return catDiv;
}

/* ---------- RENDER DEVICE LIST (SIDEBAR) ---------- */

function renderDeviceList() {
  deviceListEl.innerHTML = "";

  Object.entries(devicesData).forEach(([deviceName, device]) => {
    const li = document.createElement("li");

    if (device.image) {
      const img = document.createElement("img");
      img.src = device.image;
      enableZoom(img);
      li.appendChild(img);
    }

    const text = document.createElement("span");
    text.textContent = deviceName;
    li.appendChild(text);

    li.addEventListener("click", (e) => {
      if (e.target.tagName === "IMG") return;
      renderDevice(deviceName);
    });

    deviceListEl.appendChild(li);
  });
}

/* ---------- RENDER CONSUMABLES LIST (SIDEBAR) ---------- */

function renderConsumablesList() {
  consumablesListEl.innerHTML = "";
  const categories = consumablesData.categories || {};

  // "All Consumables" entry at the top
  const allLi = document.createElement("li");
  const allText = document.createElement("span");
  allText.textContent = "All Consumables";
  allLi.appendChild(allText);
  allLi.addEventListener("click", () => renderAllConsumables());
  consumablesListEl.appendChild(allLi);

  // One entry per consumable category
  Object.keys(categories).forEach(categoryName => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = categoryName;
    li.appendChild(text);
    li.addEventListener("click", () => renderConsumableCategory(categoryName));
    consumablesListEl.appendChild(li);
  });
}

/* ---------- RENDER MAIN CONTENT: DEVICE ---------- */

function renderDevice(deviceName) {
  const device = devicesData[deviceName];
  mainContent.innerHTML = "";

  const header = document.createElement("div");
  header.className = "device-header";

  const title = document.createElement("h2");
  title.textContent = deviceName;
  header.appendChild(title);

  if (device.image) {
    const img = document.createElement("img");
    img.src = device.image;
    enableZoom(img);
    header.appendChild(img);
  }

  mainContent.appendChild(header);

  Object.entries(device.categories).forEach(([categoryName, parts]) => {
    mainContent.appendChild(buildCategory(categoryName, parts));
  });
}

/* ---------- RENDER MAIN CONTENT: CONSUMABLES ---------- */

function renderAllConsumables() {
  const categories = consumablesData.categories || {};
  mainContent.innerHTML = "";

  const header = document.createElement("div");
  header.className = "device-header";
  const title = document.createElement("h2");
  title.textContent = "Consumables";
  header.appendChild(title);
  mainContent.appendChild(header);

  const keys = Object.keys(categories);
  if (keys.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No consumables added yet.";
    mainContent.appendChild(p);
    return;
  }

  keys.forEach(categoryName => {
    mainContent.appendChild(buildCategory(categoryName, categories[categoryName]));
  });
}

function renderConsumableCategory(categoryName) {
  const parts = (consumablesData.categories || {})[categoryName] || [];
  mainContent.innerHTML = "";

  const header = document.createElement("div");
  header.className = "device-header";
  const title = document.createElement("h2");
  title.textContent = "Consumables — " + categoryName;
  header.appendChild(title);
  mainContent.appendChild(header);

  mainContent.appendChild(buildCategory(categoryName, parts));
}
