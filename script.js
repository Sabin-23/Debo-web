//Josue don't do those redundancy bullsh*t on this please 
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
// ==========================================
// 14. CART FUNCTIONALITY
// ==========================================

// Cart storage keys for localStorage
const CART_KEY = "local_cart_v1";
const PRODUCTS_KEY = "local_products_v1";

// Cart UI element references
let cartToggleMobile, cartToggleDesktop, cartBadge, cartPanel, cartBackdrop, cartClose, cartItemsNode, cartSubtotalNode, checkoutBtn, clearCartBtn;

// Currency formatter for price display
const fmt = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
});

/**
 * Initializes cart functionality and event listeners
 */
function initializeCart() {
  cartToggleMobile = document.getElementById("cart-toggle-mobile");
  cartToggleDesktop = document.getElementById("cart-toggle-desktop");
  cartBadge = document.getElementById("cart-badge");
  cartPanel = document.getElementById("cart-panel");
  cartBackdrop = document.getElementById("cart-backdrop");
  cartClose = document.getElementById("cart-close");
  cartItemsNode = document.getElementById("cart-items");
  cartSubtotalNode = document.getElementById("cart-subtotal");
  checkoutBtn = document.getElementById("checkout");
  clearCartBtn = document.getElementById("clear-cart");

  if (!cartToggleMobile) return;
  if (!cartToggleDesktop) return;

  // Cart toggle event
  cartToggleMobile.addEventListener("click", () => {
    if (cartPanel.classList.contains("open")) {
      closeCart();
    } else {
      openCart();
    }
  });

  cartToggleDesktop.addEventListener("click", () => {
    if (cartPanel.classList.contains("open")) {
      closeCart();
    } else {
      openCart();
    }
  });

  // Close cart events
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

  // Checkout button event
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      const cart = loadCart();
      const entries = Object.entries(cart);
      
      if (entries.length === 0) {
        alert("Cart is empty.");
        return;
      }
      
      // Simulate checkout process
      if (confirm(`Checkout — total ${cartSubtotalNode.textContent}. Simulate payment?`)) {
        clearCart();
        renderCart();
        closeCart();
        alert("Thank you! (This was a simulated checkout.)");
      }
    });
  }

  // Clear cart button event
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      if (confirm("Clear cart?")) {
        clearCart();
        renderCart();
      }
    });
  }

  // Initialize cart badge count
  updateCartBadge();

  // Add to cart functionality for product buttons
  document.addEventListener("click", function(e) {
    if (e.target.closest(".fa-cart-shopping")) {
      e.preventDefault();
      const productElement = e.target.closest(".pro");
      const productId = productElement?.getAttribute("data-product-id") || "demo-1";
      addToCart(productId, 1);
      openCart();
    }
  });
}

/**
 * Loads cart data from localStorage
 * @returns {Object} Cart object with product IDs as keys and quantities as values
 */
function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch {
        return {};
    }
}

/**
 * Saves cart data to localStorage
 * @param {Object} cart - Cart object to save
 */
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/**
 * Adds product to cart or increments quantity
 * @param {string} productId - ID of product to add
 * @param {number} qty - Quantity to add (default: 1)
 */
function addToCart(productId, qty = 1) {
    const cart = loadCart();
    cart[productId] = (cart[productId] || 0) + qty;
    saveCart(cart);
    updateCartBadge();
}

/**
 * Sets specific quantity for a product in cart
 * @param {string} productId - ID of product to update
 * @param {number} qty - New quantity (0 removes item)
 */
function setCartQty(productId, qty) {
    const cart = loadCart();
    if (qty <= 0) {
        delete cart[productId];
    } else {
        cart[productId] = qty;
    }
    saveCart(cart);
    updateCartBadge();
}

/**
 * Clears all items from cart
 */
function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
}

/**
 * Loads product data from localStorage
 * @returns {Array} Array of product objects
 */
function loadProducts() {
  try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || []; }
  catch { return []; }
}

/**
 * Renders cart contents in the cart panel
 */
