// ==========================================
// COMPLETE E-COMMERCE SCRIPT
// Supabase Auth + Cart System
// ==========================================

// ==========================================
// 1. CONFIGURATION
// ==========================================

const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;
let currentUserProfile = null;
let isProcessingAuth = false;

const UI = {
  primaryPink: '#ff9db1',
  pinkSoft: '#fff0f3',
  avatarPink: '#ff7da7',
  danger: '#c62828',
  success: '#2e7d32',
  warning: '#ff9800'
};

const CART_KEY = "local_cart_v1";
const PRODUCTS_KEY = "local_products_v1";

const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'KE', code: '+254', label: 'Kenya' },
  { iso: 'UG', code: '+256', label: 'Uganda' },
  { iso: 'TZ', code: '+255', label: 'Tanzania' },
  { iso: 'BI', code: '+257', label: 'Burundi' },
  { iso: 'SS', code: '+211', label: 'South Sudan' }
];

// ==========================================
// 2. INITIALIZATION
// ==========================================

window.addEventListener('load', function() {
  initializeSupabaseAuth();
  setupFormToggle();
  setupModalHandlers();
  initializeCart();
  initializeMobileMenu();
});

function initializeMobileMenu() {
  const bar = document.getElementById('bar');
  const close = document.getElementById('close');
  const nav = document.getElementById('navbar');

  if (bar) {
    bar.addEventListener('click', () => {
      nav.classList.add('active');
    });
  }

  if (close) {
    close.addEventListener('click', () => {
      nav.classList.remove('active');
    });
  }
}

function initializeSupabaseAuth() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded');
    return;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setupAuthStateListener();
    setupAuthUI();
    checkAuthStatus();
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

// ==========================================
// 3. AUTH STATE MANAGEMENT
// ==========================================

function setupAuthStateListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);
    
    if (event === 'SIGNED_IN') {
      if (isProcessingAuth) {
        console.log('Already processing auth, skipping');
        return;
      }
      
      isProcessingAuth = true;
      currentUser = session.user;
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        currentUserProfile = await getUserProfile(currentUser.id);
        
        if (!currentUserProfile) {
          currentUserProfile = await createUserProfile(currentUser.id);
        }
        
        if (currentUserProfile?.is_admin === true) {
          showGlobalMessage('Welcome Admin! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = 'admin.html';
          }, 1000);
          return;
        }
        
        updateUIForLoggedInUser(currentUser);
        showGlobalMessage('Successfully signed in!', 'success');
        
      } catch (error) {
        console.error('Error during sign-in:', error);
        showGlobalMessage('Error: ' + error.message, 'error');
      } finally {
        isProcessingAuth = false;
      }
      return;
    }
    
    if (event === 'SIGNED_OUT') {
      isProcessingAuth = false;
      currentUser = null;
      currentUserProfile = null;
      updateUIForLoggedOutUser();
      showGlobalMessage('Signed out', 'info');
    }
  });
}

async function checkAuthStatus() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      return;
    }
    
    if (data.session?.user) {
      currentUser = data.session.user;
      currentUserProfile = await getUserProfile(currentUser.id);
      
      if (!currentUserProfile) {
        currentUserProfile = await createUserProfile(currentUser.id);
      }
      
      updateUIForLoggedInUser(currentUser);
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('Error checking auth:', error);
  }
}

// ==========================================
// 4. PROFILE MANAGEMENT
// ==========================================

async function getUserProfile(userId) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile fetch error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

