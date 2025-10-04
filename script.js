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
  chk('setupAuthStateListener - start');

  if (!supabase || !supabase.auth || typeof supabase.auth.onAuthStateChange !== 'function') {
    console.warn('[WARN] supabase.auth.onAuthStateChange not available. Skipping listener setup.');
    chk('setupAuthStateListener - skipped');
    return;
  }

  // Attach listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    chk('onAuthStateChange fired', event);
    try {
      if (event === 'SIGNED_IN') {
        if (isProcessingAuth) {
          chk('onAuthStateChange - already processing SIGNED_IN; skipping');
          return;
        }
        isProcessingAuth = true;
        chk('onAuthStateChange - SIGNED_IN processing start');

        currentUser = session?.user || null;
        chk('onAuthStateChange - currentUser', currentUser?.email || null);

        // small debounce to let session settle
        await new Promise(r => setTimeout(r, 200));

        // load or create profile
        const profile = await getUserProfile(currentUser?.id);
        chk('onAuthStateChange - getUserProfile result', profile);
        if (!profile) {
          chk('onAuthStateChange - profile missing; creating');
          currentUserProfile = await createUserProfile(currentUser?.id);
          chk('onAuthStateChange - profile created', currentUserProfile);
        } else {
          currentUserProfile = profile;
        }

        // admin redirect check
        if (currentUserProfile?.is_admin === true) {
          showGlobalMessage('Welcome Admin — redirecting...', 'success');
          chk('onAuthStateChange - admin detected, redirecting');
          setTimeout(() => (window.location.href = 'admin.html'), 800);
          isProcessingAuth = false;
          return;
        }

        // update UI
        updateUIForLoggedInUser(currentUser);
        showGlobalMessage('Signed in successfully', 'success');
        isProcessingAuth = false;
        chk('onAuthStateChange - SIGNED_IN processing end');
      } else if (event === 'SIGNED_OUT') {
        chk('onAuthStateChange - SIGNED_OUT start');
        isProcessingAuth = false;
        currentUser = null;
        currentUserProfile = null;
        updateUIForLoggedOutUser();
        showGlobalMessage('Signed out', 'info');
        chk('onAuthStateChange - SIGNED_OUT end');
      } else {
        chk('onAuthStateChange - other event', event);
        // for USER_UPDATED and TOKEN_REFRESHED, we don't force UI updates to avoid loops
        if (event === 'USER_UPDATED' && session?.user) {
          currentUser = session.user;
          chk('onAuthStateChange - USER_UPDATED updated currentUser');
        }
      }
    } catch (err) {
      console.error('onAuthStateChange handler error', err);
      isProcessingAuth = false;
    }
  });

  chk('setupAuthStateListener - end');
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
function updateUIForLoggedInUser(user) {
  chk('updateUIForLoggedInUser - start', user?.email || null);

  // ensure stable container
  let authRoot = document.getElementById('auth-controls');
  const existingOpenBtn = document.getElementById('openModal');

  if (!authRoot) {
    chk('updateUIForLoggedInUser - auth-controls not found; creating');
    authRoot = document.createElement('div');
    authRoot.id = 'auth-controls';
    if (existingOpenBtn && existingOpenBtn.parentNode) {
      existingOpenBtn.parentNode.insertBefore(authRoot, existingOpenBtn);
      authRoot.appendChild(existingOpenBtn);
    } else {
      // insert near top of body as fallback
      document.body.insertBefore(authRoot, document.body.firstChild);
    }
  }

  const u = user || currentUser;
  if (!u) {
    console.warn('updateUIForLoggedInUser called without a user');
    chk('updateUIForLoggedInUser - aborted');
    return;
  }

  const displayName = u.user_metadata?.full_name || (u.email ? u.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = currentUserProfile?.is_admin === true;
  const adminBadge = isAdmin ? '<span style="background: #ff9db1; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Admin</span>' : '';

  // Build user menu HTML (ul wrapper to avoid replacing unrelated nodes)
  const userMenuHTML = `
    <ul id="userMenuContainer" style="margin:0; padding:0; display:flex; align-items:center; gap:12px; list-style:none;">
      <li style="list-style:none; position:relative;">
        <button id="userAvatarBtn" aria-label="Open user menu"
          style="width:48px; height:48px; border-radius:50%; background:${UI.avatarPink}; color:#fff; border:3px solid #fff; cursor:pointer; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:center;">
          ${initial}
        </button>

        <div id="userDropdown" style="display:none; position:absolute; top:60px; right:0; background:${UI.dropdownBg}; border-radius:14px; box-shadow:0 18px 50px rgba(0,0,0,0.12); width:220px; z-index:1000; overflow:visible;">
          <div style="padding:14px 16px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div style="flex:1;">
                <p style="margin:0; font-weight:800; color:#221; font-size:15px;">${displayName}</p>
                <p style="margin:6px 0 0 0; font-size:13px; color:#6b6b6b; word-break:break-all;">${u.email || ''}</p>
              </div>
              ${adminBadge}
            </div>
          </div>
          <div style="padding:12px; display:flex; flex-direction:column; gap:8px;">
            ${isAdmin ? `
              <button id="adminPanelBtn" style="padding:10px; border-radius:12px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer;">Admin Panel</button>
            ` : ''}
            <button id="viewProfileBtn" style="padding:10px; border-radius:12px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer;">View Profile</button>
            <button id="logoutBtn" style="padding:10px; border-radius:12px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; color:${UI.danger};">Logout</button>
          </div>
        </div>
      </li>
    </ul>
  `;

  // render into stable container (no outerHTML replacement)
  authRoot.innerHTML = userMenuHTML;

  // attach handlers
  attachUserMenuHandlers();

  chk('updateUIForLoggedInUser - done');
}

function attachUserMenuHandlers() {
  chk('attachUserMenuHandlers - start');

  // clone nodes to remove prior event listeners and avoid duplicates
  function freshEl(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
  }

  const avatarBtn = freshEl('userAvatarBtn') || document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const viewProfileBtn = freshEl('viewProfileBtn') || document.getElementById('viewProfileBtn');
  const logoutBtn = freshEl('logoutBtn') || document.getElementById('logoutBtn');
  const adminPanelBtn = freshEl('adminPanelBtn') || document.getElementById('adminPanelBtn');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chk('avatarBtn clicked - toggling dropdown');
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
  } else {
    chk('attachUserMenuHandlers - avatarBtn or dropdown missing', { avatarBtn: !!avatarBtn, dropdown: !!dropdown });
  }

  if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', () => {
      chk('viewProfileBtn clicked');
      if (dropdown) dropdown.style.display = 'none';
      openProfileModal();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      chk('logoutBtn clicked');
      handleLogout(e);
    });
  }

  if (adminPanelBtn) {
    adminPanelBtn.addEventListener('click', () => {
      chk('adminPanelBtn clicked');
      if (dropdown) dropdown.style.display = 'none';
      window.location.href = 'admin.html';
    });
  }

  // close dropdown on outside click (idempotent)
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

  chk('attachUserMenuHandlers - end');
}