function renderCart() {
    if (!cartItemsNode) return;
    
    const cart = loadCart();
    const products = loadProducts();
    cartItemsNode.innerHTML = "";

    const entries = Object.entries(cart);
    if (entries.length === 0) {
        cartItemsNode.innerHTML = `<div class="empty">Your cart is empty.</div>`;
        if (cartSubtotalNode) cartSubtotalNode.textContent = fmt.format(0);
        return;
    }

    let subtotalCents = 0;

    // Render each cart item
    for (const [productId, qty] of entries) {
        const product = products.find(p => p.id === productId);
        if (!product) {
            // Product not found, clean up cart entry
            setCartQty(productId, 0);
            continue;
        }
        
        const itemTotal = (product.price_cents || 0) * qty;
        subtotalCents += itemTotal;

        const ci = document.createElement("div");
        ci.className = "cart-item";
        ci.innerHTML = `
            <img src="${product.image_data_url}" alt="${product.name}" />
            <div class="ci-meta">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>${product.name}</div>
                    <div style="font-weight:700">${fmt.format(itemTotal / 100)}</div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div class="qty-controls">
                        <button data-decrease="${productId}">−</button>
                        <div style="min-width:28px; text-align:center;">${qty}</div>
                        <button data-increase="${productId}">+</button>
                    </div>
                    <button data-remove="${productId}" class="danger" style="padding:6px 8px; border-radius:6px; background:#ef4444; color:#0b0c10; border:none; cursor:pointer">Remove</button>
                </div>
            </div>
        `;
        cartItemsNode.appendChild(ci);
    }

    // Update subtotal display
    if (cartSubtotalNode) cartSubtotalNode.textContent = fmt.format(subtotalCents / 100);

    // Bind quantity control event listeners
    bindCartEventListeners();
}

/**
 * Binds event listeners to cart quantity controls
 */
function bindCartEventListeners() {
    // Increase quantity buttons
    cartItemsNode.querySelectorAll("button[data-increase]").forEach(b => {
        b.addEventListener("click", () => {
            const id = b.getAttribute("data-increase");
            addToCart(id, 1);
            renderCart();
        });
    });
    
    // Decrease quantity buttons
    cartItemsNode.querySelectorAll("button[data-decrease]").forEach(b => {
        b.addEventListener("click", () => {
            const id = b.getAttribute("data-decrease");
            const cart = loadCart();
            const newQ = (cart[id] || 0) - 1;
            setCartQty(id, newQ);
            renderCart();
        });
    });
    
    // Remove item buttons
    cartItemsNode.querySelectorAll("button[data-remove]").forEach(b => {
        b.addEventListener("click", () => {
            const id = b.getAttribute("data-remove");
            setCartQty(id, 0);
            renderCart();
        });
    });
}

/**
 * Calculates total number of items in cart
 * @returns {number} Total quantity of all items in cart
 */
function computeCartCount() {
    const cart = loadCart();
    return Object.values(cart).reduce((s, q) => s + q, 0);
}

/**
 * Updates cart badge with current item count
 */
function updateCartBadge() {
    if (!cartBadge) return;
    const count = computeCartCount();
    cartBadge.textContent = count;
    cartBadge.style.display = count ? "inline-block" : "none";
}

/**
 * Opens cart panel and renders contents
 */
function openCart() {
    if (!cartPanel || !cartBackdrop) return;
    cartPanel.classList.add("open");
    cartPanel.setAttribute("aria-hidden", "false");
    cartBackdrop.hidden = false;
    renderCart();
}

/**
 * Closes cart panel
 */
function closeCart() {
    if (!cartPanel || !cartBackdrop) return;
    cartPanel.classList.remove("open");
    cartPanel.setAttribute("aria-hidden", "true");
    cartBackdrop.hidden = true;
}

/**
 * Renders shop products in the product container
 */
function renderShopProducts() {
  const products = loadProducts();
  const container = document.querySelector(".pro-container");
  if (!container) return;
  
  container.innerHTML = "";

  // Generate HTML for each product
  products.forEach(p => {
    container.innerHTML += `
      <div class="pro" data-product-id="${p.id}">
        <img src="${p.image_data_url}" alt="${p.name}">
        <div class="des">
          <span>Custom</span>
          <h5>${p.name}</h5>
          <h4>$${(p.price_cents/100).toFixed(2)}</h4>
        </div>
        <a href="#"><i class="fa-solid fa-cart-shopping cart" style="color: #fdadcf;"></i></a>
      </div>
    `;
  });
}

// Initialize shop products when page loads
window.addEventListener('load', function() {
  renderShopProducts();
});


// ==========================================
// SUPABASE AUTHENTICATION SYSTEM (fixed profile link)
// Creates/finds profile using auth_id (preferred) with fallback to id
// ==========================================

// 1. CONFIGURATION
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;
let currentUserProfile = null;

// UI colors
const UI = {
  primaryPink: '#ff9db1',
  pinkSoft: '#fff0f3',
  avatarPink: '#ff7da7',
  dropdownBg: '#ffffff',
  subtleGray: '#f6f3f4',
  danger: '#c62828',
  success: '#2e7d32',
  warning: '#ff9800'
};

