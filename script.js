const bar = document.getElementById('bar');
const close = document.getElementById('close');
const nav = document.getElementById('navbar');

if (bar){
    bar.addEventListener('click', ()=>{
        nav.classList.add('active');
    })
}

if (close){
    close.addEventListener('click', ()=>{
        nav.classList.remove('active');
    })
}



/*Signin Form*/

const signinForm = document.getElementById("signin-form");
const registerForm = document.getElementById("register-form");
const formTitle = document.getElementById("form-title");
const toggleText = document.querySelector(".toggle-text");

function switchForms() {
  if (signinForm.classList.contains("active")) {
    signinForm.classList.remove("active");
    registerForm.classList.add("active");
    formTitle.textContent = "Register";
    toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
  } else {
    registerForm.classList.remove("active");
    signinForm.classList.add("active");
    formTitle.textContent = "Sign In";
    toggleText.innerHTML = 'Don’t have an account? <span id="toggle">Register</span>';
  }
  // re-bind toggle span since innerHTML is replaced
  document.getElementById("toggle").addEventListener("click", switchForms);
}

document.getElementById("toggle").addEventListener("click", switchForms);


/* script.js -- single file for product rendering, cart state, auth, and cart page
   Replace SUPABASE_URL and SUPABASE_ANON_KEY below with your Supabase project credentials.
   Works with your existing HTML/CSS (no class/id renames).
*/

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'; // <- change
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY'; // <- change

// initialize supabase client
const supabase = supabaseJs.createClient
  ? supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) // older dist builds may expose supabaseJs
  : supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // common case

// --- Utility functions ---
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function formatPrice(n) { return `$${(Number(n) || 0).toFixed(2)}`; }

// Cart state structure
// cart = { items: [ { product_id, title, price, image, qty, variant (size/color), metadata } ] }
// store locally under key
const LOCAL_CART_KEY = 'gods_only_cart_v1';

// returns Promise<{ user: {...} | null, session: {...} | null }>
async function getAuth() {
  // new supabase SDK returns object from getSession
  try {
    const { data } = await supabase.auth.getSession();
    return { session: data.session ?? null, user: data.session?.user ?? null };
  } catch (e) {
    console.error('getAuth error', e);
    return { session: null, user: null };
  }
}

// --- Cart persistence logic ---
// If logged in => save/load from Supabase `carts` table keyed by user_id
// Otherwise => localStorage

async function loadCart() {
  const { user } = await getAuth();
  if (user) {
    // load from Supabase
    const { data, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', user.id)
      .single();
    if (error && error.code !== 'PGRST116') { console.warn('loadCart supabase error', error); }
    if (data && data.items) return data.items;
    return { items: [] };
  } else {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) return { items: [] };
    try {
      return JSON.parse(raw);
    } catch (e) {
      localStorage.removeItem(LOCAL_CART_KEY);
      return { items: [] };
    }
  }
}

async function saveCart(cart) {
  const { user } = await getAuth();
  if (user) {
    // upsert into carts (user_id primary key)
    const { error } = await supabase
      .from('carts')
      .upsert({ user_id: user.id, items: cart })
      .select();
    if (error) console.warn('saveCart supabase error', error);
  } else {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  }
}

// helper: sums total items
function cartCount(cart) {
  return cart.items.reduce((s, it) => s + Number(it.qty || 0), 0);
}

// update cart icon count in navbar (assumes the bag icon anchor exists)
async function updateCartCountUI() {
  const cart = await loadCart();
  let badge = document.getElementById('cart-count-badge');
  if (!badge) {
    // create small badge near the shopping bag link if not present
    const bagLink = document.querySelector('#navbar a[href="cart.html"], #mobile a[href="cart.html"]');
    if (bagLink) {
      badge = document.createElement('span');
      badge.id = 'cart-count-badge';
      badge.style.fontSize = '12px';
      badge.style.marginLeft = '6px';
      badge.style.background = '#fdadcf';
      badge.style.color = '#fff';
      badge.style.padding = '2px 6px';
      badge.style.borderRadius = '12px';
      badge.style.verticalAlign = 'middle';
      bagLink.appendChild(badge);
    }
  }
  if (badge) {
    const count = cartCount(cart);
    badge.textContent = count > 0 ? count : '';
  }
}

