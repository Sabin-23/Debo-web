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
// FULL REWRITE: supabase auth + profile modal + profile table sync
// - Recreates auth modal if missing (so popup always works)
// - Pink avatar, compact & spaced dropdown UI
// - Saves phone to user_metadata and to "profiles" table (tries auth_id then id fallback)
// - No delete-account functionality
// - Copy-paste whole file to replace your old script
// ==========================================

// -------------------------------
// CONFIG
// -------------------------------
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;
let currentUserProfile = null;

// UI palette
const UI = {
  primaryPink: '#ff9db1',
  avatarPink: '#ff7da7',
  pinkSoft: '#fff0f3',
  danger: '#c62828',
  subtleGray: '#f6f3f4',
  success: '#2e7d32'
};

// Full country list (Rwanda first) - trimmed for readability; you can extend if needed
const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'US', code: '+1', label: 'United States' },
  { iso: 'GB', code: '+44', label: 'United Kingdom' },
  { iso: 'KE', code: '+254', label: 'Kenya' },
  { iso: 'UG', code: '+256', label: 'Uganda' },
  { iso: 'TZ', code: '+255', label: 'Tanzania' },
  { iso: 'ZA', code: '+27', label: 'South Africa' },
  // add more rows as needed...
];

// -------------------------------
// INIT
// -------------------------------
window.addEventListener('load', () => {
  initSupabaseClient();
  ensureAuthModalExists();    // if your HTML already has a modal, this will not duplicate it
  ensureProfileModalExists(); // same for profile modal
  setupAuthUIBindings();
  setupProfileModalBindings();
  checkAuthStatus();          // verify session and update UI
});

// -------------------------------
// Initialize supabase client
// -------------------------------
function initSupabaseClient() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library missing (window.supabase). Make sure supabase-js is loaded before this script.');
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized');
  // listen to auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('onAuthStateChange event:', event);
    if (event === 'SIGNED_IN') {
      currentUser = session.user;
      await handleSignedIn(session.user);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentUserProfile = null;
      applyLoggedOutUI();
    } else if (event === 'USER_UPDATED') {
      currentUser = session.user;
    }
  });
}