function updateUIForLoggedOutUser() {
  chk('updateUIForLoggedOutUser - start');
  const authRoot = document.getElementById('auth-controls');
  const modal = document.getElementById('modal');

  const signInHTML = `<button id="openModal" style="padding:8px 12px; border-radius:8px; background:transparent; border:1px solid #eee; cursor:pointer;">Sign in</button>`;

  if (authRoot) {
    authRoot.innerHTML = signInHTML;
  } else {
    // fallback: try to replace userMenuContainer or append
    const userMenu = document.getElementById('userMenuContainer');
    if (userMenu && userMenu.parentNode) {
      const wrapper = document.createElement('div');
      wrapper.id = 'auth-controls';
      userMenu.parentNode.insertBefore(wrapper, userMenu);
      wrapper.innerHTML = signInHTML;
      userMenu.remove();
    } else {
      const btn = document.createElement('div');
      btn.id = 'auth-controls';
      btn.innerHTML = signInHTML;
      document.body.insertBefore(btn, document.body.firstChild);
    }
  }

  const newOpenModalBtn = document.getElementById('openModal');
  if (newOpenModalBtn && modal) {
    newOpenModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      chk('openModal (logged out) clicked');
      modal.style.display = 'flex';
      modal.classList.add('open');
    });
  }
  chk('updateUIForLoggedOutUser - end');
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















