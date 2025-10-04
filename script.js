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
// SUPABASE AUTH - FULL REWRITE WITH CHECKPOINTS
// Paste/replace your old script with this
// ==========================================

/* CONFIG */
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;
let currentUserProfile = null;
let isProcessingAuth = false;
let authSubscription = null; // store the supabase auth subscription so we can unsubscribe before re-subscribing


/* UI constants used for inline styles (kept from your original) */
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

/* Simple checkpoint logger */
function chk(name, extra) {
  if (extra !== undefined) {
    console.log(`[CHK] ${name}:`, extra);
  } else {
    console.log(`[CHK] ${name}`);
  }
}

/* App init */
window.addEventListener('load', async () => {
  chk('window.load - start');
  initializeSupabaseAuth();
  setupFormToggle();
  setupModalHandlers();
  initializeCartIfExists();
  chk('window.load - done');
});

/* Initialize supabase */
function initializeSupabaseAuth() {
  chk('initializeSupabaseAuth - start');
  if (typeof window.supabase === 'undefined' && !window.createSupabaseClient) {
    // Many setups expose supabase client via window.supabase.createClient;
    // If user loaded supabase via script tag, we should use window.supabase.
    // If nothing found, log and stop.
    console.error('[ERR] Supabase SDK not found on window');
    showGlobalMessage('Supabase SDK not found. Check your script include.', 'error');
    chk('initializeSupabaseAuth - missing supabase SDK');
    return;
  }

  try {
    // Use window.supabase.createClient if available (common pattern)
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (typeof createSupabaseClient === 'function') {
      // fallback if user has helper
      supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      throw new Error('No createClient available for Supabase');
    }
    chk('Supabase client created', !!supabase);

    setupAuthStateListener();
    setupAuthUI();
    createProfileModal();
    checkAuthStatus();

  } catch (err) {
    console.error('initializeSupabaseAuth error', err);
    showGlobalMessage('Failed to initialize Supabase client', 'error');
  }
  chk('initializeSupabaseAuth - end');
}

/* AUTH STATE LISTENER */
function setupAuthStateListener() {
  if (!supabase || !supabase.auth || typeof supabase.auth.onAuthStateChange !== 'function') {
    console.warn('❌ Supabase auth listener cannot be set (missing API).');
    return;
  }

  console.log('[CHK] setupAuthStateListener - start');

  // If there is an existing subscription, unsubscribe it first to avoid duplicate handlers
  try {
    if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
      console.log('[CHK] Unsubscribing previous auth subscription');
      authSubscription.unsubscribe();
    }
  } catch (err) {
    console.warn('[CHK] error while unsubscribing previous auth subscription', err);
  }
  authSubscription = null;

  // Create a new listener and save the subscription reference
  const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[CHK] onAuthStateChange fired:', event);
    // quick sanity: ensure session.user exists for SIGNED_IN
    if (event === 'SIGNED_IN' && !session?.user) {
      console.warn('[CHK] SIGNED_IN event but no session.user — ignoring');
      return;
    }

    // Avoid overlapping processing, but still allow short re-entrancy
    if (event === 'SIGNED_IN') {
      if (isProcessingAuth) {
        console.log('[CHK] SIGNED_IN received but isProcessingAuth true — delaying briefly then retrying');
        // small debounce: wait and re-check once
        await new Promise(r => setTimeout(r, 250));
        if (isProcessingAuth) {
          console.log('[CHK] Still processing after delay — skipping this SIGNED_IN event');
          return;
        }
      }
      isProcessingAuth = true;
    }

    try {
      switch (event) {
        case 'SIGNED_IN':
          currentUser = session.user;
          console.log('[CHK] SIGNED_IN - currentUser set:', currentUser?.email);
          // allow session to settle a moment
          await new Promise(r => setTimeout(r, 250));

          // load or create profile
          console.log('[CHK] SIGNED_IN - loading profile for user:', currentUser.id);
          currentUserProfile = await getUserProfile(currentUser.id);
          console.log('[CHK] Profile load result:', !!currentUserProfile);

          if (!currentUserProfile) {
            console.log('[CHK] Profile missing — creating now');
            currentUserProfile = await createUserProfile(currentUser.id);
            console.log('[CHK] Profile created result:', !!currentUserProfile);
          }

          // admin redirect if needed
          if (currentUserProfile?.is_admin === true) {
            console.log('[CHK] Admin detected - redirecting to admin.html');
            showGlobalMessage('Welcome Admin! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'admin.html', 800);
            isProcessingAuth = false;
            return;
          }

          // update UI (always call after successful profile load)
          console.log('[CHK] Calling updateUIForLoggedInUser now');
          updateUIForLoggedInUser(currentUser);
          showGlobalMessage('Successfully signed in!', 'success');
          break;

        case 'SIGNED_OUT':
          console.log('[CHK] SIGNED_OUT - clearing state and updating UI');
          isProcessingAuth = false;
          currentUser = null;
          currentUserProfile = null;
          updateUIForLoggedOutUser();
          showGlobalMessage('Successfully signed out.', 'info');
          break;

        case 'USER_UPDATED':
          console.log('[CHK] USER_UPDATED event');
          if (session?.user) currentUser = session.user;
          break;

        case 'TOKEN_REFRESHED':
          console.log('[CHK] TOKEN_REFRESHED event');
          break;

        default:
          console.log('[CHK] unhandled auth event:', event);
      }
    } catch (err) {
      console.error('[CHK] Error in auth state handler:', err);
    } finally {
      // ensure flag cleared for SIGNED_IN processing
      if (event === 'SIGNED_IN') isProcessingAuth = false;
      console.log('[CHK] onAuthStateChange handler finished for', event);
    }
  });

  // listener may be returned in different shapes depending on Supabase client version
  if (listener && listener.subscription) {
    authSubscription = listener.subscription;
  } else {
    authSubscription = listener; // fallback
  }

  console.log('[CHK] setupAuthStateListener - done, subscription saved');
}