// COUNTRY LIST (keep yours expanded in production)
const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'US', code: '+1', label: 'United States' },
  { iso: 'GB', code: '+44', label: 'United Kingdom' },
  { iso: 'KE', code: '+254', label: 'Kenya' },
  { iso: 'ZW', code: '+263', label: 'Zimbabwe' }
];

// INIT
window.addEventListener('load', function() {
  initializeSupabaseAuth();
  setupFormToggle();
  setupModalHandlers();
  initializeCart && typeof initializeCart === 'function' && initializeCart();
});

function initializeSupabaseAuth() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded');
    showGlobalMessage('Authentication service not available. Please refresh the page.', 'error');
    return;
  }

  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized');
  setupAuthStateListener();
  setupAuthUI();
  createProfileModal();
  checkAuthStatus();
}

// ========== AUTH STATE LISTENER ==========
function setupAuthStateListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);
    try {
      if (event === 'SIGNED_IN') {
        currentUser = session.user;
        // get or create profile (robust)
        currentUserProfile = await getUserProfile(currentUser.id);
        if (!currentUserProfile) {
          currentUserProfile = await createUserProfile(currentUser);
        }
        updateUIForLoggedInUser(currentUser);
        showGlobalMessage('✅ Successfully signed in!', 'success');
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentUserProfile = null;
        updateUIForLoggedOutUser();
        showGlobalMessage('👋 Successfully signed out.', 'info');
      } else if (event === 'USER_UPDATED') {
        currentUser = session.user;
      }
    } catch (err) {
      console.error('Error during auth state handling:', err);
      showGlobalMessage('⚠️ Signed in but profile issues detected.', 'warning');
    }
  });
}

// ========== CHECK AUTH STATUS ON LOAD ==========
async function checkAuthStatus() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('getSession error:', error);
      return;
    }
    if (data?.session?.user) {
      currentUser = data.session.user;
      currentUserProfile = await getUserProfile(currentUser.id);
      // If profile missing, create it
      if (!currentUserProfile) {
        currentUserProfile = await createUserProfile(currentUser);
      }
      updateUIForLoggedInUser(currentUser);
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (err) {
    console.error('checkAuthStatus error:', err);
  }
}

// ========== PROFILE HELPERS (FIXED) ==========

/**
 * Try to fetch the profile. Prefer auth_id column, then fallback to id column.
 * Returns profile object or null if none found.
 */
async function getUserProfile(userId) {
  if (!supabase) throw new Error('Supabase not initialized');
  if (!userId) return null;

  // 1) Try by auth_id (preferred)
  try {
    const { data: byAuth, error: errAuth } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_id', userId)
      .limit(1);

    if (!errAuth && Array.isArray(byAuth) && byAuth.length > 0) {
      return byAuth[0];
    }
    // if errAuth exists and indicates column missing, we'll fallback below
    if (errAuth && !/column .*auth_id.* does not exist/i.test(errAuth.message || '')) {
      // some other error
      console.warn('profiles auth_id select error (non fatal):', errAuth);
    }
  } catch (err) {
    // ignore — we'll try fallback
    console.warn('getUserProfile auth_id query threw, will fallback:', err);
  }

  // 2) Fallback: try by id (some schemas use auth user id as profiles.id)
  try {
    const { data: byId, error: errId } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1);

    if (!errId && Array.isArray(byId) && byId.length > 0) {
      return byId[0];
    }
    if (errId) {
      console.warn('profiles id select error (non fatal):', errId);
    }
  } catch (err) {
    console.warn('getUserProfile id query threw:', err);
  }

  // Not found
  return null;
}

/**
 * Create a new profile for the given auth user.
 * Tries to insert with auth_id first. If table doesn't have auth_id, falls back to inserting id = user.id.
 * Returns the created profile object.
 */
