// ==============================================
// GOD'S ONLY STORE - COMPLETE SCRIPT
// Auth, Profile, Cart with Supabase
// ==============================================

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
  success: '#2e7d32'
};

// ==============================================
// INITIALIZATION
// ==============================================

window.addEventListener('load', function() {
  initializeSupabase();
  setupAuth();
  initializeCart();
  initializeMobileMenu();
});

function initializeSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded');
    return;
  }
  
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase = supabase;
    setupAuthStateListener();
    checkAuthStatus();
  } catch (error) {
    console.error('Supabase init failed:', error);
  }
}

function initializeMobileMenu() {
  const bar = document.getElementById('bar');
  const close = document.getElementById('close');
  const nav = document.getElementById('navbar');
  
  if (bar) bar.addEventListener('click', () => nav.classList.add('active'));
  if (close) close.addEventListener('click', () => nav.classList.remove('active'));
}

// ==============================================
// AUTH STATE MANAGEMENT
// ==============================================

function setupAuthStateListener() {
  if (!supabase) return;
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && !isProcessingAuth) {
      isProcessingAuth = true;
      currentUser = session.user;
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        currentUserProfile = await getUserProfile(currentUser.id);
        if (!currentUserProfile) {
          currentUserProfile = await createUserProfile(currentUser.id);
        }
        
        if (currentUserProfile?.is_admin === true) {
          showMessage('Welcome Admin! Redirecting...', 'success');
          setTimeout(() => window.location.href = 'admin.html', 1000);
          return;
        }
        
        updateUIForLoggedInUser(currentUser);
        showMessage('Successfully signed in!', 'success');
        await syncCartFromDatabase();
        
      } catch (error) {
        console.error('Sign in error:', error);
        showMessage('Error: ' + error.message, 'error');
      } finally {
        isProcessingAuth = false;
      }
    }
    
    if (event === 'SIGNED_OUT') {
      isProcessingAuth = false;
      currentUser = null;
      currentUserProfile = null;
      updateUIForLoggedOutUser();
      showMessage('Signed out', 'info', 2000);
      updateCartBadge();
      if (document.getElementById('cart-items')) renderCart();
    }
  });
}

async function checkAuthStatus() {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return;
    
    if (data.session?.user) {
      currentUser = data.session.user;
      currentUserProfile = await getUserProfile(currentUser.id);
      if (!currentUserProfile) {
        currentUserProfile = await createUserProfile(currentUser.id);
      }
      updateUIForLoggedInUser(currentUser);
      await syncCartFromDatabase();
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

// ==============================================
// PROFILE MANAGEMENT
// ==============================================

async function getUserProfile(userId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return error ? null : data;
  } catch (error) {
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
      is_admin: false
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();
    
    if (error && error.code === '23505') {
      return await getUserProfile(userId);
    }
    return data;
  } catch (error) {
    return null;
  }
}

// ==============================================
// AUTH UI SETUP
// ==============================================

function setupAuth() {
  setupFormToggle();
  setupModalHandlers();
  setupAuthForms();
}

function setupAuthForms() {
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');
  const forgotLink = document.getElementById('forgotPasswordLink');
  
  if (signinForm) {
    signinForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = signinForm.querySelectorAll('input');
      const email = inputs[0].value.trim();
      const password = inputs[1].value;
      const btn = signinForm.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);
      await handleSignIn(email, password);
      setButtonLoading(btn, false, 'Sign In');
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
      const btn = registerForm.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);
      await handleRegister(name, email, password, confirmPassword);
      setButtonLoading(btn, false, 'Register');
    });
  }
  
  if (forgotLink) {
    forgotLink.addEventListener('click', handleForgotPassword);
  }
}

function setButtonLoading(button, isLoading, originalText = 'Submit') {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span> Loading...';
  } else {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function setupFormToggle() {
  const signinForm = document.getElementById("signin-form");
  const registerForm = document.getElementById("register-form");
  const formTitle = document.getElementById("form-title");
  const toggleText = document.querySelector(".toggle-text");
  
  if (!signinForm || !registerForm) return;
  
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
    document.getElementById("toggle").addEventListener("click", switchForms);
  }
  
  const toggle = document.getElementById("toggle");
  if (toggle) toggle.addEventListener("click", switchForms);
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
    });
  }
  
  if (modal) {
    modal.addEventListener("click", function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove("open");
      }
    });
  }
}