/* Check existing session on load */
async function checkAuthStatus() {
  chk('checkAuthStatus - start');
  if (!supabase || !supabase.auth || typeof supabase.auth.getSession !== 'function') {
    console.warn('[WARN] supabase.auth.getSession not available.');
    chk('checkAuthStatus - skipped');
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    chk('checkAuthStatus - getSession result', { data: !!data, error: !!error });

    if (error) {
      console.error('checkAuthStatus - error', error);
      chk('checkAuthStatus - error returned');
      return;
    }

    if (data?.session?.user) {
      currentUser = data.session.user;
      chk('checkAuthStatus - session user found', currentUser.email);
      const profile = await getUserProfile(currentUser.id);
      if (!profile) {
        chk('checkAuthStatus - profile missing; creating');
        currentUserProfile = await createUserProfile(currentUser.id);
      } else {
        currentUserProfile = profile;
      }
      updateUIForLoggedInUser(currentUser);
    } else {
      chk('checkAuthStatus - no session user; updating logged out UI');
      updateUIForLoggedOutUser();
    }
  } catch (err) {
    console.error('checkAuthStatus - exception', err);
  }
  chk('checkAuthStatus - end');
}

/* --------------------
   PROFILE HELPERS
   -------------------- */
async function getUserProfile(userId) {
  chk('getUserProfile - start', userId);
  if (!supabase || !userId) {
    chk('getUserProfile - missing supabase or userId');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    chk('getUserProfile - query returned', { data: !!data, error: !!error });
    if (error) {
      console.error('getUserProfile - query error', error);
      return null;
    }
    if (!data) {
      chk('getUserProfile - no data found');
      return null;
    }
    chk('getUserProfile - success', data);
    return data;
  } catch (err) {
    console.error('getUserProfile - exception', err);
    return null;
  } finally {
    chk('getUserProfile - end');
  }
}

async function createUserProfile(userId) {
  chk('createUserProfile - start', userId);
  if (!supabase || !currentUser || !userId) {
    chk('createUserProfile - missing data, aborting');
    return null;
  }

  try {
    const profileRow = {
      id: userId,
      email: currentUser.email,
      full_name: currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User'),
      phone: null,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileRow])
      .select()
      .maybeSingle();

    if (error) {
      // Handle unique constraint: fetch existing
      console.error('createUserProfile - insert error', error);
      if (error.code === '23505') {
        chk('createUserProfile - profile exists, fetching existing');
        return await getUserProfile(userId);
      }
      return null;
    }
    chk('createUserProfile - success', data);
    return data;
  } catch (err) {
    console.error('createUserProfile - exception', err);
    return null;
  } finally {
    chk('createUserProfile - end');
  }
}

/* --------------------
   AUTH UI SETUP
   -------------------- */
function setupAuthUI() {
  chk('setupAuthUI - start');
  const modal = document.getElementById('modal');
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');

  if (signinForm) {
    chk('setupAuthUI - signinForm found');
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = signinForm.querySelectorAll('input');
      const email = inputs[0]?.value?.trim() || '';
      const password = inputs[1]?.value || '';
      chk('signinForm.submit - values captured', { email: !!email, password: !!password });
      const btn = signinForm.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);
      await handleSignIn(email, password);
      setButtonLoading(btn, false);
    });
  } else {
    chk('setupAuthUI - signinForm NOT found');
  }

  if (registerForm) {
    chk('setupAuthUI - registerForm found');
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = registerForm.querySelectorAll('input');
      const name = inputs[0]?.value?.trim() || '';
      const email = inputs[1]?.value?.trim() || '';
      const password = inputs[2]?.value || '';
      const confirmPassword = inputs[3]?.value || '';
      chk('registerForm.submit - values captured', { name: !!name, email: !!email });
      const btn = registerForm.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);
      await handleRegister(name, email, password, confirmPassword);
      setButtonLoading(btn, false);
    });
  } else {
    chk('setupAuthUI - registerForm NOT found');
  }

  chk('setupAuthUI - end');
}

function setButtonLoading(button, isLoading, originalText = 'Submit') {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<div class="loading-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:6px;"></div> Loading...';
    button.style.opacity = '0.7';
  } else {
    button.disabled = false;
    button.textContent = originalText;
    button.style.opacity = '1';
  }
}

/* FORM TOGGLE & MODAL HANDLERS (kept simple) */
function setupFormToggle() {
  chk('setupFormToggle - start');
  const toggle = document.getElementById('toggle');
  if (!toggle) {
    chk('setupFormToggle - toggle NOT found');
    return;
  }
  toggle.addEventListener('click', () => {
    chk('setupFormToggle - toggle clicked');
    const signinForm = document.getElementById('signin-form');
    const registerForm = document.getElementById('register-form');
    const formTitle = document.getElementById('form-title');
    const toggleText = document.querySelector('.toggle-text');

    if (!signinForm || !registerForm || !formTitle || !toggleText) {
      chk('setupFormToggle - not all elements present for toggle');
      return;
    }

    if (signinForm.classList.contains('active')) {
      signinForm.classList.remove('active');
      registerForm.classList.add('active');
      formTitle.textContent = 'Create Account';
      toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
    } else {
      registerForm.classList.remove('active');
      signinForm.classList.add('active');
      formTitle.textContent = 'Sign In';
      toggleText.innerHTML = 'Don\'t have an account? <span id="toggle">Register</span>';
    }

    // rebind new toggle element
    const newToggle = document.getElementById('toggle');
    if (newToggle) newToggle.addEventListener('click', () => document.getElementById('toggle').click());
  });
  chk('setupFormToggle - end');
}