// add item to cart
async function addToCart({ product_id, title, price, image, qty = 1, variant = null, metadata = {} }) {
  const cart = await loadCart();
  // check same product+variant exists
  const sameIndex = cart.items.findIndex(i =>
    i.product_id === product_id && (i.variant || '') === (variant || '')
  );
  if (sameIndex >= 0) {
    cart.items[sameIndex].qty = Number(cart.items[sameIndex].qty) + Number(qty);
  } else {
    cart.items.push({ product_id, title, price, image, qty: Number(qty), variant, metadata });
  }
  await saveCart(cart);
  await updateCartCountUI();
  showToast(`${title} added to cart (${qty})`);
}

// remove item by index
async function removeCartItem(index) {
  const cart = await loadCart();
  cart.items.splice(index, 1);
  await saveCart(cart);
  await updateCartCountUI();
}

// clear cart
async function clearCart() {
  await saveCart({ items: [] });
  await updateCartCountUI();
}

// small toast feedback
function showToast(msg, ms = 1800) {
  let t = document.getElementById('gos-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'gos-toast';
    t.style.position = 'fixed';
    t.style.right = '20px';
    t.style.bottom = '20px';
    t.style.background = '#111';
    t.style.color = '#fff';
    t.style.padding = '10px 16px';
    t.style.borderRadius = '8px';
    t.style.zIndex = 9999;
    t.style.opacity = '0';
    t.style.transition = 'opacity .2s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, ms);
}

// --- Product rendering on shop.html ---
// Expects container with class .pro-container
async function fetchProducts() {
  // columns: id, title, price, images (array), description, variants (json: colors/sizes)
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('fetchProducts error', error);
    return [];
  }
  return data || [];
}

function createProductCard(product) {
  // produce DOM element that mirrors your .pro structure
  const wrap = document.createElement('div');
  wrap.className = 'pro';
  // main image
  const img = document.createElement('img');
  img.src = (product.images && product.images[0]) || 'Products/f1.jpg';
  img.alt = product.title || 'product';
  wrap.appendChild(img);

  const des = document.createElement('div');
  des.className = 'des';
  const span = document.createElement('span');
  span.textContent = product.brand || '';
  const h5 = document.createElement('h5');
  h5.textContent = product.title || '';
  const star = document.createElement('div');
  star.className = 'star';
  // keep existing star icons aesthetic
  for (let i = 0; i < 5; i++) {
    const iel = document.createElement('i');
    iel.className = 'fas fa-star';
    star.appendChild(iel);
  }
  const h4 = document.createElement('h4');
  h4.textContent = formatPrice(product.price);

  des.appendChild(span);
  des.appendChild(h5);
  des.appendChild(star);
  des.appendChild(h4);
  wrap.appendChild(des);

  // cart icon anchor (we handle click)
  const a = document.createElement('a');
  a.href = '#';
  a.setAttribute('data-product-id', product.id);
  const cartI = document.createElement('i');
  cartI.className = 'fa-solid fa-cart-shopping cart cart';
  cartI.style.color = '#fdadcf';
  a.appendChild(cartI);
  wrap.appendChild(a);

  // click handlers:
  // clicking the icon triggers addToCart, clicking elsewhere goes to product page
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart({
      product_id: product.id,
      title: product.title,
      price: product.price,
      image: img.src,
      qty: 1,
      variant: null
    });
  });

  wrap.addEventListener('click', (e) => {
    // clicking anywhere on the product card (except icon) goes to details page
    const isIcon = e.target.closest('a') && e.target.closest('a').contains(e.target);
    if (!isIcon) {
      window.location.href = `product.html?id=${product.id}`;
    }
  });

  return wrap;
}

async function renderShopProducts() {
  const container = document.querySelector('.pro-container');
  if (!container) return;
  container.innerHTML = ''; // clear existing
  const products = await fetchProducts();
  if (!products.length) {
    container.textContent = 'No products found.';
    return;
  }
  products.forEach(p => {
    container.appendChild(createProductCard(p));
  });
}