// ==============================================
// AUTH HANDLERS
// ==============================================

async function handleSignIn(email, password) {
  if (!supabase || !email || !password) {
    showModalMessage('Please fill all fields', 'error');
    return;
  }
  
  if (!isValidEmail(email)) {
    showModalMessage('Enter a valid email', 'error');
    return;
  }
  
  try {
    showModalMessage('Signing in...', 'info');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    showModalMessage('Sign in successful', 'success');
    setTimeout(() => {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
      }
    }, 700);
  } catch (error) {
    showModalMessage(error.message || 'Sign in failed', 'error');
  }
}

async function handleRegister(name, email, password, confirmPassword) {
  if (!supabase || !name || !email || !password || !confirmPassword) {
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
        data: { full_name: name.trim() },
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) throw error;
    
    if (data.user && !data.session) {
      showModalMessage('Check your email to confirm your account', 'success');
    } else {
      showModalMessage('Registration successful', 'success');
      setTimeout(() => {
        const modal = document.getElementById('modal');
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('open');
        }
      }, 900);
    }
  } catch (error) {
    showModalMessage(error.message || 'Registration failed', 'error');
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = prompt('Enter your email address:');
  if (!email || !isValidEmail(email)) {
    alert('Please enter a valid email');
    return;
  }
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
    alert('Password reset link sent!');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function handleLogout(e) {
  if (e) e.preventDefault();
  if (!confirm('Are you sure you want to sign out?')) return;
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ==============================================
// UI UPDATES
// ==============================================

function updateUIForLoggedInUser(user) {
  const openModalBtn = document.getElementById('openModal');
  if (!openModalBtn) return;
  
  const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = currentUserProfile?.is_admin === true;
  
  const userMenuHTML = `
    <li id="userMenuContainer" style="position:relative;list-style:none;">
      <button id="userAvatarBtn" aria-label="Open user menu" 
        style="width:48px;height:48px;border-radius:50%;background:${UI.avatarPink};color:#fff;border:3px solid #fff;cursor:pointer;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 30px rgba(255,125,167,0.12);">
        ${initial}
      </button>
      <div id="userDropdown" style="display:none;position:absolute;top:60px;right:0;background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,0.12);width:220px;z-index:1000;">
        <div style="padding:14px 16px;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0;font-weight:800;color:#221;font-size:15px;">${displayName}</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#666;">${user.email}</p>
        </div>
        <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
          ${isAdmin ? '<button id="adminPanelBtn" style="width:100%;padding:10px;border-radius:8px;background:#fff;border:1px solid #f0f0f0;cursor:pointer;text-align:left;">⚙️ Admin Panel</button>' : ''}
          <button id="logoutBtn" style="width:100%;padding:10px;border-radius:8px;background:#fff;border:1px solid #f0f0f0;cursor:pointer;color:${UI.danger};text-align:left;">🚪 Logout</button>
        </div>
      </div>
    </li>
  `;
  
  openModalBtn.outerHTML = userMenuHTML;
  setTimeout(attachUserMenuHandlers, 100);
}

function attachUserMenuHandlers() {
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminBtn = document.getElementById('adminPanelBtn');
  
  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
  }
  
  if (adminBtn) {
    adminBtn.addEventListener('click', () => window.location.href = 'admin.html');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatarBtn');
    if (dd && av && !dd.contains(e.target) && e.target !== av) {
      dd.style.display = 'none';
    }
  });
}

function updateUIForLoggedOutUser() {
  const userMenu = document.getElementById('userMenuContainer');
  if (!userMenu) return;
  
  userMenu.outerHTML = '<button id="openModal">Sign-in/Register</button>';
  
  const newBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  if (newBtn && modal) {
    newBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      modal.classList.add('open');
    });
  }
}

// ==============================================
// MESSAGES
// ==============================================

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
  }
  
  const colors = {
    error: { bg: '#ffecec', text: UI.danger },
    success: { bg: '#e8f5e9', text: UI.success },
    info: { bg: '#fff4f7', text: UI.primaryPink }
  };
  
  const color = colors[type] || colors.info;
  messageDiv.textContent = text;
  messageDiv.style.backgroundColor = color.bg;
  messageDiv.style.color = color.text;
  messageDiv.style.display = 'block';
}