async function createUserProfile(userId) {
  if (!supabase || !currentUser) return null;

  try {
    const profileData = {
      id: userId,
      email: currentUser.email,
      full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
      phone: null,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return await getUserProfile(userId);
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    return null;
  }
}

// ==========================================
// 5. AUTH UI SETUP
// ==========================================

function setupAuthUI() {
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');

  if (signinForm) {
    signinForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = signinForm.querySelectorAll('input');
      const email = inputs[0].value.trim();
      const password = inputs[1].value;
      
      const submitBtn = signinForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      setButtonLoading(submitBtn, true);
      await handleSignIn(email, password);
      setButtonLoading(submitBtn, false, originalText);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = registerForm.querySelectorAll('input');
      const name = inputs[0].value.trim();
      const email = inputs[1].value.trim();
      const password = inputs[2].value;
      const confirmPassword = inputs[3].value;
      
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      setButtonLoading(submitBtn, true);
      await handleRegister(name, email, password, confirmPassword);
      setButtonLoading(submitBtn, false, originalText);
    });
  }
}

function setButtonLoading(button, isLoading, originalText = 'Submit') {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> Loading...';
    button.style.opacity = '0.7';
  } else {
    button.disabled = false;
    button.textContent = originalText;
    button.style.opacity = '1';
  }
}

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
  }

  const toggle = document.getElementById("toggle");
  if (toggle) {
    toggle.addEventListener("click", switchForms);
  }
}

function setupModalHandlers() {
  const openBtn = document.getElementById("openModal");
  const closeBtn = document.getElementById("closeModal");
  const modal = document.getElementById("modal");

  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      modal.style.display = 'flex';
      modal.classList.add("open");
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = 'none';
      modal.classList.remove("open");
      resetAuthForms();
    });
  }

  if (modal) {
    modal.addEventListener("click", function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove("open");
        resetAuthForms();
      }
    });
  }
}

function resetAuthForms() {
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');
  
  if (signinForm) signinForm.reset();
  if (registerForm) registerForm.reset();
}

// ==========================================
// 6. AUTH HANDLERS
// ==========================================

async function handleSignIn(email, password) {
  if (!supabase) {
    showModalMessage('Auth service unavailable', 'error');
    return;
  }

  if (!email || !password) {
    showModalMessage('Please fill all fields', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showModalMessage('Enter a valid email', 'error');
    return;
  }

  try {
    showModalMessage('Signing in...', 'info');
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) throw error;

    showModalMessage('Sign in successful', 'success');
    
    setTimeout(() => {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
      }
      resetAuthForms();
    }, 700);

  } catch (error) {
    console.error('Sign in error:', error);
    showModalMessage(error.message || 'Sign in failed', 'error');
  }
}

async function handleRegister(name, email, password, confirmPassword) {
  if (!supabase) {
    showModalMessage('Auth service unavailable', 'error');
    return;
  }

  if (!name || !email || !password || !confirmPassword) {
    showModalMessage('Please fill all fields', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showModalMessage('Enter a valid email', 'error');
    return;
  }

  if (password.length < 6) {
    showModalMessage('Password too short (min 6 characters)', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showModalMessage('Passwords do not match', 'error');
    return;
  }

  try {
    showModalMessage('Creating account...', 'info');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: name.trim()
        } 
      }
    });

    if (error) throw error;

    if (data.user && !data.session) {
      showModalMessage('Check your email to confirm the account', 'success');
    } else {
      showModalMessage('Registration successful', 'success');
      setTimeout(() => {
        const modal = document.getElementById('modal');
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('open');
        }
        resetAuthForms();
      }, 900);
    }

  } catch (error) {
    console.error('Registration error:', error);
    showModalMessage(error.message || 'Registration failed', 'error');
  }
}

async function handleLogout(e) {
  if (e) e.preventDefault();
  
  if (!supabase) {
    alert('Auth service not available');
    return;
  }

  if (!confirm('Are you sure you want to sign out?')) {
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Logout error:', error);
    alert('Error signing out: ' + error.message);
  }
}

// ==========================================
// 7. UI UPDATE FUNCTIONS
// ==========================================