// -------------------------------
// UI: Ensure auth modal exists (injects a simple modal if not present)
// -------------------------------
function ensureAuthModalExists() {
  if (document.getElementById('modal')) return; // already present

  const modalHTML = `
  <div id="modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:9999; justify-content:center; align-items:center;">
    <div style="background:#fff; border-radius:12px; width:360px; max-width:92%; box-shadow:0 12px 40px rgba(0,0,0,0.2);">
      <div style="padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 id="form-title" style="margin:0; font-size:18px;">Sign In</h3>
          <button id="closeModal" aria-label="Close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666;">&times;</button>
        </div>

        <div class="auth-container" style="margin-top:12px;">
          <!-- Sign In Form -->
          <form id="signin-form" class="auth-form active" style="display:block;">
            <input placeholder="Email" required type="email" style="width:100%; padding:10px; margin-bottom:8px; border:1px solid #eee; border-radius:8px;">
            <input placeholder="Password" required type="password" style="width:100%; padding:10px; margin-bottom:12px; border:1px solid #eee; border-radius:8px;">
            <button type="submit" style="width:100%; padding:10px; background:${UI.primaryPink}; border:none; color:#fff; border-radius:8px; font-weight:700;">Sign In</button>
          </form>

          <!-- Register Form -->
          <form id="register-form" class="auth-form" style="display:none;">
            <input placeholder="Full name" required type="text" style="width:100%; padding:10px; margin-bottom:8px; border:1px solid #eee; border-radius:8px;">
            <input placeholder="Email" required type="email" style="width:100%; padding:10px; margin-bottom:8px; border:1px solid #eee; border-radius:8px;">
            <input placeholder="Password" required type="password" style="width:100%; padding:10px; margin-bottom:8px; border:1px solid #eee; border-radius:8px;">
            <input placeholder="Confirm password" required type="password" style="width:100%; padding:10px; margin-bottom:12px; border:1px solid #eee; border-radius:8px;">
            <button type="submit" style="width:100%; padding:10px; background:${UI.primaryPink}; border:none; color:#fff; border-radius:8px; font-weight:700;">Create account</button>
          </form>

          <p class="toggle-text" style="margin-top:10px; text-align:center; font-size:13px; color:#666;">Don't have an account? <span id="toggle" style="color:${UI.primaryPink}; cursor:pointer;">Register</span></p>
        </div>

      </div>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // ensure there is an openModal button somewhere — if not, add one to top right
  if (!document.getElementById('openModal')) {
    const btn = document.createElement('button');
    btn.id = 'openModal';
    btn.textContent = 'Sign in';
    btn.style.cssText = 'position:fixed; top:14px; right:16px; z-index:9998; padding:8px 12px; border-radius:8px; border:1px solid #eee; background:transparent; cursor:pointer;';
    document.body.appendChild(btn);
  }
}

// -------------------------------
// UI: Ensure profile modal exists (injects if missing)
// -------------------------------
function ensureProfileModalExists() {
  if (document.getElementById('userProfileModal')) return;

  const countryOptions = COUNTRY_LIST.map(c => `<option value="${c.code}" data-iso="${c.iso}">${c.iso} ${c.label} ${c.code}</option>`).join('\n');

  const modalHTML = `
  <div id="userProfileModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:10000; justify-content:center; align-items:center;">
    <div style="background:#fff; border-radius:12px; width:90%; max-width:760px; max-height:90vh; overflow:auto; box-shadow:0 12px 40px rgba(0,0,0,0.25);">
      <div style="padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="margin:0; color:#222; font-size:20px;">Account Settings</h2>
          <button id="closeProfileModal" style="background:none; border:none; font-size:26px; cursor:pointer; color:#666;">&times;</button>
        </div>

        <div style="display:flex; gap:16px; align-items:center; margin-bottom:18px;">
          <div id="userAvatar" style="width:64px; height:64px; border-radius:50%; background:${UI.avatarPink}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:26px; font-weight:700; box-shadow:0 6px 18px rgba(0,0,0,0.06);"></div>
          <div>
            <h3 id="userName" style="margin:0; color:#222; font-size:16px; font-weight:700;">Loading...</h3>
            <p id="userEmail" style="margin:4px 0 0 0; color:#666; font-size:13px;">Loading...</p>
          </div>
        </div>

        <div style="margin-bottom:14px; padding:12px; background:${UI.pinkSoft}; border-radius:8px;">
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

        <div style="margin-bottom:14px; padding:12px; background:#fff; border-radius:8px; border:1px solid #f2f2f2;">
          <h3 style="margin:0 0 10px 0; color:#222; font-size:15px;">Change Password</h3>
          <input type="password" id="currentPassword" placeholder="Current Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
          <input type="password" id="newPassword" placeholder="New Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
          <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:10px;">
          <button id="changePasswordBtn" style="width:100%; padding:10px; background:${UI.primaryPink}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Change Password</button>
          <p id="passwordMessage" style="margin:10px 0 0 0; font-size:13px;"></p>
        </div>

      </div>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // default to Rwanda
  const sel = document.getElementById('countryCodeSelect');
  if (sel) sel.value = '+250';
}

// -------------------------------
// Bindings for auth modal (open, close, toggle, forms)
// -------------------------------
function setupAuthUIBindings() {
  // open/close handlers
  const openBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('closeModal');

  if (openBtn && modal) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'flex';
      // default to sign-in view
      showSignInForm();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'none';
      clearModalMessage();
    });
  }

  // modal background click to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        clearModalMessage();
      }
    });
  }

  // toggle between forms
  const toggle = document.getElementById('toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      const signin = document.getElementById('signin-form');
      const register = document.getElementById('register-form');
      const title = document.getElementById('form-title');
      if (!signin || !register || !title) return;
      if (signin.style.display !== 'none') {
        signin.style.display = 'none';
        register.style.display = 'block';
        title.textContent = 'Register';
        toggle.textContent = 'Sign In';
      } else {
        register.style.display = 'none';
        signin.style.display = 'block';
        title.textContent = 'Sign In';
        toggle.textContent = 'Register';
      }
      clearModalMessage();
    });
  }

  // form submit handlers
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');

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
}

// -------------------------------
// Bindings for profile modal (buttons inside profile modal)
// -------------------------------
function setupProfileModalBindings() {
  // close handlers (modal created earlier)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'closeProfileModal') {
      closeProfileModal();
    }
  });

  // clicking outside modal
  const root = document.getElementById('userProfileModal');
  if (root) {
    root.addEventListener('click', (e) => {
      if (e.target === root) closeProfileModal();
    });
  }

  // handle update phone and change password via delegation (modal may be injected later)
  document.addEventListener('click', (e) => {
    if (!e.target) return;
    if (e.target.id === 'updatePhoneBtn') handleUpdatePhone();
    if (e.target.id === 'changePasswordBtn') handleChangePassword();
  });
}