function showMessage(text, type = 'info', duration = 5000) {
  let msg = document.getElementById('global-message');
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'global-message';
    msg.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;font-weight:700;z-index:10001;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    document.body.appendChild(msg);
  }
  
  const colors = {
    error: { bg: '#ffecec', text: UI.danger },
    success: { bg: '#e8f5e9', text: UI.success },
    info: { bg: '#fff4f7', text: UI.primaryPink }
  };
  
  const color = colors[type] || colors.info;
  msg.style.backgroundColor = color.bg;
  msg.style.color = color.text;
  msg.textContent = text;
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', duration);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==============================================
// CART SYSTEM - SUPABASE INTEGRATION
// ==============================================

let cartToggleMobile, cartToggleDesktop, cartBadge, cartPanel, cartBackdrop, cartClose, cartItemsNode, cartSubtotalNode, checkoutBtn, clearCartBtn;

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
  
  cartToggleMobile.addEventListener("click", toggleCart);
  cartToggleDesktop.addEventListener("click", toggleCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);
  if (checkoutBtn) checkoutBtn.addEventListener("click", handleCheckout);
  if (clearCartBtn) clearCartBtn.addEventListener("click", handleClearCart);
  
  updateCartBadge();
}

function toggleCart() {
  if (cartPanel.classList.contains("open")) {
    closeCart();
  } else {
    openCart();
  }
}

async function syncCartFromDatabase() {
  if (!currentUser || !supabase) return;
  try {
    await updateCartBadge();
  } catch (error) {
    console.error('Cart sync error:', error);
  }
}

async function addToCartFromSupabase(productId) {
  if (!currentUser) {
    if (confirm('Please sign in to add items to cart. Sign in now?')) {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('open');
      }
    }
    return;
  }
  
  if (!supabase) {
    alert('Service unavailable');
    return;
  }
  
  try {
    const { data: existing, error: checkError } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('product_id', productId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existing) {
      const { error: updateError } = await supabase
        .from('cart')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('cart')
        .insert([{
          user_id: currentUser.id,
          product_id: productId,
          quantity: 1,
          added_at: new Date().toISOString()
        }]);
      if (insertError) throw insertError;
    }
    
    await updateCartBadge();
    showMessage('Added to cart!', 'success', 2000);
    
  } catch (error) {
    console.error('Add to cart error:', error);
    alert('Failed to add to cart: ' + error.message);
  }
}

window.addToCartFromSupabase = addToCartFromSupabase;