async function createUserProfile(user) {
  if (!supabase) throw new Error('Supabase not initialized');
  if (!user) throw new Error('createUserProfile requires user');

  // Prepare insert payload
  const payload = {
    auth_id: user.id,
    email: user.email || null,
    full_name: user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : null),
    phone: user.user_metadata?.phone || null,
    is_admin: false
  };

  // Try insert using auth_id column
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([payload])
      .select()
      .limit(1);
    if (error) {
      // If auth_id column doesn't exist, the message typically mentions auth_id column
      if (/column .*auth_id.* does not exist/i.test(error.message || '')) {
        throw { code: 'NO_AUTH_ID_COLUMN', original: error };
      }
      throw error;
    }
    if (Array.isArray(data) && data.length > 0) {
      console.log('Profile created with auth_id:', data[0]);
      return data[0];
    }
  } catch (err) {
    // If the table does not have auth_id, try fallback to inserting id = user.id
    if (err && err.code === 'NO_AUTH_ID_COLUMN') {
      console.warn('profiles table has no auth_id column — falling back to insert by id');
      try {
        // Build fallback payload using id column
        const fallback = {
          id: user.id,
          email: user.email || null,
          full_name: user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : null),
          phone: user.user_metadata?.phone || null,
          is_admin: false
        };
        const { data: fdata, error: ferr } = await supabase.from('profiles').insert([fallback]).select().limit(1);
        if (ferr) throw ferr;
        if (Array.isArray(fdata) && fdata.length > 0) {
          console.log('Profile created with id fallback:', fdata[0]);
          return fdata[0];
        }
      } catch (fErr) {
        console.error('Fallback profile insert by id failed:', fErr);
        throw new Error('Failed to create profile (fallback). Check profiles table schema and permissions.');
      }
    } else {
      console.error('createUserProfile failed:', err);
      throw err;
    }
  }

  // If we got here nothing was created
  throw new Error('Failed to create profile — unknown reason.');
}

// ========== PROFILE UPDATE (phone) ==========
async function updateProfilePhoneByAuthOrId(userId, updates) {
  if (!supabase) throw new Error('Supabase not initialized');
  // Try update by auth_id
  try {
    const { error } = await supabase.from('profiles').update(updates).eq('auth_id', userId);
    if (!error) return true;
    // if column missing, continue to fallback
    if (!/column .*auth_id.* does not exist/i.test(error.message || '')) {
      console.warn('profiles update by auth_id returned error:', error);
      return false;
    }
  } catch (err) {
    console.warn('update by auth_id threw, will fallback:', err);
  }

  // Fallback update by id
  try {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) {
      console.warn('profiles update by id error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('update by id threw:', err);
    return false;
  }
}

// ========== AUTH UI SETUP ==========
function setupAuthUI() {
  const modal = document.getElementById('modal');
  const openModalBtn = document.getElementById('openModal');
  const closeModalBtn = document.getElementById('closeModal');
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');

  if (!modal || !openModalBtn) return;

  // open modal
  openModalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    modal.style.display = 'flex';
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'none';
      clearModalMessage();
    });
  }

  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = signinForm.querySelectorAll('input');
      const email = inputs[0].value.trim();
      const password = inputs[1].value;
      await handleSignIn(email, password);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = registerForm.querySelectorAll('input');
      const name = inputs[0].value.trim();
      const email = inputs[1].value.trim();
      const password = inputs[2].value;
      const confirm = inputs[3].value;
      await handleRegister(name, email, password, confirm);
    });
  }

  // auth change listener was already set in initialize
}

// ========== FORM TOGGLE / MODAL HELPERS ==========
function setupFormToggle() {
  const signinForm = document.getElementById("signin-form");
  const registerForm = document.getElementById("register-form");
  const formTitle = document.getElementById("form-title");
  const toggleText = document.querySelector(".toggle-text");
  if (!signinForm || !registerForm || !formTitle || !toggleText) return;
  function switchForms() {
    if (signinForm.classList.contains("active")) {
      signinForm.classList.remove("active");
      registerForm.classList.add("active");
      formTitle.textContent = "Create Account";
      toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
    } else {
      registerForm.classList.remove("active");
      signinForm.classList.add("active");
      formTitle.textContent = "Sign In";
      toggleText.innerHTML = 'Don\'t have an account? <span id="toggle">Register</span>';
    }
    const newToggle = document.getElementById("toggle");
    if (newToggle) newToggle.addEventListener("click", switchForms);
    clearModalMessage();
  }
  const toggle = document.getElementById("toggle");
  if (toggle) toggle.addEventListener("click", switchForms);
}

function setupModalHandlers() {
  const openBtn = document.getElementById("openModal");
  const closeBtn = document.getElementById("closeModal");
  const modal = document.getElementById("modal");
  if (openBtn && modal) {
    openBtn.addEventListener("click", () => { modal.style.display = 'flex'; clearModalMessage(); });
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => { modal.style.display = 'none'; clearModalMessage(); resetAuthForms(); });
  }
  if (modal) {
    modal.addEventListener("click", (e) => { if (e.target === modal) { modal.style.display = 'none'; clearModalMessage(); resetAuthForms(); }});
  }
}

function resetAuthForms() {
  const s = document.getElementById('signin-form');
  const r = document.getElementById('register-form');
  if (s) s.reset();
  if (r) r.reset();
}