function setupModalHandlers() {
  chk('setupModalHandlers - start');
  const openBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('closeModal');

  if (openBtn && modal) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chk('openModal clicked');
      modal.style.display = 'flex';
      modal.classList.add('open');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      chk('closeModal clicked');
      modal.style.display = 'none';
      modal.classList.remove('open');
      resetAuthForms();
    });
  }

  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        chk('modal backdrop clicked');
        modal.style.display = 'none';
        modal.classList.remove('open');
        resetAuthForms();
      }
    });
  }
  chk('setupModalHandlers - end');
}

function resetAuthForms() {
  chk('resetAuthForms - start');
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');
  if (signinForm) signinForm.reset();
  if (registerForm) registerForm.reset();
  chk('resetAuthForms - end');
}

/* AUTH HANDLERS */
async function handleSignIn(email, password) {
  chk('handleSignIn - start', { email: !!email });
  if (!supabase) {
    showModalMessage('Auth service unavailable', 'error');
    chk('handleSignIn - supabase missing');
    return;
  }
  if (!email || !password) {
    showModalMessage('Please fill all fields', 'error');
    chk('handleSignIn - missing fields');
    return;
  }
  if (!isValidEmail(email)) {
    showModalMessage('Enter a valid email', 'error');
    chk('handleSignIn - invalid email');
    return;
  }

  try {
    showModalMessage('Signing in...', 'info');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    chk('handleSignIn - signInWithPassword response', { data: !!data, error: !!error });
    if (error) {
      throw error;
    }

    // success - modal will be closed via auth state listener; still small UX close
    showModalMessage('Sign in successful', 'success');
    setTimeout(() => {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
      }
      resetAuthForms();
    }, 700);
  } catch (err) {
    console.error('handleSignIn - error', err);
    showModalMessage(err.message || 'Sign in failed', 'error');
  } finally {
    chk('handleSignIn - end');
  }
}

async function handleRegister(name, email, password, confirmPassword) {
  chk('handleRegister - start', { name: !!name, email: !!email });
  if (!supabase) {
    showModalMessage('Auth service unavailable', 'error');
    chk('handleRegister - supabase missing');
    return;
  }
  if (!name || !email || !password || !confirmPassword) {
    showModalMessage('Please fill all fields', 'error');
    chk('handleRegister - missing fields');
    return;
  }
  if (!isValidEmail(email)) {
    showModalMessage('Enter a valid email', 'error');
    chk('handleRegister - invalid email');
    return;
  }
  if (password.length < 6) {
    showModalMessage('Password too short', 'error');
    chk('handleRegister - short password');
    return;
  }
  if (password !== confirmPassword) {
    showModalMessage('Passwords do not match', 'error');
    chk('handleRegister - mismatch password');
    return;
  }

  try {
    showModalMessage('Creating account...', 'info');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } }
    });
    chk('handleRegister - signUp response', { data: !!data, error: !!error });
    if (error) {
      throw error;
    }

    // If signup requires confirmation (typical), inform user
    if (data?.user && !data?.session) {
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
  } catch (err) {
    console.error('handleRegister - error', err);
    showModalMessage(err.message || 'Registration failed', 'error');
  } finally {
    chk('handleRegister - end');
  }
}

async function handleLogout(e) {
  chk('handleLogout - start');
  if (e) e.preventDefault();
  if (!supabase) {
    alert('Auth service not available');
    chk('handleLogout - supabase missing');
    return;
  }
  if (!confirm('Are you sure you want to sign out?')) {
    chk('handleLogout - user canceled logout');
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    chk('handleLogout - signOut result', { error: !!error });
    if (error) throw error;
  } catch (err) {
    console.error('handleLogout - error', err);
    alert('Error signing out: ' + (err.message || err));
  } finally {
    chk('handleLogout - end');
  }
}