function updateUIForLoggedInUser(user) {
  const openModalBtn = document.getElementById('openModal');
  if (!openModalBtn) return;

  const displayName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = currentUserProfile?.is_admin === true;
  const adminBadge = isAdmin ? '<span style="background:#ff9db1;color:white;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:8px;">Admin</span>' : '';

  const userMenuHTML = `
    <li id="userMenuContainer" style="position:relative;list-style:none;">
      <button id="userAvatarBtn" aria-label="Open user menu" 
        style="width:48px;height:48px;border-radius:50%;background:${UI.avatarPink};color:#fff;border:3px solid #fff;cursor:pointer;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(255,125,167,0.12);">
        ${initial}
      </button>

      <div id="userDropdown" style="display:none;position:absolute;top:60px;right:0;background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,0.12);width:220px;z-index:1000;">
        <div style="padding:14px 16px;border-radius:14px 14px 0 0;background:linear-gradient(180deg,rgba(255,249,250,1),#fff);">
          <div style="display:flex;align-items:center;flex-wrap:wrap;">
            <p style="margin:0;font-weight:800;color:#221;font-size:15px;line-height:1.4;">${displayName}</p>
            ${adminBadge}
          </div>
          <p style="margin:6px 0 0 0;font-size:13px;color:#6b6b6b;word-break:break-all;">${user.email || ''}</p>
        </div>

        <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
          ${isAdmin ? `
            <button id="adminPanelBtn" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:30px;background:#fff;border:1px solid #f6f3f4;cursor:pointer;font-size:14px;box-shadow:0 6px 18px rgba(0,0,0,0.06);width:100%;">
              <span style="width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#6b3fb0;color:#fff;font-size:14px;">⚙️</span>
              <span style="color:#333;text-align:left;">Admin Panel</span>
            </button>
          ` : ''}
          
          <button id="viewProfileBtn" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:30px;background:#fff;border:1px solid #f6f3f4;cursor:pointer;font-size:14px;box-shadow:0 6px 18px rgba(0,0,0,0.06);width:100%;">
            <span style="width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#6b3fb0;color:#fff;font-size:14px;">👤</span>
            <span style="color:#333;text-align:left;">View Profile</span>
          </button>

          <button id="logoutBtn" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:30px;background:#fff;border:1px solid #f6f3f4;cursor:pointer;font-size:14px;color:${UI.danger};box-shadow:0 6px 18px rgba(0,0,0,0.04);width:100%;">
            <span style="width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#ffdcd3;color:${UI.danger};font-size:14px;">🚪</span>
            <span style="color:${UI.danger};text-align:left;">Logout</span>
          </button>
        </div>
      </div>
    </li>
  `;

  openModalBtn.outerHTML = userMenuHTML;
  
  setTimeout(() => {
    attachUserMenuHandlers();
  }, 100);
}

function attachUserMenuHandlers() {
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminPanelBtn = document.getElementById('adminPanelBtn');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-6px)';
        setTimeout(() => {
          dropdown.style.transition = 'opacity 160ms ease, transform 160ms ease';
          dropdown.style.opacity = '1';
          dropdown.style.transform = 'translateY(0)';
        }, 8);
      } else {
        dropdown.style.transition = 'opacity 120ms ease, transform 120ms ease';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-6px)';
        setTimeout(() => { dropdown.style.display = 'none'; }, 140);
      }
    });
  }

  if (adminPanelBtn) {
    adminPanelBtn.addEventListener('click', function() {
      if (dropdown) dropdown.style.display = 'none';
      window.location.href = 'admin.html';
    });
  }

  if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', function() {
      if (dropdown) dropdown.style.display = 'none';
      alert('Profile settings coming soon!');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  document.addEventListener('click', function(event) {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatarBtn');
    if (!dd) return;
    if (event.target !== dd && !dd.contains(event.target) && event.target !== av && !av?.contains(event.target)) {
      if (dd.style.display === 'block') {
        dd.style.transition = 'opacity 120ms ease, transform 120ms ease';
        dd.style.opacity = '0';
        dd.style.transform = 'translateY(-6px)';
        setTimeout(() => { dd.style.display = 'none'; }, 140);
      }
    }
  });
}