// ========== AUTH HANDLERS ==========
async function handleSignIn(email, password) {
  if (!supabase) { showModalMessage('Auth unavailable', 'error'); return; }
  if (!email || !password) { showModalMessage('Please fill in all fields.', 'error'); return; }
  if (!isValidEmail(email)) { showModalMessage('Invalid email', 'error'); return; }

  try {
    showModalMessage('Signing in...', 'info');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will handle creating/loading profile and UI update
    showModalMessage('✅ Sign in successful!', 'success');
    setTimeout(() => { const modal = document.getElementById('modal'); if (modal) modal.style.display = 'none'; clearModalMessage(); resetAuthForms(); }, 900);
  } catch (err) {
    console.error('Sign in error:', err);
    showModalMessage(err.message || 'Sign in failed', 'error');
  }
}

async function handleRegister(name, email, password, confirmPassword) {
  if (!supabase) { showModalMessage('Auth unavailable', 'error'); return; }
  if (!name || !email || !password || !confirmPassword) { showModalMessage('Please fill all fields.', 'error'); return; }
  if (!isValidEmail(email)) { showModalMessage('Invalid email', 'error'); return; }
  if (password.length < 6) { showModalMessage('Password too short', 'error'); return; }
  if (password !== confirmPassword) { showModalMessage('Passwords do not match', 'error'); return; }

  try {
    showModalMessage('Creating account...', 'info');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) throw error;

    // If user is returned with active session, create profile now (onAuthStateChange will also run)
    if (data?.user) {
      try { await createUserProfile(data.user); } catch (e) { console.warn('create profile on signUp non-critical:', e); }
    }

    if (data.user && !data.session) {
      showModalMessage('✅ Check your email to confirm your account.', 'success');
    } else {
      showModalMessage('✅ Registration successful!', 'success');
      setTimeout(() => { const modal = document.getElementById('modal'); if (modal) modal.style.display = 'none'; clearModalMessage(); resetAuthForms(); }, 1200);
    }
  } catch (err) {
    console.error('Register error:', err);
    showModalMessage(err.message || 'Registration failed', 'error');
  }
}

async function handleLogout(e) {
  if (e) e.preventDefault();
  if (!supabase) return;
  if (!confirm('Are you sure you want to sign out?')) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    console.error('Logout error:', err);
    alert('Error signing out: ' + err.message);
  }
}