/* PROFILE MODAL & LOADING (kept from your implementation) */
function createProfileModal() {
  chk('createProfileModal - start');
  if (document.getElementById('userProfileModal')) {
    chk('createProfileModal - already exists');
    return;
  }

  // Minimal modal structure (kept non-intrusive)
  const modalHTML = `
    <div id="userProfileModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:10000; justify-content:center; align-items:center;">
      <div style="background:#fff; border-radius:12px; width:90%; max-width:700px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h3 style="margin:0;">Account Settings</h3>
          <button id="closeProfileModal" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
        </div>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
          <div id="profileAvatar" style="width:56px;height:56px;border-radius:50%;background:${UI.avatarPink};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px;"></div>
          <div>
            <div id="profileName">Loading...</div>
            <div id="profileEmail" style="font-size:12px;color:#666;">...</div>
          </div>
        </div>
        <div id="orderHistoryContainer" style="margin-top:12px;"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const closeBtn = document.getElementById('closeProfileModal');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);

  const modalRoot = document.getElementById('userProfileModal');
  if (modalRoot) {
    modalRoot.addEventListener('click', (e) => {
      if (e.target === modalRoot) closeProfileModal();
    });
  }
  chk('createProfileModal - end');
}

function openProfileModal() {
  chk('openProfileModal - start');
  const modal = document.getElementById('userProfileModal');
  if (!modal) {
    chk('openProfileModal - modal missing');
    return;
  }
  if (!currentUser) {
    alert('Sign in to view profile');
    chk('openProfileModal - no currentUser');
    return;
  }
  modal.style.display = 'flex';
  // Fill simple info
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');

  const name = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
  if (profileAvatar) profileAvatar.textContent = name.charAt(0).toUpperCase();
  if (profileName) profileName.textContent = name;
  if (profileEmail) profileEmail.textContent = currentUser.email || '';

  chk('openProfileModal - end');
}

function closeProfileModal() {
  chk('closeProfileModal - start');
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  modal.style.display = 'none';
  chk('closeProfileModal - end');
}

/* PROFILE UPDATES (phone/password) - simplified to keep focus on auth checkpoints */
/* ---------- omitted heavy details to avoid interfering; keep original handlers if needed ---------- */

/* --------------------
   UI UPDATE FUNCTIONS (core area we debugged)
   -------------------- */
    /* ---------------------------
  updateUIForLoggedInUser (replaces signin btn in-place)
   - avatar is light-pink with white initial
   - dropdown: Orders | Settings | Logout (Settings looks like Orders)
--------------------------- */
async function updateUIForLoggedInUser(user) {
  console.log('[CHK] updateUIForLoggedInUser called for:', user?.email || null);

  const openModalBtn = document.getElementById('openModal');
  const displayName = (user?.user_metadata?.full_name) || (user?.email ? user.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = currentUserProfile?.is_admin === true;
  const adminBadge = isAdmin ? '<span class="user-admin-badge">Admin</span>' : '';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <ul id="userMenuContainer" class="user-menu-list" aria-hidden="false">
      <li class="user-menu-item" style="position:relative;">
        <button id="userAvatarBtn" class="user-avatar-btn avatar-lightpink" aria-label="Open user menu">${initial}</button>

        <div id="userDropdown" class="user-dropdown" style="display:none;">
          <div class="user-dropdown-header">
            <div class="ud-left">
              <div class="ud-avatar-mini avatar-lightpink">${initial}</div>
              <div style="margin-left:10px;">
                <p class="ud-name">${displayName}</p>
                <p class="ud-email">${user?.email || ''}</p>
              </div>
            </div>
            <div class="ud-right">
              ${adminBadge}
            </div>
          </div>

          <div class="user-dropdown-actions">
            <button id="ordersShortBtn" class="ud-btn">Orders</button>
            <button id="openSettingsBtn" class="ud-btn">Settings</button>
            <button id="logoutBtn" class="ud-btn logout">Logout</button>
          </div>
        </div>
      </li>
    </ul>
  `;
  const newNode = wrapper.firstElementChild;

  if (openModalBtn && openModalBtn.parentNode) {
    openModalBtn.parentNode.replaceChild(newNode, openModalBtn);
    console.log('[CHK] Replaced openModal button in place with avatar');
  } else {
    const nav = document.querySelector('nav') || document.querySelector('header') || document.body;
    nav.appendChild(newNode);
    console.warn('[CHK] openModal not found — appended user menu to', nav.tagName);
  }

  attachUserMenuHandlers();
  console.log('[CHK] updateUIForLoggedInUser done');
}

/* ---------------------------
  attachUserMenuHandlers
  - Orders -> opens Orders modal
  - Settings -> opens Settings modal (no gear)
  - Logout -> performs signOut
--------------------------- */
function attachUserMenuHandlers() {
  console.log('[CHK] attachUserMenuHandlers - start');

  // clone nodes safely to remove duplicate listeners
  function freshEl(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
  }

  const avatarBtn = freshEl('userAvatarBtn') || document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const ordersBtn = freshEl('ordersShortBtn') || document.getElementById('ordersShortBtn');
  const settingsBtn = freshEl('openSettingsBtn') || document.getElementById('openSettingsBtn');
  const logoutBtn = freshEl('logoutBtn') || document.getElementById('logoutBtn');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.style.display === 'block') {
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-6px)';
        setTimeout(() => { dropdown.style.display = 'none'; }, 140);
      } else {
        dropdown.style.display = 'block';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-6px)';
        setTimeout(() => {
          dropdown.style.transition = 'opacity 160ms ease, transform 160ms ease';
          dropdown.style.opacity = '1';
          dropdown.style.transform = 'translateY(0)';
        }, 8);
      }
    });
  }

  if (ordersBtn) {
    ordersBtn.addEventListener('click', () => {
      if (dropdown) dropdown.style.display = 'none';
      openOrdersModal();
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (dropdown) dropdown.style.display = 'none';
      openSettingsModal();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (dropdown) dropdown.style.display = 'none';
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[CHK] signOut error', error);
          showGlobalMessage('Sign out failed: ' + error.message, 'error');
          return;
        }
        // UI will update via auth state change listener
        showGlobalMessage('Signed out', 'info');
      } catch (err) {
        console.error('[CHK] signOut exception', err);
      }
    });
  }

  // close dropdown on outside click
  document.addEventListener('click', function(event) {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatarBtn');
    if (!dd) return;
    if (event.target !== dd && !dd.contains(event.target) && event.target !== av && !av?.contains(event.target)) {
      if (dd.style.display === 'block') {
        dd.style.opacity = '0';
        dd.style.transform = 'translateY(-6px)';
        setTimeout(() => { dd.style.display = 'none'; }, 140);
      }
    }
  });

  console.log('[CHK] attachUserMenuHandlers - end');
}