function updateUIForLoggedOutUser() {
  const userMenu = document.getElementById('userMenuContainer');
  if (!userMenu) return;
  
  userMenu.outerHTML = '<button id="openModal" style="padding:8px 12px;border-radius:8px;background:transparent;border:1px solid #eee;cursor:pointer;">Sign in</button>';
  
  const newOpenModalBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  
  if (newOpenModalBtn && modal) {
    newOpenModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      modal.style.display = 'flex';
      modal.classList.add('open');
    });
  }
}

// ==========================================
// 8. MESSAGE SYSTEM
// ==========================================

function showModalMessage(text, type = 'info') {
  const modal = document.getElementById('modal');
  if (!modal) return;
  
  let messageDiv = modal.querySelector('.auth-message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.className = 'auth-message';
    messageDiv.style.cssText = 'padding:12px;margin:10px 0;border-radius:8px;text-align:center;font-weight:700;';
    const formTitle = modal.querySelector('#form-title');
    if (formTitle) formTitle.insertAdjacentElement('afterend', messageDiv);
    else modal.insertAdjacentElement('afterbegin', messageDiv);
  }
  
  messageDiv.textContent = text;
  messageDiv.style.display = 'block';
  
  const colors = {
    error: { bg: '#ffecec', text: UI.danger },
    success: { bg: '#e8f5e9', text: UI.success },
    info: { bg: '#fff4f7', text: UI.primaryPink }
  };
  
  const color = colors[type] || colors.info;
  messageDiv.style.backgroundColor = color.bg;
  messageDiv.style.color = color.text;
}

function showGlobalMessage(text, type = 'info') {
  let messageContainer = document.getElementById('global-message');
  
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'global-message';
    messageContainer.style.cssText = `
      position:fixed;
      top:20px;
      right:20px;
      padding:12px 20px;
      border-radius:8px;
      font-weight:700;
      z-index:10001;
      max-width:400px;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(messageContainer);
  }
  
  const colors = {
    error: { bg: '#ffecec', text: UI.danger },
    success: { bg: '#e8f5e9', text: UI.success },
    info: { bg: '#fff4f7', text: UI.primaryPink }
  };
  
  const color = colors[type] || colors.info;
  messageContainer.style.backgroundColor = color.bg;
  messageContainer.style.color = color.text;
  messageContainer.textContent = text;
  messageContainer.style.display = 'block';
  
  setTimeout(() => {
    messageContainer.style.display = 'none';
  }, 5000);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ==========================================
// 9. CART SYSTEM
// ==========================================

let cartToggleMobile, cartToggleDesktop, cartBadge, cartPanel, cartBackdrop, cartClose, cartItemsNode, cartSubtotalNode, checkoutBtn, clearCartBtn;

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

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

  if (!cartToggleMobile || !cartToggleDesktop) return;

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

  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      const cart = loadCart();
      const entries = Object.entries(cart);
      
      if (entries.length === 0) {
        alert("Cart is empty.");
        return;
      }
      
      if (confirm(`Checkout — total ${cartSubtotalNode.textContent}. Proceed with payment?`)) {
        clearCart();
        renderCart();
        closeCart();
        alert("Thank you! (This was a simulated checkout.)");
      }
    });
  }

  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      if (confirm("Clear cart?")) {
        clearCart();
        renderCart();
      }
    });
  }

  updateCartBadge();

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

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(productId, qty = 1) {
  const cart = loadCart();
  cart[productId] = (cart[productId] || 0) + qty;
  saveCart(cart);
  updateCartBadge();
}

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

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function loadProducts() {
  try { 
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || []; 
  } catch { 
    return []; 
  }
}

function renderCart() {
  if (!cartItemsNode) return;
  
  const cart = loadCart();
  const products = loadProducts();
  cartItemsNode.innerHTML = "";

  const entries = Object.entries(cart);
  if (entries.length === 0) {
    cartItemsNode.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#666;">Your cart is empty.</div>`;
    if (cartSubtotalNode) cartSubtotalNode.textContent = fmt.format(0);
    return;
  }

  let subtotalCents = 0;

  for (const [productId, qty] of entries) {
    const product = products.find(p => p.id === productId);
    if (!product) {
      setCartQty(productId, 0);
      continue;
    }
    
    const itemTotal = (product.price_cents || 0) * qty;
    subtotalCents += itemTotal;

    const ci = document.createElement("div");
    ci.style.cssText = "display:flex;gap:12px;padding:12px;border-bottom:1px solid #eee;";
    ci.innerHTML = `
      <img src="${product.image_data_url}" alt="${product.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" />
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:600;color:#333;">${product.name}</div>
          <div style="font-weight:700;color:${UI.primaryPink};">${fmt.format(itemTotal / 100)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <button data-decrease="${productId}" style="padding:4px 12px;border-radius:6px;background:${UI.primaryPink};color:#fff;border:none;cursor:pointer;font-size:16px;">−</button>
            <div style="min-width:28px;text-align:center;font-weight:600;">${qty}</div>
            <button data-increase="${productId}" style="padding:4px 12px;border-radius:6px;background:${UI.primaryPink};color:#fff;border:none;cursor:pointer;font-size:16px;">+</button>
          </div>
          <button data-remove="${productId}" style="padding:6px 12px;border-radius:6px;background:${UI.danger};color:#fff;border:none;cursor:pointer;font-size:13px;">Remove</button>
        </div>
      </div>
    `;
    cartItemsNode.appendChild(ci);
  }

  if (cartSubtotalNode) cartSubtotalNode.textContent = fmt.format(subtotalCents / 100);

  bindCartEventListeners();
}