// ========== PROFILE MODAL UI ==========
function createProfileModal() {
  if (document.getElementById('userProfileModal')) return;

  const countryOptions = COUNTRY_LIST.map(c => `<option value="${c.code}">${c.label} ${c.code}</option>`).join('\n');

  const modalHTML = `
    <div id="userProfileModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:10000; justify-content:center; align-items:center;">
      <div style="background:#fff; border-radius:12px; width:90%; max-width:900px; max-height:90vh; overflow:auto; box-shadow:0 12px 40px rgba(0,0,0,0.25);">
        <div style="padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0; color:#222; font-size:20px;">Account Settings</h2>
            <button id="closeProfileModal" style="background:none; border:none; font-size:26px; cursor:pointer; color:#666;">&times;</button>
          </div>
          <div style="margin-bottom:18px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div id="userAvatar" style="width:64px; height:64px; border-radius:50%; background:${UI.avatarPink}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:26px; font-weight:700; box-shadow:0 6px 18px rgba(0,0,0,0.06); border:3px solid #fff;"></div>
              <div>
                <h3 id="userName" style="margin:0 0 4px 0; color:#222; font-size:16px; font-weight:700;">Loading...</h3>
                <p id="userEmail" style="margin:0; color:#666; font-size:13px;">Loading...</p>
              </div>
            </div>
          </div>

          <div style="margin-bottom:16px; padding:14px; background:${UI.pinkSoft}; border-radius:8px;">
            <h3 style="margin:0 0 10px 0; color:#222; font-size:15px;">Phone Number</h3>
            <div style="display:flex; gap:10px; align-items:center;">
              <select id="countryCodeSelect" style="padding:10px; border-radius:8px; border:1px solid #f4d7df; background:#fff; min-width:140px; font-size:13px;">
                ${countryOptions}
              </select>
              <input type="tel" id="phoneInput" placeholder="7XXXXXXXX" style="flex:1; padding:10px; border:1px solid #efe7ea; border-radius:8px; font-size:14px;">
              <button id="updatePhoneBtn" style="padding:10px 14px; background:${UI.primaryPink}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Save</button>
            </div>
            <p id="phoneMessage" style="margin:10px 0 0 0; font-size:13px;"></p>
          </div>

          <div style="margin-bottom:16px; padding:14px; background:#fff; border-radius:8px; border:1px solid #f2f2f2;">
            <h3 style="margin:0 0 10px 0; color:#222; font-size:15px;">Change Password</h3>
            <input type="password" id="currentPassword" placeholder="Current Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
            <input type="password" id="newPassword" placeholder="New Password (min 6 characters)" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
            <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:10px;">
            <button id="changePasswordBtn" style="width:100%; padding:10px; background:${UI.primaryPink}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Change Password</button>
            <p id="passwordMessage" style="margin:10px 0 0 0; font-size:13px;"></p>
          </div>

          <div id="orderHistoryContainer" style="margin-bottom:16px; padding:14px; background:#fff; border-radius:8px; border:1px solid #f2f2f2;"></div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // handlers
  const closeBtn = document.getElementById('closeProfileModal');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
  const modalRoot = document.getElementById('userProfileModal');
  if (modalRoot) modalRoot.addEventListener('click', (e) => { if (e.target.id === 'userProfileModal') closeProfileModal(); });

  const updateBtn = document.getElementById('updatePhoneBtn');
  if (updateBtn) updateBtn.addEventListener('click', handleUpdatePhone);

  const changePwdBtn = document.getElementById('changePasswordBtn');
  if (changePwdBtn) changePwdBtn.addEventListener('click', handleChangePassword);

  const countrySelect = document.getElementById('countryCodeSelect');
  if (countrySelect) countrySelect.value = '+250';
}

function openProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  if (!currentUser) { alert('Please sign in.'); return; }
  modal.style.display = 'flex';
  loadUserProfile();
  loadOrderHistory && typeof loadOrderHistory === 'function' && loadOrderHistory();
}

function closeProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  modal.style.display = 'none';
  const phoneMessage = document.getElementById('phoneMessage'); if (phoneMessage) phoneMessage.textContent = '';
  const passwordMessage = document.getElementById('passwordMessage'); if (passwordMessage) passwordMessage.textContent = '';
  const cp = document.getElementById('currentPassword'); if (cp) cp.value = '';
  const np = document.getElementById('newPassword'); if (np) np.value = '';
  const cf = document.getElementById('confirmNewPassword'); if (cf) cf.value = '';
}

async function loadUserProfile() {
  if (!currentUser) return;
  // ensure we have latest profile
  currentUserProfile = await getUserProfile(currentUser.id);

  const nameSource = currentUser.user_metadata?.full_name || currentUser.email || 'User';
  const initial = nameSource.charAt(0).toUpperCase();
  const avatar = document.getElementById('userAvatar'); if (avatar) avatar.textContent = initial;
  const nameEl = document.getElementById('userName'); if (nameEl) nameEl.textContent = currentUserProfile?.full_name || currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
  const emailEl = document.getElementById('userEmail'); if (emailEl) emailEl.textContent = currentUser.email || '';

  // phone logic: prefer value from profiles table if present
  const phoneField = currentUserProfile?.phone || currentUser.user_metadata?.phone || '';
  const phoneInput = document.getElementById('phoneInput');
  const countrySelect = document.getElementById('countryCodeSelect');

  if (phoneField && phoneInput) {
    const m = phoneField.match(/^\+(\d{1,3})(.*)$/);
    if (m && countrySelect) {
      const code = '+' + m[1];
      const opt = Array.from(countrySelect.options).find(o => o.value === code);
      if (opt) countrySelect.value = code;
      phoneInput.value = m[2].replace(/^0+/, '');
    } else {
      if (countrySelect) countrySelect.value = '+250';
      phoneInput.value = phoneField;
    }
  } else {
    if (countrySelect) countrySelect.value = '+250';
    if (phoneInput) phoneInput.value = '';
  }
}

// ========== PHONE UPDATE ==========
async function handleUpdatePhone() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneInput = document.getElementById('phoneInput');
  const phoneRaw = phoneInput ? phoneInput.value.trim() : '';
  const message = document.getElementById('phoneMessage');
  const updateBtn = document.getElementById('updatePhoneBtn');

  if (!phoneRaw) { showMessage(message, 'Please enter a phone number.', 'error'); return; }
  if (!currentUser) { showMessage(message, 'Please sign in to update phone.', 'error'); return; }

  // normalize
  let normalized = phoneRaw.replace(/\s|-/g, '');
  if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
  const country = countrySelect ? countrySelect.value : '+250';
  if (!/^\+/.test(normalized)) normalized = country + normalized;

  if (country === '+250') {
    if (!/^\+2507\d{8}$/.test(normalized)) { showMessage(message, 'Enter a valid Rwandan number (+2507xxxxxxxx)', 'error'); return; }
  } else {
    if (!/^\+\d{5,15}$/.test(normalized)) { showMessage(message, 'Enter a valid international phone number.', 'error'); return; }
  }

  // show loading
  const originalText = updateBtn ? updateBtn.textContent : 'Save';
  if (updateBtn) setButtonLoading(updateBtn, true);

  try {
    // Update profiles table (try auth_id then fallback)
    const ok = await updateProfilePhoneByAuthOrId(currentUser.id, { phone: normalized, updated_at: new Date().toISOString() });
    if (!ok) throw new Error('Failed to update profile phone (check table schema/permissions).');

    // Also update user_metadata for consistency (no verification)
    const { data, error } = await supabase.auth.updateUser({ data: { phone: normalized } });
    if (error) console.warn('auth.updateUser phone warning:', error);

    // refresh local profile
    currentUserProfile = await getUserProfile(currentUser.id);
    showMessage(message, '✅ Phone number updated successfully!', 'success');
  } catch (err) {
    console.error('Error updating phone:', err);
    showMessage(message, err.message || 'Failed to update phone.', 'error');
  } finally {
    if (updateBtn) setButtonLoading(updateBtn, false, originalText);
  }
}

// ========== PASSWORD CHANGE ==========
async function handleChangePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  const message = document.getElementById('passwordMessage');
  const changeBtn = document.getElementById('changePasswordBtn');

  if (!currentPassword || !newPassword || !confirmPassword) { showMessage(message, 'Please fill all fields', 'error'); return; }
  if (newPassword.length < 6) { showMessage(message, 'New password must be at least 6 characters', 'error'); return; }
  if (newPassword !== confirmPassword) { showMessage(message, 'New passwords do not match', 'error'); return; }

  const originalText = changeBtn ? changeBtn.textContent : 'Change';
  if (changeBtn) setButtonLoading(changeBtn, true);

  try {
    showMessage(message, 'Changing password...', 'info');
    const signInResult = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPassword });
    if (signInResult.error) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    showMessage(message, '✅ Password changed successfully!', 'success');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
  } catch (err) {
    console.error('Change password error:', err);
    showMessage(message, err.message || 'Password change failed', 'error');
  } finally {
    if (changeBtn) setButtonLoading(changeBtn, false, originalText);
  }
}

// ========== UI: update logged in/out ==========
function updateUIForLoggedInUser(user) {
  const openModalBtn = document.getElementById('openModal');
  if (!openModalBtn) return;

  const displayName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = !!currentUserProfile?.is_admin;
  const adminBadge = isAdmin ? '<span style="background:#ff9db1;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:8px;">Admin</span>' : '';

  openModalBtn.outerHTML = `
    <div id="userMenuContainer" style="position:relative; display:flex; align-items:center; gap:12px;">
      <button id="userAvatarBtn" aria-label="Open user menu" style="width:48px;height:48px;border-radius:50%;background:${UI.avatarPink};color:#fff;border:3px solid #fff;cursor:pointer;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(255,125,167,0.12);">${initial}</button>
      <div id="userDropdown" style="display:none; position:absolute; top:64px; right:0; background:${UI.dropdownBg}; border-radius:14px; box-shadow:0 18px 50px rgba(0,0,0,0.12); width:260px; z-index:1000; overflow:visible;">
        <div style="padding:14px 16px; border-radius:14px; background:linear-gradient(180deg, rgba(255,249,250,1), #fff);">
          <div style="display:flex; align-items:center; flex-wrap:wrap;">
            <p style="margin:0; font-weight:800; color:#221; font-size:15px; line-height:1.4;">${displayName}</p>
            ${adminBadge}
          </div>
          <p style="margin:6px 0 0 0; font-size:13px; color:#6b6b6b; word-break:break-all;">${user.email || ''}</p>
        </div>

        <div style="padding:12px; display:flex; flex-direction:column; gap:8px;">
          ${isAdmin ? `
            <button id="adminPanelBtn" style="padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; width:100%;">⚙️ Admin Panel</button>
          ` : ''}
          <button id="viewProfileBtn" style="padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; width:100%;">👤 View Profile</button>
          <button id="logoutBtn" style="padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; color:${UI.danger}; width:100%;">🚪 Logout</button>
        </div>
      </div>
    </div>
  `;

  attachUserMenuHandlers();
}

function attachUserMenuHandlers() {
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminPanelBtn = document.getElementById('adminPanelBtn');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block'; dropdown.style.opacity = '0'; dropdown.style.transform = 'translateY(-6px)';
        setTimeout(() => { dropdown.style.transition = 'opacity 160ms ease, transform 160ms ease'; dropdown.style.opacity = '1'; dropdown.style.transform = 'translateY(0)'; }, 8);
      } else {
        dropdown.style.transition = 'opacity 120ms ease, transform 120ms ease'; dropdown.style.opacity = '0'; dropdown.style.transform = 'translateY(-6px)';
        setTimeout(() => { dropdown.style.display = 'none'; }, 140);
      }
    });
  }

  if (viewProfileBtn) viewProfileBtn.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; openProfileModal(); });
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (adminPanelBtn) adminPanelBtn.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; window.location.href = 'admin.html'; });

  document.addEventListener('click', (event) => {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatarBtn');
    if (!dd) return;
    if (event.target !== dd && !dd.contains(event.target) && event.target !== av && !av.contains(event.target)) {
      if (dd.style.display === 'block') {
        dd.style.transition = 'opacity 120ms ease, transform 120ms ease'; dd.style.opacity = '0'; dd.style.transform = 'translateY(-6px)';
        setTimeout(() => { dd.style.display = 'none'; }, 140);
      }
    }
  });
}

function updateUIForLoggedOutUser() {
  const userMenu = document.getElementById('userMenuContainer');
  if (!userMenu) return;
  userMenu.outerHTML = '<button id="openModal" style="padding:8px 12px; border-radius:8px; background:transparent; border:1px solid #eee; cursor:pointer;">Sign in</button>';
  const newOpenModalBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  if (newOpenModalBtn && modal) newOpenModalBtn.addEventListener('click', (e) => { e.preventDefault(); modal.style.display = 'flex'; });
}

// ========== MESSAGES & UTILITIES ==========
function showMessage(element, text, type = 'info') {
  if (!element) return;
  element.textContent = text; element.style.display = 'block';
  const colors = { error: { color: UI.danger }, success: { color: UI.success }, warning: { color: UI.warning }, info: { color: UI.primaryPink } };
  const style = (colors[type] || colors.info); element.style.color = style.color;
}

function showModalMessage(text, type = 'info') {
  const modal = document.getElementById('modal'); if (!modal) return;
  let messageDiv = modal.querySelector('.auth-message');
  if (!messageDiv) { messageDiv = document.createElement('div'); messageDiv.className = 'auth-message'; messageDiv.style.cssText = 'padding:12px;margin:10px 0;border-radius:8px;text-align:center;font-weight:700;'; const formTitle = modal.querySelector('#form-title'); if (formTitle) formTitle.insertAdjacentElement('afterend', messageDiv); else modal.insertAdjacentElement('afterbegin', messageDiv); }
  messageDiv.textContent = text; messageDiv.style.display = 'block';
  const colors = { error: { bg: '#ffecec', text: UI.danger, border: '#f2a1a1' }, success: { bg: '#e8f5e9', text: UI.success, border: '#a8e0b5' }, info: { bg: '#fff4f7', text: UI.primaryPink, border: '#ffd1dc' }, warning: { bg: '#fff4e5', text: UI.warning, border: '#ffcc80' } };
  const color = colors[type] || colors.info; messageDiv.style.backgroundColor = color.bg; messageDiv.style.color = color.text; messageDiv.style.border = `1px solid ${color.border}`;
}

function clearModalMessage() { const modal = document.getElementById('modal'); if (!modal) return; const msg = modal.querySelector('.auth-message'); if (msg) msg.style.display = 'none'; }

function showGlobalMessage(text, type = 'info') {
  let messageContainer = document.getElementById('global-message');
  if (!messageContainer) {
    messageContainer = document.createElement('div'); messageContainer.id = 'global-message';
    messageContainer.style.cssText = 'position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:8px; font-weight:700; z-index:10001; max-width:400px; box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    document.body.appendChild(messageContainer);
  }
  const colors = { error: { bg: '#ffecec', text: UI.danger, border: '#f2a1a1' }, success: { bg: '#e8f5e9', text: UI.success, border: '#a8e0b5' }, info: { bg: '#fff4f7', text: UI.primaryPink, border: '#ffd1dc' }, warning: { bg: '#fff4e5', text: UI.warning, border: '#ffcc80' } };
  const color = colors[type] || colors.info;
  messageContainer.style.backgroundColor = color.bg; messageContainer.style.color = color.text; messageContainer.style.border = `1px solid ${color.border}`; messageContainer.textContent = text; messageContainer.style.display = 'block';
  setTimeout(() => { messageContainer.style.display = 'none'; }, 5000);
}

function setButtonLoading(button, isLoading, originalText = 'Submit') {
  if (!button) return;
  if (isLoading) { button.disabled = true; button.innerHTML = '<div class="loading-spinner"></div> Loading...'; button.style.opacity = '0.7'; }
  else { button.disabled = false; button.textContent = originalText; button.style.opacity = '1'; }
}

function isValidEmail(email) { const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return emailRegex.test(email); }

// ========== END ==========