/* ---------------------------
  openSettingsModal
  - contains: Name edit (old working flow),
              Email edit (new working flow),
              Phone (E. Africa code dropdown),
              Password area: uses your team's savePwdBtn handler (we do NOT overwrite)
--------------------------- */
function openSettingsModal() {
  console.log('[CHK] openSettingsModal - start');

  if (!document.getElementById('settingsModal')) {
    const html = `
      <div id="settingsModal" class="settings-modal" style="display:flex">
        <div class="settings-panel">
          <div class="settings-header">
            <h2>Account Settings</h2>
            <button id="closeSettingsModal" class="close-settings-btn">&times;</button>
          </div>

          <div class="settings-body">
            <div class="left-col">
              <section class="settings-section">
                <h3>Profile</h3>

                <label>Full name</label>
                <div class="inline-row">
                  <div id="nameDisplayArea">
                    <span id="displayFullName" class="display-text">Loading</span>
                    <button id="editNameBtn" class="icon-btn">✏️</button>
                  </div>
                  <div id="nameEditArea" class="edit-row" style="display:none;">
                    <input id="nameInput" type="text" />
                    <button id="saveName" class="save-btn">Save</button>
                    <button id="cancelName" class="cancel-btn">Cancel</button>
                  </div>
                  <p id="nameMsg" class="field-msg"></p>
                </div>

                <label style="margin-top:10px;">Email</label>
                <div class="inline-row">
                  <div id="emailDisplayArea">
                    <span id="displayEmail" class="display-text">Loading</span>
                    <button id="editEmailBtn" class="icon-btn">✏️</button>
                  </div>
                  <div id="emailEditArea" class="edit-row" style="display:none;">
                    <input id="emailInput" type="email" />
                    <button id="saveEmail" class="save-btn">Save</button>
                    <button id="cancelEmail" class="cancel-btn">Cancel</button>
                  </div>
                  <p id="emailMsg" class="field-msg"></p>
                </div>
              </section>

              <section class="settings-section">
                <h3>Phone</h3>
                <div class="phone-row">
                  <select id="settingsCountryCode" class="country-select">
                    <option value="+250">RW +250</option>
                    <option value="+254">KE +254</option>
                    <option value="+256">UG +256</option>
                    <option value="+255">TZ +255</option>
                    <option value="+257">BI +257</option>
                    <option value="+211">SS +211</option>
                  </select>
                  <input id="settingsPhone" type="tel" placeholder="7XXXXXXXX" />
                  <button id="savePhone" class="save-btn">Save</button>
                </div>
                <p id="phoneMsg" class="field-msg"></p>
              </section>
            </div>

            <div class="right-col">
              <section class="settings-section">
                <h3>Change password</h3>
                <!-- THESE IDs match your team's handler: leave them so your code finds them -->
                <input id="settingsCurrentPwd" type="password" placeholder="Current password" />
                <input id="settingsNewPwd" type="password" placeholder="New password (min 6 chars)" />
                <input id="settingsConfirmNewPwd" type="password" placeholder="Confirm new password" />
                <!-- Team's handler expects #savePwdBtn — we do NOT overwrite its listener -->
                <button id="savePwdBtn" class="save-btn">Change password</button>
                <p id="pwdMsg" class="field-msg"></p>
              </section>

              <section style="margin-top:20px;">
                <button id="signOutNow" class="logout-full-btn">Sign out</button>
              </section>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // attach built-in UI close handler
    document.getElementById('closeSettingsModal').addEventListener('click', closeSettingsModal);
  }

  // populate values
  const nameText = currentUser?.user_metadata?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : '');
  const emailText = currentUser?.email || '';
  const phoneText = currentUserProfile?.phone || '';

  const displayFullName = document.getElementById('displayFullName');
  const displayEmail = document.getElementById('displayEmail');
  const settingsPhone = document.getElementById('settingsPhone');
  const countrySel = document.getElementById('settingsCountryCode');

  if (displayFullName) displayFullName.textContent = nameText;
  if (displayEmail) displayEmail.textContent = emailText;

  if (settingsPhone) {
    const m = (phoneText || '').match(/^\+(\d{1,3})(.*)$/);
    if (m) {
      const code = '+' + m[1];
      if (countrySel) {
        const opt = Array.from(countrySel.options).find(o => o.value === code);
        if (opt) countrySel.value = code;
      }
      settingsPhone.value = m[2].replace(/^0+/, '');
    } else {
      if (countrySel) countrySel.value = '+250';
      settingsPhone.value = phoneText || '';
    }
  }

  // wire local UI handlers (name/email/phone/save) - but DO NOT touch your team's password handler
  wireSettingsHandlers();

  // show modal
  document.getElementById('settingsModal').style.display = 'flex';
  console.log('[CHK] openSettingsModal - end');
}

/* ---------------------------
  wireSettingsHandlers
  - restores old name update behaviour (auth metadata + profiles)
  - keeps the new email update code (which you said works)
  - phone save uses profiles update
  - does NOT attach/change password listener if a handler already exists for #savePwdBtn
--------------------------- */
function wireSettingsHandlers() {
  // NAME handlers (old stable flow)
  const editNameBtn = document.getElementById('editNameBtn');
  const nameDisplayArea = document.getElementById('nameDisplayArea');
  const nameEditArea = document.getElementById('nameEditArea');
  const nameInput = document.getElementById('nameInput');
  const saveName = document.getElementById('saveName');
  const cancelName = document.getElementById('cancelName');
  const nameMsg = document.getElementById('nameMsg');

  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      nameDisplayArea.style.display = 'none';
      nameEditArea.style.display = 'flex';
      nameInput.value = currentUser?.user_metadata?.full_name || '';
      nameInput.focus();
    });
  }
  if (cancelName) {
    cancelName.addEventListener('click', () => {
      nameEditArea.style.display = 'none';
      nameDisplayArea.style.display = 'flex';
    });
  }
  if (saveName) {
    saveName.addEventListener('click', async () => {
      const v = nameInput.value.trim();
      if (!v) { nameMsg.textContent = 'Name cannot be empty'; nameMsg.style.color = UI.danger; return; }
      nameMsg.textContent = 'Saving...';
      try {
        // update auth metadata
        const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: v } });
        if (authErr) throw authErr;
        // update profiles table
        const { error: pErr } = await supabase.from('profiles').update({ full_name: v, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
        if (pErr) throw pErr;
        // refresh local user/profile
        const { data } = await supabase.auth.getSession();
        currentUser = data?.session?.user || currentUser;
        currentUserProfile = await getUserProfile(currentUser.id);
        document.getElementById('displayFullName').textContent = v;
        nameEditArea.style.display = 'none';
        nameDisplayArea.style.display = 'flex';
        nameMsg.textContent = 'Saved';
        nameMsg.style.color = UI.success;
        setTimeout(()=> nameMsg.textContent = '', 2000);
      } catch (err) {
        console.error('[CHK] saveName error', err);
        nameMsg.textContent = err.message || 'Failed to save name';
        nameMsg.style.color = UI.danger;
      }
    });
  }

  // EMAIL handlers (keep the working new code)
  const editEmailBtn = document.getElementById('editEmailBtn');
  const emailDisplayArea = document.getElementById('emailDisplayArea');
  const emailEditArea = document.getElementById('emailEditArea');
  const emailInput = document.getElementById('emailInput');
  const saveEmail = document.getElementById('saveEmail');
  const cancelEmail = document.getElementById('cancelEmail');
  const emailMsg = document.getElementById('emailMsg');

  if (editEmailBtn) {
    editEmailBtn.addEventListener('click', () => {
      emailDisplayArea.style.display = 'none';
      emailEditArea.style.display = 'flex';
      emailInput.value = currentUser?.email || '';
      emailInput.focus();
    });
  }
  if (cancelEmail) {
    cancelEmail.addEventListener('click', () => {
      emailEditArea.style.display = 'none';
      emailDisplayArea.style.display = 'flex';
    });
  }
  if (saveEmail) {
    saveEmail.addEventListener('click', async () => {
      const newEmail = emailInput.value.trim();
      if (!isValidEmail(newEmail)) { emailMsg.textContent = 'Enter a valid email'; emailMsg.style.color = UI.danger; return; }
      emailMsg.textContent = 'Saving...';
      try {
        // use the new working email update flow
        const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
        if (authErr) throw authErr;
        const { error: pErr } = await supabase.from('profiles').update({ email: newEmail, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
        if (pErr) throw pErr;
        const { data } = await supabase.auth.getSession();
        currentUser = data?.session?.user || currentUser;
        currentUserProfile = await getUserProfile(currentUser.id);
        document.getElementById('displayEmail').textContent = newEmail;
        emailEditArea.style.display = 'none';
        emailDisplayArea.style.display = 'flex';
        emailMsg.textContent = 'Saved (may require confirmation)';
        emailMsg.style.color = UI.success;
        setTimeout(()=> emailMsg.textContent = '', 3000);
      } catch (err) {
        console.error('[CHK] saveEmail error', err);
        emailMsg.textContent = err.message || 'Failed to save email';
        emailMsg.style.color = UI.danger;
      }
    });
  }

  // PHONE handlers (E. Africa dropdown present)
  const savePhone = document.getElementById('savePhone');
  if (savePhone) {
    savePhone.addEventListener('click', async () => {
      const phoneMsg = document.getElementById('phoneMsg');
      phoneMsg.textContent = 'Saving...';
      try {
        const raw = document.getElementById('settingsPhone').value.trim();
        let normalized = raw.replace(/\s|-/g, '');
        if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
        const code = document.getElementById('settingsCountryCode').value || '+250';
        if (!/^\+/.test(normalized)) normalized = code + normalized;
        if (!/^\+\d{5,15}$/.test(normalized)) throw new Error('Enter a valid phone number');
        const { error } = await supabase.from('profiles').update({ phone: normalized, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
        if (error) throw error;
        currentUserProfile = await getUserProfile(currentUser.id);
        phoneMsg.textContent = 'Saved';
        phoneMsg.style.color = UI.success;
        setTimeout(()=> phoneMsg.textContent = '', 2000);
      } catch (err) {
        console.error('[CHK] savePhone error', err);
        const phoneMsg = document.getElementById('phoneMsg');
        phoneMsg.textContent = err.message || 'Failed to save phone';
        phoneMsg.style.color = UI.danger;
      }
    });
  }

  // PASSWORD: do NOT attach a new listener if your team's code already attaches one to #savePwdBtn
  // We check whether #savePwdBtn already has listeners by checking a flag on the element (safe non-intrusive approach)
  const savePwdBtn = document.getElementById('savePwdBtn');
  if (savePwdBtn) {
    if (!savePwdBtn.dataset.handlerAttached) {
      // do NOT override if your team already attached their handler elsewhere; only attach a light wrapper if none exists
      // but per your instruction we avoid touching their code — so only attach a basic pass-through that triggers click
      // If you already used the block you pasted earlier, it will be the actual handler and this won't overwrite it.
      savePwdBtn.addEventListener('click', () => {
        console.log('[CHK] savePwdBtn clicked (pass-through)');
        // the real handler (your team's) should run; if not present, we fall back to a minimal handler:
        // (we won't implement fallback here to avoid touching team logic)
      });
      savePwdBtn.dataset.handlerAttached = '1';
    } else {
      console.log('[CHK] savePwdBtn already had handler attached; leaving it as-is');
    }
  }

  // Sign out button inside settings modal (also performs actual sign out)
  const signOutNow = document.getElementById('signOutNow');
  if (signOutNow) {
    signOutNow.addEventListener('click', async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        closeSettingsModal();
      } catch (err) {
        console.error('[CHK] signOutNow error', err);
      }
    });
  }
}

/* ---------------------------
  closeSettingsModal
--------------------------- */
function closeSettingsModal() {
  const m = document.getElementById('settingsModal');
  if (m) m.style.display = 'none';
}

/* ---------------------------
  isValidEmail helper (kept)
--------------------------- */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


/* -------------------------
   Orders modal (simple placeholder)
   ------------------------- */
function openOrdersModal() {
  console.log('[CHK] openOrdersModal - start');
  if (!document.getElementById('ordersModal')) {
    const html = `
      <div id="ordersModal" class="orders-modal" style="display:flex">
        <div class="orders-panel">
          <div class="orders-header">
            <h2>Orders</h2>
            <button id="closeOrdersModal" class="close-orders-btn">&times;</button>
          </div>
          <div class="orders-body">
            <p style="color:#666">No orders yet — content will be added later.</p>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('closeOrdersModal').addEventListener('click', closeOrdersModal);
  }
  const modal = document.getElementById('ordersModal');
  if (modal) modal.style.display = 'flex';
  console.log('[CHK] openOrdersModal - end');
}
function closeOrdersModal() {
  const m = document.getElementById('ordersModal');
  if (m) m.style.display = 'none';
}