// -------------------------------
// AUTH: sign in / register / logout
// -------------------------------
async function handleSignIn(email, password) {
  if (!supabase) return showModalMessage('Auth unavailable', 'error');
  if (!email || !password) return showModalMessage('Please fill in all fields', 'error');
  if (!isValidEmail(email)) return showModalMessage('Please enter a valid email', 'error');

  showModalMessage('Signing in...', 'info');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will handle post-signin profile creation & UI
    showModalMessage('Signed in', 'success');
    setTimeout(() => { const modal = document.getElementById('modal'); if (modal) modal.style.display = 'none'; clearModalMessage(); }, 800);
  } catch (err) {
    console.error('Sign in error:', err);
    showModalMessage(err.message || 'Sign in failed', 'error');
  }
}

async function handleRegister(name, email, password, confirm) {
  if (!supabase) return showModalMessage('Auth unavailable', 'error');
  if (!name || !email || !password || !confirm) return showModalMessage('Please fill all fields', 'error');
  if (!isValidEmail(email)) return showModalMessage('Invalid email', 'error');
  if (password.length < 6) return showModalMessage('Password must be at least 6 characters', 'error');
  if (password !== confirm) return showModalMessage('Passwords do not match', 'error');

  showModalMessage('Creating account...', 'info');
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) throw error;

    // If signup produced a session+user we create profile (auth state listener will also run)
    if (data?.user) {
      try { await ensureProfileExists(data.user, { full_name: name, email }); } catch (e) { console.warn(e); }
    }

    if (data.user && !data.session) {
      showModalMessage('Success — check your email to confirm', 'success');
    } else {
      showModalMessage('Registration successful', 'success');
      setTimeout(() => { const modal = document.getElementById('modal'); if (modal) modal.style.display = 'none'; clearModalMessage(); }, 900);
    }
  } catch (err) {
    console.error('Register error:', err);
    showModalMessage(err.message || 'Registration failed', 'error');
  }
}

async function handleLogout(e) {
  if (e) e.preventDefault();
  if (!supabase) { alert('Auth not available'); return; }
  try {
    await supabase.auth.signOut();
    // onAuthStateChange will applied logged out UI
  } catch (err) {
    console.error('Logout error:', err);
    alert('Error logging out');
  }
}

// -------------------------------
// AUTH FLOW helpers
// -------------------------------
async function checkAuthStatus() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('getSession error:', error);
      return;
    }
    const sessionUser = data?.session?.user;
    if (sessionUser) {
      currentUser = sessionUser;
      await handleSignedIn(sessionUser);
    } else {
      applyLoggedOutUI();
    }
  } catch (err) {
    console.error('checkAuthStatus error:', err);
  }
}

async function handleSignedIn(user) {
  try {
    currentUser = user;
    // ensure profile exists (preferred: auth_id; fallback: id)
    await ensureProfileExists(user, {
      full_name: user.user_metadata?.full_name || '',
      email: user.email || '',
      phone: user.user_metadata?.phone || ''
    });
    applyLoggedInUI(user);
  } catch (err) {
    console.error('handleSignedIn error:', err);
    showGlobalMessage('⚠️ Signed in but profile issues detected. See console.', 'warning');
  }
}

// -------------------------------
// Profiles table helpers: get/create/update (auth_id preferred)
// -------------------------------
async function getUserProfile(userId) {
  if (!supabase || !userId) return null;

  // Try by auth_id
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('auth_id', userId).limit(1);
    if (!error && Array.isArray(data) && data.length) return data[0];
    if (error && /column .*auth_id.* does not exist/i.test(error.message || '')) {
      // will fallback
    } else if (error) {
      console.warn('profiles select by auth_id error:', error);
    }
  } catch (err) {
    console.warn('profiles query by auth_id threw:', err);
  }

  // Fallback by id (if your profiles.id stores auth uuid)
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).limit(1);
    if (!error && Array.isArray(data) && data.length) return data[0];
    if (error) console.warn('profiles select by id error:', error);
  } catch (err) {
    console.warn('profiles query by id threw:', err);
  }

  return null;
}