function bindCartEventListeners() {
  cartItemsNode.querySelectorAll("button[data-increase]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-increase");
      addToCart(id, 1);
      renderCart();
    });
  });
  
  cartItemsNode.querySelectorAll("button[data-decrease]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-decrease");
      const cart = loadCart();
      const newQ = (cart[id] || 0) - 1;
      setCartQty(id, newQ);
      renderCart();
    });
  });
  
  cartItemsNode.querySelectorAll("button[data-remove]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-remove");
      setCartQty(id, 0);
      renderCart();
    });
  });
}

function computeCartCount() {
  const cart = loadCart();
  return Object.values(cart).reduce((s, q) => s + q, 0);
}

function updateCartBadge() {
  if (!cartBadge) return;
  const count = computeCartCount();
  cartBadge.textContent = count;
  cartBadge.style.display = count ? "inline-block" : "none";
}

function openCart() {
  if (!cartPanel || !cartBackdrop) return;
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  cartBackdrop.hidden = false;
  renderCart();
}

function closeCart() {
  if (!cartPanel || !cartBackdrop) return;
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  cartBackdrop.hidden = true;
}

function renderShopProducts() {
  const products = loadProducts();
  const container = document.querySelector(".pro-container");
  if (!container) return;
  
  container.innerHTML = "";

  products.forEach(p => {
    container.innerHTML += `
      <div class="pro" data-product-id="${p.id}">
        <img src="${p.image_data_url}" alt="${p.name}">
        <div class="des">
          <span>Custom</span>
          <h5>${p.name}</h5>
          <h4>${(p.price_cents/100).toFixed(2)}</h4>
        </div>
        <a href="#"><i class="fa-solid fa-cart-shopping cart" style="color:${UI.primaryPink};"></i></a>
      </div>
    `;
  });
}

// Render shop products on page load
if (document.querySelector(".pro-container")) {
  renderShopProducts();
}

// Add keyframe animation for loading spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
