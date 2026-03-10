let devicesData = {};
const deviceListEl = document.getElementById("deviceList");
const mainContent = document.getElementById("mainContent");
const toggleBtn = document.getElementById("devicesToggle");

/* ---------- LOAD DATA ---------- */

fetch("data/devices.json")
  .then(res => res.json())
  .then(data => {
    devicesData = data;
    renderDeviceList();
  });

/* ---------- SIDEBAR ---------- */

toggleBtn.addEventListener("click", () => {
  deviceListEl.classList.toggle("hidden");
  toggleBtn.textContent = deviceListEl.classList.contains("hidden")
    ? "▸ Devices"
    : "▾ Devices";
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

/* ---------- RENDER DEVICE LIST ---------- */

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

/* ---------- RENDER MAIN CONTENT ---------- */

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
    const catDiv = document.createElement("div");
    catDiv.className = "category";

    const h3 = document.createElement("h3");
    h3.textContent = categoryName;
    catDiv.appendChild(h3);

    parts.forEach(part => {
      const partDiv = document.createElement("div");
      partDiv.className = "part";

      if (part.image) {
        const img = document.createElement("img");
        img.src = part.image;
        enableZoom(img);
        partDiv.appendChild(img);
      }

      const text = document.createElement("div");
      text.innerHTML = `<strong>${part.name}</strong><br>Part #: ${part.part_number}`;
      partDiv.appendChild(text);

      catDiv.appendChild(partDiv);
    });

    mainContent.appendChild(catDiv);
  });
}