async function ensureProfileExists(user, { full_name = '', email = '', phone = '' } = {}) {
  if (!supabase || !user) throw new Error('Invalid state for ensureProfileExists');

  // Check if existing
  const existing = await getUserProfile(user.id);
  if (existing) {
    currentUserProfile = existing;
    // update missing fields safely (don't touch is_admin)
    const updates = {};
    if (full_name && full_name !== existing.full_name) updates.full_name = full_name;
    if (email && email !== existing.email) updates.email = email;
    if (phone && phone !== existing.phone) updates.phone = phone;
    if (Object.keys(updates).length) {
      try {
        await updateProfileByAuthOrId(user.id, updates);
      } catch (err) {
        console.warn('Non-fatal profile update error:', err);
      }
    }
    return existing;
  }

  // If not exists, try insert with auth_id first
  const payload = {
    auth_id: user.id,
    full_name: full_name || user.user_metadata?.full_name || null,
    email: email || user.email || null,
    phone: phone || user.user_metadata?.phone || null
    // is_admin intentionally not set by client
  };

  // remove nulls so DB defaults apply
  Object.keys(payload).forEach(k => { if (payload[k] === null) delete payload[k]; });

  // try insert with auth_id
  try {
    const { data, error } = await supabase.from('profiles').insert([payload]).select().limit(1);
    if (error) {
      // if auth_id column absent, message usually includes 'auth_id'
      if (/column .*auth_id.* does not exist/i.test(error.message || '')) {
        throw { code: 'NO_AUTH_ID' };
      }
      throw error;
    }
    if (Array.isArray(data) && data.length) {
      currentUserProfile = data[0];
      console.log('Inserted profile (auth_id):', data[0]);
      return data[0];
    }
  } catch (err) {
    if (err && err.code === 'NO_AUTH_ID') {
      // fallback: insert using id = user.id (assuming your profiles.id = uuid)
      try {
        const fallback = {
          id: user.id,
          full_name: full_name || user.user_metadata?.full_name || null,
          email: email || user.email || null,
          phone: phone || user.user_metadata?.phone || null
        };
        Object.keys(fallback).forEach(k => { if (fallback[k] === null) delete fallback[k]; });
        const { data: fdata, error: ferr } = await supabase.from('profiles').insert([fallback]).select().limit(1);
        if (ferr) throw ferr;
        if (Array.isArray(fdata) && fdata.length) {
          currentUserProfile = fdata[0];
          console.log('Inserted profile (fallback id):', fdata[0]);
          return fdata[0];
        }
      } catch (ferr) {
        console.error('Fallback insert to profiles failed:', ferr);
        throw ferr;
      }
    } else {
      console.error('Insert into profiles failed:', err);
      throw err;
    }
  }

  throw new Error('Failed to create profile (unknown)');
}

async function updateProfileByAuthOrId(userId, updates = {}) {
  if (!supabase || !userId) throw new Error('Invalid state');

  // try update by auth_id
  try {
    const { error } = await supabase.from('profiles').update(updates).eq('auth_id', userId);
    if (!error) return true;
    if (!/column .*auth_id.* does not exist/i.test(error.message || '')) {
      console.warn('profiles update by auth_id returned error:', error);
      return false;
    }
  } catch (err) {
    console.warn('profiles update by auth_id threw:', err);
  }

  // fallback update by id
  try {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) {
      console.warn('profiles update by id error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('profiles update by id threw:', err);
    return false;
  }
}

// -------------------------------
// Phone update: updates both user_metadata (auth) and profiles table
// -------------------------------
async function handleUpdatePhone() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneInput = document.getElementById('phoneInput');
  const messageEl = document.getElementById('phoneMessage');
  if (!phoneInput || !messageEl) return;
  const raw = phoneInput.value.trim();
  if (!raw) return showMessage(messageEl, 'Please enter a phone number', 'error');

  // normalize
  let normalized = raw.replace(/\s|-/g, '');
  if (/^0+/.test(normalized)) normalized = normalized.replace(/^0+/, '');
  const countryCode = (countrySelect ? countrySelect.value : '+250') || '+250';
  if (!/^\+/.test(normalized)) normalized = countryCode + normalized;

  // Basic Rwanda validation if Rwanda selected
  if (countryCode === '+250') {
    if (!/^\+2507\d{8}$/.test(normalized)) return showMessage(messageEl, 'Enter a valid Rwanda number e.g. +2507xxxxxxxx', 'error');
  } else {
    if (!/^\+\d{5,15}$/.test(normalized)) return showMessage(messageEl, 'Enter a valid international phone number', 'error');
  }

  showMessage(messageEl, 'Saving phone...', 'info');

  try {
    // 1) Update profiles table (best-effort)
    const ok = await updateProfileByAuthOrId(currentUser.id, { phone: normalized, updated_at: new Date().toISOString() });
    if (!ok) console.warn('profiles update returned false');

    // 2) Update user_metadata (auth); this does not trigger SMS verification here
    const { data, error } = await supabase.auth.updateUser({ data: { phone: normalized } });
    if (error) {
      console.warn('auth.updateUser returned error (non-fatal):', error);
    } else if (data && data.user) {
      currentUser = data.user;
    }

    // Refresh local profile
    currentUserProfile = await getUserProfile(currentUser.id);
    showMessage(messageEl, 'Phone saved to profile', 'success');
  } catch (err) {
    console.error('handleUpdatePhone error:', err);
    showMessage(messageEl, err.message || 'Failed to save phone', 'error');
  }
}