/* -------------------------
   Settings Modal (overhauled UI)
   - includes country code select for E. Africa
   - inline edit for name & email (save updates both auth & profiles)
   ------------------------- */


/* -------------------------
   wire handlers for settings popup
   ------------------------- */

/* ---------- helpers for inline edits (name & email) ---------- */
function setupInlineEdits() {
    // name edit
  const editNameBtn = document.getElementById('editNameBtn');
  const nameDisplay = document.getElementById('nameInlineDisplay');
  const nameInputWrap = document.getElementById('nameInlineInput');
  const editNameInput = document.getElementById('editNameInput');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const cancelNameBtn = document.getElementById('cancelNameBtn');
  const nameMsg = document.getElementById('nameMsg');

  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      nameDisplay.style.display = 'none';
      nameInputWrap.style.display = 'block';
      editNameInput.value = currentUser?.user_metadata?.full_name || '';
      editNameInput.focus();
    });
  }
  if (cancelNameBtn) {
    cancelNameBtn.addEventListener('click', () => {
      nameInputWrap.style.display = 'none';
      nameDisplay.style.display = 'flex';
      nameMsg.textContent = '';
    });
  }
  if (saveNameBtn) {
    saveNameBtn.addEventListener('click', async () => {
      const v = editNameInput.value.trim();
      if (!v) {
        nameMsg.textContent = 'Name cannot be empty';
        nameMsg.style.color = UI.danger;
        return;
      }
      nameMsg.textContent = 'Saving...';
      try {
        // update auth metadata and profile
        const { error: authErr } = await supabase.auth.updateUser({
          data: { full_name: v }
        });
        if (authErr) throw authErr;

        // update profiles table
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ full_name: v, updated_at: new Date().toISOString() })
          .eq('id', currentUser.id);

        if (profileErr) throw profileErr;

        // refresh local user & profile
        const { data: sessionData } = await supabase.auth.getSession();
        currentUser = sessionData?.session?.user || currentUser;
        currentUserProfile = await getUserProfile(currentUser.id);

        document.getElementById('currentFullName').textContent = v;
        nameMsg.textContent = 'Saved';
        nameMsg.style.color = UI.success;
        nameInputWrap.style.display = 'none';
        nameDisplay.style.display = 'flex';
        setTimeout(() => nameMsg.textContent = '', 2000);
      } catch (err) {
        console.error('[CHK] saveName error', err);
        nameMsg.textContent = err.message || 'Failed to save name';
        nameMsg.style.color = UI.danger;
      }
    });
  }
    
  // email edit
  const editEmailBtn = document.getElementById('editEmailBtn');
  const emailDisplay = document.getElementById('emailInlineDisplay');
  const emailInputWrap = document.getElementById('emailInlineInput');
  const editEmailInput = document.getElementById('editEmailInput');
  const saveEmailBtn = document.getElementById('saveEmailBtn');
  const cancelEmailBtn = document.getElementById('cancelEmailBtn');
  const emailMsg = document.getElementById('emailMsg');

  if (editEmailBtn) {
    editEmailBtn.addEventListener('click', () => {
      emailDisplay.style.display = 'none';
      emailInputWrap.style.display = 'block';
      editEmailInput.value = currentUser?.email || '';
      editEmailInput.focus();
    });
  }
  if (cancelEmailBtn) {
    cancelEmailBtn.addEventListener('click', () => {
      emailInputWrap.style.display = 'none';
      emailDisplay.style.display = 'flex';
      emailMsg.textContent = '';
    });
  }
  if (saveEmailBtn) {
    saveEmailBtn.addEventListener('click', async () => {
      const newEmail = editEmailInput.value.trim();
      if (!isValidEmail(newEmail)) {
        emailMsg.textContent = 'Enter a valid email';
        emailMsg.style.color = UI.danger;
        return;
      }
      emailMsg.textContent = 'Saving...';
      try {
        // update auth email (supabase will usually send confirmation)
        const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
        if (authErr) throw authErr;

        // update profiles table email as well
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ email: newEmail, updated_at: new Date().toISOString() })
          .eq('id', currentUser.id);

        if (profileErr) throw profileErr;

        // refresh
        const { data: sessionData } = await supabase.auth.getSession();
        currentUser = sessionData?.session?.user || currentUser;
        currentUserProfile = await getUserProfile(currentUser.id);

        document.getElementById('currentEmail').textContent = newEmail;
        emailMsg.textContent = 'Saved (may require confirmation)';
        emailMsg.style.color = UI.success;
        emailInputWrap.style.display = 'none';
        emailDisplay.style.display = 'flex';
        setTimeout(() => emailMsg.textContent = '', 2500);
      } catch (err) {
        console.error('[CHK] saveEmail error', err);
        emailMsg.textContent = err.message || 'Failed to save email';
        emailMsg.style.color = UI.danger;
      }
    });
  }
}



