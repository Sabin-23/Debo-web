// ===== Local "DB" helpers =====
const KEY = "local_products_v1";

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function saveAll(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
function addItem(item) {
  const items = loadAll();
  items.unshift(item);
  saveAll(items);
}
function deleteItem(id) {
  const items = loadAll().filter(x => x.id !== id);
  saveAll(items);
}
function clearAll() {
  localStorage.removeItem(KEY);
}

// ===== UI refs =====
const $ = (sel) => document.querySelector(sel);

const form = $("#form");
const fileInput = $("#file");
const nameInput = $("#name");
const priceInput = $("#price");
const preview = $("#preview");
const grid = $("#grid");
const empty = $("#empty");
const count = $("#count");
const status = $("#status");
const refreshBtn = $("#refresh");
const exportBtn = $("#export");
const importBtn = $("#import");
const clearBtn = $("#clear");

const fmt = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

// Live preview
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  preview.src = f ? URL.createObjectURL(f) : "";
});

function setStatus(msg) { status.textContent = msg; }
function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Read file as Data URL for storage
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Render grid
function render(items) {
  grid.innerHTML = "";
  count.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  empty.style.display = items.length ? "none" : "block";

  for (const it of items) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <img src="${it.image_data_url}" alt="${escapeHtml(it.name)}" />
      <div class="meta">
        <div>${escapeHtml(it.name)}</div>
        <div class="price">${fmt.format((it.price_cents || 0) / 100)}</div>
      </div>
      <div class="actions">
        <button class="danger" data-id="${it.id}">Delete</button>
      </div>
    `;
    grid.appendChild(el);
  }

  // Bind delete buttons
  grid.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      deleteItem(id);
      loadAndRender();
    });
  });
}

function loadAndRender() {
  setStatus("Loading...");
  const items = loadAll();
  render(items);
  setStatus("Loaded");
}

// Submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const file = fileInput.files?.[0];
    if (!file) throw new Error("Please choose an image");
    const name = nameInput.value.trim();
    if (!name) throw new Error("Name is required");
    const price = Number(priceInput.value);
    if (Number.isNaN(price) || price < 0) throw new Error("Price must be a non-negative number");
    const priceCents = Math.round(price * 100);

    setStatus("Converting image...");
    const dataUrl = await fileToDataURL(file);

    const item = {
      id: uid(),
      name,
      price_cents: priceCents,
      image_data_url: dataUrl,
      created_at: new Date().toISOString(),
    };

    addItem(item);
    form.reset();
    preview.src = "";
    setStatus("Added ✔");
    loadAndRender();
  } catch (err) {
    alert(err.message || String(err));
    setStatus("Error");
  }
});

// Other actions
refreshBtn.addEventListener("click", loadAndRender);
clearBtn.addEventListener("click", () => {
  if (confirm("Clear ALL items? This cannot be undone.")) {
    clearAll(); loadAndRender(); setStatus("Cleared");
  }
});
exportBtn.addEventListener("click", () => {
  const data = JSON.stringify(loadAll(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "products-export.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
importBtn.addEventListener("click", async () => {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json";
  inp.onchange = async () => {
    const f = inp.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("Invalid JSON format");
      saveAll(arr); loadAndRender(); setStatus("Imported ✔");
    } catch (e) { alert("Failed to import: " + (e.message || e)); }
  };
  inp.click();
});

// Initial load
loadAndRender();