// -------------------------------
// Change password (reauth by signInWithPassword first)
// -------------------------------
async function handleChangePassword() {
  const cp = document.getElementById('currentPassword');
  const np = document.getElementById('newPassword');
  const cf = document.getElementById('confirmNewPassword');
  const messageEl = document.getElementById('passwordMessage');
  if (!cp || !np || !cf || !messageEl) return;
  if (!cp.value || !np.value || !cf.value) return showMessage(messageEl, 'Please fill in all fields', 'error');
  if (np.value.length < 6) return showMessage(messageEl, 'New password must be at least 6 chars', 'error');
  if (np.value !== cf.value) return showMessage(messageEl, 'Passwords do not match', 'error');

  showMessage(messageEl, 'Changing password...', 'info');
  try {
    // verify current password by signing in
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: cp.value });
    if (signErr) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: np.value });
    if (error) throw error;

    showMessage(messageEl, 'Password changed', 'success');
    cp.value = np.value = cf.value = '';
  } catch (err) {
    console.error('Change password error:', err);
    showMessage(messageEl, err.message || 'Password change failed', 'error');
  }
}

// -------------------------------
// UI: apply logged-in / logged-out states
// -------------------------------
function applyLoggedInUI(user) {
  // if userMenu exists, replace it; else create it next to existing openModal button
  const openModalBtn = document.getElementById('openModal');
  const displayName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();

  const menuHTML = `
    <div id="userMenuContainer" style="position:relative; display:flex; align-items:center; gap:12px;">
      <button id="userAvatarBtn" aria-label="Open user menu" style="width:46px; height:46px; border-radius:50%; background:${UI.avatarPink}; color:#fff; border:none; cursor:pointer; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 18px rgba(0,0,0,0.08);">${initial}</button>
      <div id="userDropdown" style="display:none; position:absolute; top:60px; right:0; background:#fff; border-radius:12px; box-shadow:0 18px 40px rgba(0,0,0,0.12); min-width:240px; z-index:10001; overflow:visible;">
        <div style="padding:12px 14px; border-bottom:1px solid #f6f6f6;">
          <p style="margin:0; font-weight:700; color:#222;">${escapeHtml(displayName)}</p>
          <p style="margin:6px 0 0 0; font-size:13px; color:#666; word-break:break-all;">${escapeHtml(user.email || '')}</p>
        </div>
        <div style="padding:12px; display:flex; flex-direction:column; gap:8px;">
          <button id="viewProfileBtn" style="padding:10px 12px; border-radius:10px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; text-align:left;">👤 View Profile</button>
          <button id="logoutBtn" style="padding:10px 12px; border-radius:10px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; color:${UI.danger}; text-align:left;">🚪 Logout</button>
        </div>
      </div>
    </div>
  `;

  if (openModalBtn) {
    openModalBtn.outerHTML = menuHTML;
  } else {
    // append menu to body top-right
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed; top:12px; right:12px; z-index:9998;';
    container.innerHTML = menuHTML;
    document.body.appendChild(container);
  }

  // attach handlers
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(dropdown);
    });
  }
  if (viewProfileBtn) viewProfileBtn.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; openProfileModal(); });
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // close dropdown when click outside
  document.addEventListener('click', (ev) => {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatarBtn');
    if (!dd) return;
    if (ev.target !== dd && !dd.contains(ev.target) && ev.target !== av && !av.contains(ev.target)) {
      if (dd.style.display === 'block') {
        dd.style.opacity = '0'; dd.style.transform = 'translateY(-6px)';
        setTimeout(() => { dd.style.display = 'none'; dd.style.transition = ''; }, 140);
      }
    }
  });
}