// ===== REPLACE updateUIForLoggedOutUser =====
function updateUIForLoggedOutUser() {
  console.log('[CHK] updateUIForLoggedOutUser called');

  // Create sign-in button markup (same ID used elsewhere so your modal hook finds it)
  const signInHTML = `<button id="openModal" class="signin-btn">Sign-in/Register</button>`;

  // If user menu exists, replace it with the sign-in button in place
  const userMenu = document.getElementById('userMenuContainer');
  if (userMenu && userMenu.parentNode) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = signInHTML;
    const newBtn = wrapper.firstElementChild;
    userMenu.parentNode.replaceChild(newBtn, userMenu);
    console.log('[CHK] Replaced user menu with sign-in button in place');
  } else {
    // otherwise find auth-controls container or append to nav
    const authRoot = document.getElementById('auth-controls');
    if (authRoot) {
      authRoot.innerHTML = signInHTML;
    } else {
      const nav = document.querySelector('nav') || document.querySelector('header') || document.body;
      const div = document.createElement('div');
      div.id = 'auth-controls';
      div.innerHTML = signInHTML;
      nav.appendChild(div);
    }
    console.log('[CHK] Inserted sign-in button fallback');
  }

  // re-attach click handler to the new openModal button so the modal opens correctly
  const modal = document.getElementById('modal');
  const newOpenModalBtn = document.getElementById('openModal');
  if (newOpenModalBtn && modal) {
    newOpenModalBtn.addEventListener('click', function (e) {
      e.preventDefault();
      modal.style.display = 'flex';
      modal.classList.add('open');
    });
  }

  console.log('[CHK] updateUIForLoggedOutUser done');
}