// --- Product details page behavior (product.html) ---
async function renderProductDetails() {
  const el = document.getElementById('prodetails');
  if (!el) return; // not on product page
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  // get product from supabase
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.warn('product fetch error', error);
    el.querySelector('.single-pro-details h4').textContent = 'Product not found';
    return;
  }
  const product = data;
  // populate images
  const mainImg = document.getElementById('MainImage');
  if (mainImg) mainImg.src = (product.images && product.images[0]) || mainImg.src;

  const smallImgs = qsa('.small-img');
  if (product.images && product.images.length) {
    smallImgs.forEach((sm, idx) => {
      sm.src = product.images[idx % product.images.length];
    });
  }

  // set title, breadcrumb, price, description
  // breadcrumb: .single-pro-details h6
  const breadcrumb = el.querySelector('.single-pro-details h6');
  if (breadcrumb) breadcrumb.textContent = (product.category ? `${product.category}` : 'Home') + ` / ${product.subcategory || ''}`;

  const titleEl = el.querySelector('.single-pro-details h4'); // currently H4
  if (titleEl) titleEl.textContent = product.title;

  const priceEl = el.querySelector('.single-pro-details h2');
  if (priceEl) priceEl.textContent = formatPrice(product.price);

  // sizes dropdown: first select inside .single-pro-details
  const sizeSelect = el.querySelector('.single-pro-details select');
  if (sizeSelect) {
    sizeSelect.innerHTML = '';
    const sizes = (product.sizes && product.sizes.length) ? product.sizes : ['One Size'];
    const placeholder = document.createElement('option');
    placeholder.textContent = 'Select Size';
    placeholder.value = '';
    sizeSelect.appendChild(placeholder);
    sizes.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sizeSelect.appendChild(opt);
    });
  }

  // quantity input and add button
  const qtyInput = el.querySelector('.single-pro-details input[type="number"]');
  if (qtyInput) qtyInput.value = 1;
  const addBtn = el.querySelector('.single-pro-details button.normal');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const selectedSize = sizeSelect ? sizeSelect.value : null;
      const qty = qtyInput ? Number(qtyInput.value || 1) : 1;
      if (sizeSelect && !sizeSelect.value) {
        showToast('Please choose a size.');
        return;
      }
      await addToCart({
        product_id: product.id,
        title: product.title,
        price: product.price,
        image: (product.images && product.images[0]) || '',
        qty,
        variant: selectedSize
      });
    });
  }

  // description text (span)
  const descSpan = el.querySelector('.single-pro-details span');
  if (descSpan) descSpan.textContent = product.description || '';

  // featured products: we will leave the featured HTML as-is but you might want to filter real featured
}

// --- Cart page rendering (cart.html) ---
async function renderCartPage() {
  const cartTableBody = document.querySelector('#cart tbody');
  if (!cartTableBody) return; // not on cart page
  const cart = await loadCart();
  cartTableBody.innerHTML = ''; // clear
  if (!cart.items.length) {
    cartTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center">Your cart is empty</td></tr>`;
    renderCartTotals(cart);
    return;
  }

  // create rows
  cart.items.forEach((item, index) => {
    const tr = document.createElement('tr');

    // remove
    const tdRemove = document.createElement('td');
    const removeA = document.createElement('a');
    removeA.href = '#';
    removeA.innerHTML = '<i class="far fa-times-circle"></i>';
    removeA.addEventListener('click', async (e) => {
      e.preventDefault();
      await removeCartItem(index);
      await renderCartPage();
    });
    tdRemove.appendChild(removeA);
    tr.appendChild(tdRemove);

    // image
    const tdImg = document.createElement('td');
    const imgel = document.createElement('img');
    imgel.src = item.image || 'Products/f1.jpg';
    imgel.style.width = '80px';
    tdImg.appendChild(imgel);
    tr.appendChild(tdImg);

    // product title
    const tdTitle = document.createElement('td');
    tdTitle.textContent = item.title + (item.variant ? ` (${item.variant})` : '');
    tr.appendChild(tdTitle);

    // price
    const tdPrice = document.createElement('td');
    tdPrice.textContent = formatPrice(item.price);
    tr.appendChild(tdPrice);

    // quantity input
    const tdQty = document.createElement('td');
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.value = item.qty;
    qtyInput.min = 1;
    qtyInput.addEventListener('change', async () => {
      const newQty = Number(qtyInput.value || 1);
      const c = await loadCart();
      // find the correct item by product_id & variant
      const foundIndex = c.items.findIndex(i => i.product_id === item.product_id && (i.variant || '') === (item.variant || ''));
      if (foundIndex >= 0) {
        c.items[foundIndex].qty = newQty;
        await saveCart(c);
        renderCartPage(); // rerender totals
      }
    });
    tdQty.appendChild(qtyInput);
    tr.appendChild(tdQty);

    // subtotal
    const tdSub = document.createElement('td');
    tdSub.textContent = formatPrice(Number(item.price) * Number(item.qty));
    tr.appendChild(tdSub);

    cartTableBody.appendChild(tr);
  });

  renderCartTotals(cart);

  // ensure there is a Clear Cart button and wire it
  const subtotalBlock = document.getElementById('subtotal');
  if (subtotalBlock && !document.getElementById('clear-cart-btn')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-cart-btn';
    clearBtn.className = 'normal';
    clearBtn.style.marginTop = '10px';
    clearBtn.textContent = 'Clear Cart';
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Clear entire cart?')) return;
      await clearCart();
      await renderCartPage();
    });
    subtotalBlock.appendChild(clearBtn);
  }
}