function applyLoggedOutUI() {
  // Replace user menu with a Sign in button (openModal)
  const userMenu = document.getElementById('userMenuContainer');
  const existingOpen = document.getElementById('openModal');
  if (userMenu) {
    userMenu.outerHTML = '<button id="openModal" style="padding:8px 12px; border-radius:8px; background:transparent; border:1px solid #eee; cursor:pointer;">Sign in</button>';
  } else if (!existingOpen) {
    const btn = document.createElement('button');
    btn.id = 'openModal';
    btn.textContent = 'Sign in';
    btn.style.cssText = 'position:fixed; top:14px; right:16px; z-index:9998; padding:8px 12px; border-radius:8px; border:1px solid #eee; background:transparent; cursor:pointer;';
    document.body.appendChild(btn);
  }

  // rebind openModal to show modal
  const openBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  if (openBtn && modal) {
    openBtn.addEventListener('click', (e) => { e.preventDefault(); modal.style.display = 'flex'; });
  }
}

// -------------------------------
// Profile modal controls
// -------------------------------
function openProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return alert('Profile modal missing');
  if (!currentUser) return alert('Please sign in');
  modal.style.display = 'flex';
  loadProfileIntoModal();
}

function closeProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  modal.style.display = 'none';
  // clear messages
  const pm = document.getElementById('phoneMessage'); if (pm) pm.textContent = '';
  const pwd = document.getElementById('passwordMessage'); if (pwd) pwd.textContent = '';
}

async function loadProfileIntoModal() {
  if (!currentUser) return;
  // refresh profile
  currentUserProfile = await getUserProfile(currentUser.id);
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const phoneInput = document.getElementById('phoneInput');
  const countrySelect = document.getElementById('countryCodeSelect');

  const nameSource = currentUserProfile?.full_name || currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
  const initial = (nameSource || 'U').charAt(0).toUpperCase();

  if (avatarEl) avatarEl.textContent = initial;
  if (nameEl) nameEl.textContent = currentUserProfile?.full_name || nameSource;
  if (emailEl) emailEl.textContent = currentUser.email || '';

  // prefer phone from profiles, then metadata
  const phoneVal = currentUserProfile?.phone || currentUser.user_metadata?.phone || '';
  if (phoneVal && phoneInput) {
    const m = phoneVal.match(/^\+(\d{1,3})(.*)$/);
    if (m && countrySelect) {
      const code = '+' + m[1];
      const opt = Array.from(countrySelect.options).find(o => o.value === code);
      if (opt) countrySelect.value = code;
      phoneInput.value = m[2].replace(/^0+/, '');
    } else {
      if (countrySelect) countrySelect.value = '+250';
      phoneInput.value = phoneVal;
    }
  } else {
    if (countrySelect) countrySelect.value = '+250';
    if (phoneInput) phoneInput.value = '';
  }
}

// -------------------------------
// UI small helpers
// -------------------------------
function showModalMessage(text, type = 'info') {
  const modal = document.getElementById('modal');
  if (!modal) return;
  let msg = modal.querySelector('.auth-message');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'auth-message';
    msg.style.cssText = 'padding:10px; margin:8px 0; border-radius:8px; font-weight:700; text-align:center;';
    const container = modal.querySelector('.auth-container');
    if (container) container.insertAdjacentElement('afterbegin', msg);
    else modal.insertAdjacentElement('afterbegin', msg);
  }
  msg.textContent = text;
  msg.style.display = 'block';
  const colors = {
    error: { bg: '#ffecec', text: UI.danger, border: '#f2a1a1' },
    success: { bg: '#e8f5e9', text: UI.success, border: '#a8e0b5' },
    info: { bg: '#fff4f7', text: UI.primaryPink, border: '#ffd1dc' }
  };
  const c = colors[type] || colors.info;
  msg.style.backgroundColor = c.bg; msg.style.color = c.text; msg.style.border = '1px solid ' + c.border;
}

