// ===== Local "DB" helpers =====
const KEY = "local_products_v1";
const CART_KEY = "local_cart_v1";

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
  // Also remove from cart if present
  const cart = loadCart();
  if (cart[id]) {
    delete cart[id];
    saveCart(cart);
  }
}
function clearAll() {
  localStorage.removeItem(KEY);
  // Optionally clear cart too if you want - keep cart separate
}

// ===== Cart helpers =====
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; }
  catch { return {}; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function addToCart(productId, qty=1) {
  const cart = loadCart();
  cart[productId] = (cart[productId] || 0) + qty;
  saveCart(cart);
}
function setCartQty(productId, qty) {
  const cart = loadCart();
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  saveCart(cart);
}
function clearCart() {
  localStorage.removeItem(CART_KEY);
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

const cartToggle = $("#cart-toggle");
const cartBadge = $("#cart-badge");
const cartPanel = $("#cart-panel");
const cartBackdrop = $("#cart-backdrop");
const cartClose = $("#cart-close");
const cartItemsNode = $("#cart-items");
const cartSubtotalNode = $("#cart-subtotal");
const checkoutBtn = $("#checkout");
const clearCartBtn = $("#clear-cart");

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

// Render grid (products)
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
        <div class="name">${escapeHtml(it.name)}</div>
        <div class="price">${fmt.format((it.price_cents || 0) / 100)}</div>
      </div>
      <div class="card-actions">
        <button class="danger" data-delete-id="${it.id}">Delete</button>
        <button class="secondary" data-add-id="${it.id}">Add to Cart</button>
      </div>
    `;
    grid.appendChild(el);
  }

  // Bind delete buttons
  grid.querySelectorAll("button[data-delete-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-id");
      if (confirm("Delete this product?")) {
        deleteItem(id);
        loadAndRender();
      }
    });
  });

  // Bind add-to-cart buttons
  grid.querySelectorAll("button[data-add-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add-id");
      addToCart(id, 1);
      updateCartBadge();
      openCart();
    });
  });
}

function loadAndRender() {
  setStatus("Loading...");
  const items = loadAll();
  render(items);
  setStatus("Loaded");
  updateCartBadge(); // ensure badge shows correct count after operations
}

// Cart rendering
function renderCart() {
  const cart = loadCart();
  const products = loadAll();
  cartItemsNode.innerHTML = "";

  const entries = Object.entries(cart);
  if (entries.length === 0) {
    cartItemsNode.innerHTML = `<div class="empty">Your cart is empty.</div>`;
    cartSubtotalNode.textContent = fmt.format(0);
    return;
  }

  let subtotalCents = 0;

  for (const [productId, qty] of entries) {
    const product = products.find(p => p.id === productId);
    if (!product) {
      // product removed, skip but also clean cart entry
      setCartQty(productId, 0);
      continue;
    }
    const itemTotal = (product.price_cents || 0) * qty;
    subtotalCents += itemTotal;

    const ci = document.createElement("div");
    ci.className = "cart-item";
    ci.innerHTML = `
      <img src="${product.image_data_url}" alt="${escapeHtml(product.name)}" />
      <div class="ci-meta">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>${escapeHtml(product.name)}</div>
          <div style="font-weight:700">${fmt.format(itemTotal/100)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="qty-controls">
            <button data-decrease="${productId}">−</button>
            <div style="min-width:28px; text-align:center;">${qty}</div>
            <button data-increase="${productId}">+</button>
          </div>
          <button data-remove="${productId}" class="danger" style="padding:6px 8px; border-radius:6px">Remove</button>
        </div>
      </div>
    `;
    cartItemsNode.appendChild(ci);
  }

  cartSubtotalNode.textContent = fmt.format(subtotalCents/100);

  // Bind qty buttons & remove
  cartItemsNode.querySelectorAll("button[data-increase]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-increase");
      addToCart(id, 1);
      renderCart();
      updateCartBadge();
    });
  });
  cartItemsNode.querySelectorAll("button[data-decrease]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-decrease");
      const cart = loadCart();
      const newQ = (cart[id] || 0) - 1;
      setCartQty(id, newQ);
      renderCart();
      updateCartBadge();
    });
  });
  cartItemsNode.querySelectorAll("button[data-remove]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-remove");
      setCartQty(id, 0);
      renderCart();
      updateCartBadge();
    });
  });
}

function computeCartCount() {
  const cart = loadCart();
  return Object.values(cart).reduce((s, q) => s + q, 0);
}
function updateCartBadge() {
  const count = computeCartCount();
  cartBadge.textContent = count;
  cartBadge.style.display = count ? "inline-block" : "none";
}

// Cart open/close
function openCart() {
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  cartBackdrop.hidden = false;
  renderCart();
}
function closeCart() {
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  cartBackdrop.hidden = true;
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
  if (confirm("Clear ALL products? This cannot be undone.")) {
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

// Cart button handlers
cartToggle.addEventListener("click", () => {
  if (cartPanel.classList.contains("open")) closeCart(); else openCart();
});
cartClose.addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);

checkoutBtn.addEventListener("click", () => {
  const subtotal = computeCartTotalCents();
  if (subtotal === 0) {
    alert("Cart is empty.");
    return;
  }
  // Simulate checkout
  if (confirm(`Checkout — total ${fmt.format(subtotal/100)}. Simulate payment?`)) {
    clearCart();
    renderCart();
    updateCartBadge();
    closeCart();
    alert("Thank you! (This was a simulated checkout.)");
  }
});
clearCartBtn.addEventListener("click", () => {
  if (confirm("Clear cart?")) {
    clearCart();
    renderCart();
    updateCartBadge();
  }
});

function computeCartTotalCents() {
  const cart = loadCart();
  const products = loadAll();
  let subtotal = 0;
  for (const [pid, qty] of Object.entries(cart)) {
    const p = products.find(x => x.id === pid);
    if (p) subtotal += (p.price_cents || 0) * qty;
  }
  return subtotal;
}

// Ensure cart badge shows on load
updateCartBadge();

// Initial load
loadAndRender();