async function renderCartTotals(cart) {
  const subtotalEl = document.querySelector('#subtotal table');
  if (!subtotalEl) return;
  // compute totals
  const subtotal = cart.items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);
  // replace cells safely
  // first row cell (Cart Subtotal)
  const rows = subtotalEl.querySelectorAll('tr');
  if (rows.length >= 3) {
    rows[0].children[1].textContent = formatPrice(subtotal);
    rows[2].children[1].textContent = formatPrice(subtotal); // assuming free shipping
  }
}

// --- Auth UI handling (signin/register link display) ---
async function updateAuthUI() {
  const { session, user } = await getAuth();
  const signinLink = document.querySelector('#navbar a[href="signin.html"]');
  if (signinLink) {
    if (user) {
      signinLink.innerHTML = `Hi ${user.email.split('@')[0]} <a id="logout-link" href="#">(Log out)</a>`;
      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
          e.preventDefault();
          await supabase.auth.signOut();
          await updateAuthUI();
          await updateCartCountUI();
        });
      }
    } else {
      signinLink.textContent = 'Sign-in/Register';
    }
  }
}

// watch auth state changes to update UI and sync cart from local->remote if needed
supabase.auth.onAuthStateChange(async (event, session) => {
  // when user signs in, merge localStorage cart into remote cart
  if (event === 'SIGNED_IN') {
    // merge
    const localRaw = localStorage.getItem(LOCAL_CART_KEY);
    if (localRaw) {
      try {
        const local = JSON.parse(localRaw);
        if (local && local.items && local.items.length) {
          // load remote cart, combine items (summing quantities for same product+variant)
          const { user } = await getAuth();
          if (user) {
            const { data } = await supabase.from('carts').select('items').eq('user_id', user.id).single();
            const remote = (data && data.items) ? data.items : { items: [] };
            // merge arrays
            const merged = { items: [...remote.items] };
            local.items.forEach(li => {
              const idx = merged.items.findIndex(i => i.product_id === li.product_id && (i.variant||'') === (li.variant||''));
              if (idx >= 0) merged.items[idx].qty = Number(merged.items[idx].qty) + Number(li.qty);
              else merged.items.push(li);
            });
            // upsert
            await supabase.from('carts').upsert({ user_id: user.id, items: merged }).select();
            // clear local
            localStorage.removeItem(LOCAL_CART_KEY);
          }
        }
      } catch (e) {
        console.warn('merge cart error', e);
      }
    }
  }
  await updateAuthUI();
  await updateCartCountUI();
});

// --- Small initialization per page ---
document.addEventListener('DOMContentLoaded', async () => {
  // update auth and cart count first
  await updateAuthUI();
  await updateCartCountUI();

  // run page-specific renderers
  await renderShopProducts();
  await renderProductDetails();
  await renderCartPage();

  // small image click swap logic (keeps your existing code behavior)
  const mainImage = document.getElementById('MainImage');
  if (mainImage) {
    const smallimg = document.getElementsByClassName('small-img');
    for (let i = 0; i < smallimg.length; i++) {
      smallimg[i].onclick = function () {
        mainImage.src = smallimg[i].src;
      };
    }
  }

});