/* --------------------
   MESSAGE UTILITIES
   -------------------- */

function showMessage(element, text, type = 'info') {
  if (!element) return;
  element.textContent = text;
  element.style.display = 'block';
  const colors = {
    error: UI.danger,
    success: UI.success,
    warning: UI.warning,
    info: UI.primaryPink
  };
  element.style.color = colors[type] || colors.info;
}

function showModalMessage(text, type = 'info') {
  const modal = document.getElementById('modal');
  if (!modal) return;
  let messageDiv = modal.querySelector('.auth-message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.className = 'auth-message';
    messageDiv.style.cssText = 'padding:12px; margin:10px 0; border-radius:8px; text-align:center; font-weight:700;';
    const formTitle = modal.querySelector('#form-title');
    if (formTitle) formTitle.insertAdjacentElement('afterend', messageDiv);
    else modal.insertAdjacentElement('afterbegin', messageDiv);
  }
  messageDiv.textContent = text;
  const bg = type === 'error' ? '#ffecec' : type === 'success' ? '#e8f5e9' : '#fff4f7';
  messageDiv.style.backgroundColor = bg;
}

function clearModalMessage() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  const message = modal.querySelector('.auth-message');
  if (message) message.style.display = 'none';
}

function showGlobalMessage(text, type = 'info') {
  let messageContainer = document.getElementById('global-message');
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'global-message';
    messageContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 700;
      z-index: 10001;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(messageContainer);
  }
  messageContainer.textContent = text;
  setTimeout(() => { messageContainer.style.display = 'none'; }, 4000);
}

/* --------------------
   UTILITIES
   -------------------- */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/* CART INIT (placeholder to avoid errors if script references it) */
function initializeCartIfExists() {
  chk('initializeCartIfExists - start');
  // If you have cart initialization logic, ensure it runs here.
  // Kept minimal so script doesn't error when referenced elsewhere.
  if (typeof initializeCart === 'function') {
    try {
      initializeCart();
      chk('initializeCartIfExists - initializeCart executed');
    } catch (err) {
      chk('initializeCartIfExists - initializeCart threw error');
      console.error(err);
    }
  } else {
    chk('initializeCartIfExists - no initializeCart defined');
  }
  chk('initializeCartIfExists - end');
}

/* Final checkpoint */
chk('auth-script-loaded');



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