function clearModalMessage() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  const msg = modal.querySelector('.auth-message'); if (msg) msg.style.display = 'none';
}

function showGlobalMessage(text, type = 'info', timeout = 3500) {
  let el = document.getElementById('global-message');
  if (!el) {
    el = document.createElement('div'); el.id = 'global-message';
    el.style.cssText = 'position:fixed; top:20px; right:20px; z-index:20000; padding:12px 16px; border-radius:10px; font-weight:700; box-shadow:0 6px 22px rgba(0,0,0,0.12);';
    document.body.appendChild(el);
  }
  const colors = { error: '#ffecec', success: '#e8f5e9', info: '#fff4f7', warning: '#fff7e6' };
  const textColor = type === 'error' ? UI.danger : (type === 'success' ? UI.success : UI.primaryPink);
  el.style.backgroundColor = colors[type] || colors.info;
  el.style.color = textColor;
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, timeout);
}

function showMessage(el, text, type = 'info') {
  if (!el) return;
  el.style.display = 'block';
  el.textContent = text;
  el.style.color = (type === 'error' ? UI.danger : (type === 'success' ? UI.success : UI.primaryPink));
}

// toggle dropdown with small animation
function toggleDropdown(dd) {
  if (!dd) return;
  if (dd.style.display === 'block') {
    dd.style.opacity = '0'; dd.style.transform = 'translateY(-6px)'; setTimeout(() => { dd.style.display = 'none'; }, 140);
  } else {
    dd.style.display = 'block'; dd.style.opacity = '0'; dd.style.transform = 'translateY(-6px)';
    setTimeout(() => { dd.style.transition = 'opacity 160ms ease, transform 160ms ease'; dd.style.opacity = '1'; dd.style.transform = 'translateY(0)'; }, 8);
  }
}

// safe escape for simple HTML injection
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// -------------------------------
// Small utility: when user signs in create/load profile and update UI
// -------------------------------
async function ensureProfileExists(user, meta = {}) {
  // wrapper calling underlying function and catching/logging errors
  try {
    return await (async function _ensure() {
      return await ensureProfileExistsInternal(user, meta);
    })();
  } catch (err) {
    console.error('ensureProfileExists wrapper error:', err);
    throw err;
  }
}

async function ensureProfileExistsInternal(user, { full_name = '', email = '', phone = '' } = {}) {
  // This function replicates the logic in getUserProfile/createUserProfile combined
  const existing = await getUserProfile(user.id);
  if (existing) {
    currentUserProfile = existing;
    // attempt to update any missing fields
    const updates = {};
    if (full_name && full_name !== existing.full_name) updates.full_name = full_name;
    if (email && email !== existing.email) updates.email = email;
    if (phone && phone !== existing.phone) updates.phone = phone;
    if (Object.keys(updates).length) await updateProfileByAuthOrId(user.id, updates);
    return existing;
  }

  // not existing -> create
  return await createProfileForUser(user, { full_name, email, phone });
}

async function createProfileForUser(user, { full_name = '', email = '', phone = '' } = {}) {
  if (!supabase) throw new Error('Supabase not initialized');

  // prepare payload
  const payload = {
    auth_id: user.id,
    full_name: full_name || user.user_metadata?.full_name || null,
    email: email || user.email || null,
    phone: phone || user.user_metadata?.phone || null
  };
  Object.keys(payload).forEach(k => { if (payload[k] === null) delete payload[k]; });

  // try insert using auth_id
  try {
    const { data, error } = await supabase.from('profiles').insert([payload]).select().limit(1);
    if (error) {
      if (/column .*auth_id.* does not exist/i.test(error.message || '')) {
        // fallback to id insert
        const fallback = {
          id: user.id,
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone
        };
        Object.keys(fallback).forEach(k => { if (fallback[k] === undefined) delete fallback[k]; });
        const { data: fdata, error: ferr } = await supabase.from('profiles').insert([fallback]).select().limit(1);
        if (ferr) throw ferr;
        currentUserProfile = fdata && fdata[0] ? fdata[0] : null;
        return currentUserProfile;
      } else {
        throw error;
      }
    }
    currentUserProfile = data && data[0] ? data[0] : null;
    return currentUserProfile;
  } catch (err) {
    console.error('createProfileForUser error:', err);
    throw err;
  }
}

// -------------------------------
// End of main script
// -------------------------------



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