async function updateCartQuantity(cartId, newQuantity) {
  if (!supabase || !currentUser) return;
  
  try {
    if (newQuantity <= 0) {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('id', cartId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('cart')
        .update({ quantity: newQuantity })
        .eq('id', cartId);
      if (error) throw error;
    }
    
    await renderCart();
    await updateCartBadge();
  } catch (error) {
    console.error('Update cart error:', error);
    alert('Failed to update cart');
  }
}

async function removeFromCart(cartId) {
  if (!supabase || !currentUser) return;
  
  try {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', cartId);
    if (error) throw error;
    
    await renderCart();
    await updateCartBadge();
  } catch (error) {
    console.error('Remove error:', error);
    alert('Failed to remove item');
  }
}

async function handleClearCart() {
  if (!confirm('Clear all items from cart?')) return;
  if (!currentUser || !supabase) return;
  
  try {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', currentUser.id);
    if (error) throw error;
    
    await renderCart();
    await updateCartBadge();
  } catch (error) {
    console.error('Clear cart error:', error);
    alert('Failed to clear cart');
  }
}

async function handleCheckout() {
  if (!currentUser) {
    alert('Please sign in to checkout');
    return;
  }
  
  if (!supabase) return;
  
  try {
    const { data: cartItems, error: cartError } = await supabase
      .from('cart')
      .select('*, products(*)')
      .eq('user_id', currentUser.id);
    
    if (cartError) throw cartError;
    if (!cartItems || cartItems.length === 0) {
      alert('Cart is empty');
      return;
    }
    
    let total = 0;
    cartItems.forEach(item => {
      if (item.products) total += item.products.price * item.quantity;
    });
    
    if (confirm(`Checkout - Total: RWF ${total}. Proceed?`)) {
      const { error: clearError } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', currentUser.id);
      if (clearError) throw clearError;
      
      await renderCart();
      await updateCartBadge();
      closeCart();
      alert('Thank you! (This was a simulated checkout.)');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Checkout failed: ' + error.message);
  }
}

async function renderCart() {
  if (!cartItemsNode) return;
  
  if (!currentUser) {
    cartItemsNode.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#666;"><p>Please sign in to view your cart</p></div>';
    if (cartSubtotalNode) cartSubtotalNode.textContent = 'RWF 0';
    return;
  }
  
  if (!supabase) return;
  
  try {
    const { data: cartItems, error } = await supabase
      .from('cart')
      .select('id, quantity, products(id, name, price, image_url, stock)')
      .eq('user_id', currentUser.id);
    
    if (error) throw error;
    
    cartItemsNode.innerHTML = "";
    
    if (!cartItems || cartItems.length === 0) {
      cartItemsNode.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#666;">Your cart is empty.</div>';
      if (cartSubtotalNode) cartSubtotalNode.textContent = 'RWF 0';
      return;
    }
    
    let subtotal = 0;
    
    for (const item of cartItems) {
      if (!item.products) continue;
      
      const product = item.products;
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      const ci = document.createElement("div");
      ci.style.cssText = "display:flex;gap:12px;padding:12px;border-bottom:1px solid #eee;";
      ci.innerHTML = `
        <img src="${product.image_url || 'https://via.placeholder.com/80/fff0f3/ff9db1?text=No+Img'}" 
             alt="${product.name}" 
             style="width:80px;height:80px;object-fit:cover;border-radius:8px;" />
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-weight:600;color:#333;">${product.name}</div>
            <div style="font-weight:700;color:${UI.primaryPink};">RWF ${itemTotal}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <button data-decrease="${item.id}" style="padding:4px 12px;border-radius:6px;background:${UI.primaryPink};color:#fff;border:none;cursor:pointer;">−</button>
              <div style="min-width:28px;text-align:center;font-weight:600;">${item.quantity}</div>
              <button data-increase="${item.id}" style="padding:4px 12px;border-radius:6px;background:${UI.primaryPink};color:#fff;border:none;cursor:pointer;">+</button>
            </div>
            <button data-remove="${item.id}" style="padding:6px 12px;border-radius:6px;background:${UI.danger};color:#fff;border:none;cursor:pointer;font-size:13px;">Remove</button>
          </div>
        </div>
      `;
      cartItemsNode.appendChild(ci);
    }
    
    if (cartSubtotalNode) cartSubtotalNode.textContent = `RWF ${subtotal}`;
    bindCartEventListeners();
    
  } catch (error) {
    console.error('Render cart error:', error);
    cartItemsNode.innerHTML = '<div style="text-align:center;padding:20px;color:#c62828;">Error loading cart</div>';
  }
}

function bindCartEventListeners() {
  cartItemsNode.querySelectorAll("button[data-increase]").forEach(b => {
    b.addEventListener("click", async () => {
      const cartId = b.getAttribute("data-increase");
      const { data: cartItem } = await supabase
        .from('cart')
        .select('quantity')
        .eq('id', cartId)
        .single();
      if (cartItem) await updateCartQuantity(cartId, cartItem.quantity + 1);
    });
  });
  
  cartItemsNode.querySelectorAll("button[data-decrease]").forEach(b => {
    b.addEventListener("click", async () => {
      const cartId = b.getAttribute("data-decrease");
      const { data: cartItem } = await supabase
        .from('cart')
        .select('quantity')
        .eq('id', cartId)
        .single();
      if (cartItem) await updateCartQuantity(cartId, cartItem.quantity - 1);
    });
  });
  
  cartItemsNode.querySelectorAll("button[data-remove]").forEach(b => {
    b.addEventListener("click", async () => {
      const cartId = b.getAttribute("data-remove");
      await removeFromCart(cartId);
    });
  });
}

async function updateCartBadge() {
  if (!cartBadge) return;
  
  if (!currentUser || !supabase) {
    cartBadge.textContent = '0';
    cartBadge.style.display = 'none';
    return;
  }
  
  try {
    const { data: cartItems, error } = await supabase
      .from('cart')
      .select('quantity')
      .eq('user_id', currentUser.id);
    
    if (error) throw error;
    
    const count = cartItems ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'inline-block' : 'none';
  } catch (error) {
    console.error('Badge update error:', error);
    cartBadge.textContent = '0';
    cartBadge.style.display = 'none';
  }
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

const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);
