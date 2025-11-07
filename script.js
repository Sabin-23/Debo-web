// ==============================
// AUTH + PROFILE + SETTINGS (NO CART)
// Paste this to replace the corrupted auth/profile part in script.js
// ==============================

const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

// Robust supabase client getter
function ensureSupabaseClient() {
  if (window.__supabase_client && typeof window.__supabase_client.from === 'function') {
    window.supabase = window.__supabase_client;
    return window.__supabase_client;
  }

  if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    try {
      window.__supabase_client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.supabase = window.__supabase_client;
      return window.__supabase_client;
    } catch (e) {
      console.warn('Failed creating supabase client from library:', e);
    }
  }

  if (typeof window.supabase !== 'undefined' && typeof window.supabase.from === 'function') {
    window.__supabase_client = window.supabase;
    return window.__supabase_client;
  }

  return null;
}

// Prevent sign-out flicker - check session immediately
(function() {
  try {
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
      const tempSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      tempSupabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          const openModalBtn = document.getElementById('openModal');
          if (openModalBtn) openModalBtn.style.display = 'none';
        }
      }).catch(()=>{});
    }
  } catch(e){ /* ignore */ }
})();

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

const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'KE', code: '+254', label: 'Kenya' },
  { iso: 'UG', code: '+256', label: 'Uganda' },
  { iso: 'TZ', code: '+255', label: 'Tanzania' },
  { iso: 'BI', code: '+257', label: 'Burundi' },
  { iso: 'SS', code: '+211', label: 'South Sudan' },
  { iso: 'ET', code: '+251', label: 'Ethiopia' },
  { iso: 'SO', code: '+252', label: 'Somalia' },
  { iso: 'DJ', code: '+253', label: 'Djibouti' },
  { iso: 'ER', code: '+291', label: 'Eritrea' }
];

// ---------------------------
// Initialization
// ---------------------------
window.addEventListener('load', function() {
  // ensure we have a usable client object
  ensureSupabaseClient();
  initializeSupabase();
  setupAuth();
});

function initializeSupabase() {
  try {
    // If we have a library, create client; if ensureSupabaseClient already created it, use that
    if (!window.__supabase_client && typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.__supabase_client = supabase;
      window.supabase = supabase;
    } else {
      supabase = ensureSupabaseClient();
    }

    if (!supabase) {
      console.error('Supabase init failed: library not available');
      return;
    }

    setupAuthStateListener();
    checkAuthStatus();
  } catch (error) {
    console.error('Supabase init failed:', error);
  }
}

// ---------------------------
// Auth state management
// ---------------------------
function setupAuthStateListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && !isProcessingAuth) {
      isProcessingAuth = true;
      currentUser = session.user;

      // small delay to let UI stabilize if needed
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        currentUserProfile = await getUserProfile(currentUser.id);
        if (!currentUserProfile) {
          currentUserProfile = await createUserProfile(currentUser.id);
        }

        if (currentUserProfile?.is_admin === true) {
          showMessage('Welcome Admin! Redirecting...', 'success');
          setTimeout(() => window.location.href = 'admin.html', 900);
          return;
        }

        updateUIForLoggedInUser(currentUser);
        await syncTempCartToDatabase?.(); // safe no-op if cart isn't present
      } catch (err) {
        console.error('Sign-in listener error', err);
        showMessage('Sign in error', 'error');
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
      // cart updates handled elsewhere (no cart code here)
    }
  });
}

async function checkAuthStatus() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('getSession error', error);
      updateUIForLoggedOutUser();
      return;
    }
    const user = data?.session?.user || null;
    if (user) {
      currentUser = user;
      currentUserProfile = await getUserProfile(currentUser.id);
      if (!currentUserProfile) {
        currentUserProfile = await createUserProfile(currentUser.id);
      }
      updateUIForLoggedInUser(currentUser);
      await syncTempCartToDatabase?.();
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (err) {
    console.error('checkAuthStatus error', err);
    updateUIForLoggedOutUser();
  }
}

// ---------------------------
// Profile management
// ---------------------------
async function getUserProfile(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('getUserProfile error', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('getUserProfile exception', err);
    return null;
  }
}

async function createUserProfile(userId) {
  if (!supabase || !currentUser) return null;
  try {
    const profileData = {
      id: userId,
      email: currentUser.email,
      full_name: currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : ''),
      phone: null,
      is_admin: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      // unique constraint might already exist — fetch it
      if (error.code === '23505') return await getUserProfile(userId);
      console.warn('createUserProfile error', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('createUserProfile exception', err);
    return null;
  }
}

// ---------------------------
// Auth UI setup
// ---------------------------
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
      const email = inputs[0]?.value?.trim();
      const password = inputs[1]?.value;
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
      const name = inputs[0]?.value?.trim();
      const email = inputs[1]?.value?.trim();
      const password = inputs[2]?.value;
      const confirmPassword = inputs[3]?.value;
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
      if (formTitle) formTitle.textContent = "Create Account";
      if (toggleText) toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
    } else {
      registerForm.classList.remove("active");
      signinForm.classList.add("active");
      if (formTitle) formTitle.textContent = "Sign In";
      if (toggleText) toggleText.innerHTML = 'Don\'t have an account? <span id="toggle">Register</span>';
    }
    const innerToggle = document.getElementById("toggle");
    if (innerToggle) innerToggle.addEventListener("click", switchForms);
  }

  const toggle = document.getElementById("toggle");
  if (toggle) toggle.addEventListener("click", switchForms);
}

function setupModalHandlers() {
  const openBtn = document.getElementById("openModal");
  const closeBtn = document.getElementById("closeModal");
  const modal = document.getElementById("modal");

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      modal.classList.add('open');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      modal.classList.remove('open');
    });
  }

  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
      }
    });
  }
}

// ---------------------------
// Auth handlers
// ---------------------------
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

    if (data?.user && !data?.session) {
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
  if (e && e.preventDefault) e.preventDefault();
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
  } catch (err) {
    alert('Error: ' + (err?.message || 'Unable to send reset link'));
  }
}

async function handleLogout(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!confirm('Are you sure you want to sign out?')) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    alert('Error: ' + (err?.message || 'Logout failed'));
  }
}

// ---------------------------
// Profile settings modal & handlers
// ---------------------------
function openProfileSettings() {
  if (!currentUser) {
    alert('Please sign in first');
    return;
  }

  if (document.getElementById('settingsModal')) {
    document.getElementById('settingsModal').style.display = 'flex';
    loadProfileData();
    return;
  }

  const countryOptions = COUNTRY_LIST.map(c =>
    `<option value="${c.code}">${c.iso} ${c.code} - ${c.label}</option>`
  ).join('');

  const modalHTML = `
    <div id="settingsModal" style="display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;justify-content:center;align-items:center;">
      <div style="background:#fff;border-radius:12px;width:90%;max-width:600px;max-height:90vh;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,0.25);">
        <div style="padding:20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
          <h2 style="margin:0;color:#222;font-size:20px;">Account Settings</h2>
          <button id="closeSettingsModal" style="background:none;border:none;font-size:28px;cursor:pointer;color:#666;">&times;</button>
        </div>
        
        <div style="padding:20px;">
          <!-- Full Name -->
          <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:8px;font-weight:600;color:#333;">Full Name</label>
            <input type="text" id="settingsName" placeholder="Your name" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
            <button id="updateNameBtn" style="margin-top:8px;padding:8px 16px;background:${UI.primaryPink};color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Update Name</button>
            <p id="nameMsg" style="margin:8px 0 0 0;font-size:13px;"></p>
          </div>

          <!-- Email -->
          <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:8px;font-weight:600;color:#333;">Email</label>
            <input type="email" id="settingsEmail" placeholder="your@email.com" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
            <button id="updateEmailBtn" style="margin-top:8px;padding:8px 16px;background:${UI.primaryPink};color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Update Email</button>
            <p id="emailMsg" style="margin:8px 0 0 0;font-size:13px;"></p>
          </div>

          <!-- Phone -->
          <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:8px;font-weight:600;color:#333;">Phone Number</label>
            <div style="display:flex;gap:8px;">
              <select id="settingsCountryCode" style="padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
                ${countryOptions}
              </select>
              <input type="tel" id="settingsPhone" placeholder="7XXXXXXXX" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
            </div>
            <button id="updatePhoneBtn" style="margin-top:8px;padding:8px 16px;background:${UI.primaryPink};color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Update Phone</button>
            <p id="phoneMsg" style="margin:8px 0 0 0;font-size:13px;"></p>
          </div>

          <!-- Change Password -->
          <div style="margin-bottom:20px;padding:16px;background:${UI.pinkSoft};border-radius:8px;">
            <h3 style="margin:0 0 12px 0;color:#222;font-size:16px;">Change Password</h3>
            <input type="password" id="currentPassword" placeholder="Current password" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;" />
            <input type="password" id="newPassword" placeholder="New password (min 6 chars)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;" />
            <input type="password" id="confirmNewPassword" placeholder="Confirm new password" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;font-size:14px;" />
            <button id="changePasswordBtn" style="width:100%;padding:10px;background:${UI.danger};color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Change Password</button>
            <p id="passwordMsg" style="margin:8px 0 0 0;font-size:13px;"></p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('closeSettingsModal').addEventListener('click', closeProfileSettings);
  document.getElementById('updateNameBtn').addEventListener('click', handleUpdateName);
  document.getElementById('updateEmailBtn').addEventListener('click', handleUpdateEmail);
  document.getElementById('updatePhoneBtn').addEventListener('click', handleUpdatePhone);
  document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);

  loadProfileData();
}

function closeProfileSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.style.display = 'none';
}

function loadProfileData() {
  if (!currentUser) return;

  const nameInput = document.getElementById('settingsName');
  const emailInput = document.getElementById('settingsEmail');
  const phoneInput = document.getElementById('settingsPhone');
  const countrySelect = document.getElementById('settingsCountryCode');

  if (nameInput) nameInput.value = currentUser.user_metadata?.full_name || '';
  if (emailInput) emailInput.value = currentUser.email || '';

  if (currentUserProfile?.phone && phoneInput && countrySelect) {
    const match = currentUserProfile.phone.match(/^\+(\d{1,3})(.*)$/);
    if (match) {
      const code = '+' + match[1];
      countrySelect.value = code;
      phoneInput.value = match[2].replace(/^0+/, '');
    }
  } else if (countrySelect) {
    countrySelect.value = '+250';
  }
}

async function handleUpdateName() {
  const nameInput = document.getElementById('settingsName');
  const msg = document.getElementById('nameMsg');
  const name = (nameInput?.value || '').trim();

  if (!name) {
    if (msg) { msg.textContent = 'Name cannot be empty'; msg.style.color = UI.danger; }
    return;
  }

  if (msg) { msg.textContent = 'Updating...'; msg.style.color = ''; }

  try {
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);

    if (profileError) throw profileError;

    const { data } = await supabase.auth.getSession();
    currentUser = data?.session?.user || currentUser;
    currentUserProfile = await getUserProfile(currentUser.id);

    if (msg) { msg.textContent = 'Name updated successfully'; msg.style.color = UI.success; setTimeout(() => msg.textContent = '', 3000); }
  } catch (error) {
    console.error('Update name error:', error);
    if (msg) { msg.textContent = error.message || 'Failed to update name'; msg.style.color = UI.danger; }
  }
}

async function handleUpdateEmail() {
  const emailInput = document.getElementById('settingsEmail');
  const msg = document.getElementById('emailMsg');
  const email = (emailInput?.value || '').trim();

  if (!isValidEmail(email)) {
    if (msg) { msg.textContent = 'Enter a valid email'; msg.style.color = UI.danger; }
    return;
  }

  if (msg) { msg.textContent = 'Updating...'; msg.style.color = ''; }

  try {
    const { error: authError } = await supabase.auth.updateUser({ email });
    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);

    if (profileError) throw profileError;

    const { data } = await supabase.auth.getSession();
    currentUser = data?.session?.user || currentUser;
    currentUserProfile = await getUserProfile(currentUser.id);

    if (msg) { msg.textContent = 'Email updated (check your inbox for confirmation)'; msg.style.color = UI.success; setTimeout(() => msg.textContent = '', 4000); }
  } catch (error) {
    console.error('Update email error:', error);
    if (msg) { msg.textContent = error.message || 'Failed to update email'; msg.style.color = UI.danger; }
  }
}

async function handleUpdatePhone() {
  const phoneInput = document.getElementById('settingsPhone');
  const countrySelect = document.getElementById('settingsCountryCode');
  const msg = document.getElementById('phoneMsg');

  const phoneRaw = (phoneInput?.value || '').trim();
  const countryCode = (countrySelect?.value) || '+250';

  if (!phoneRaw) {
    if (msg) { msg.textContent = 'Enter a phone number'; msg.style.color = UI.danger; }
    return;
  }

  let normalized = phoneRaw.replace(/\s|-/g, '');
  if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
  if (!/^\+/.test(normalized)) normalized = countryCode + normalized;

  if (!/^\+\d{10,15}$/.test(normalized)) {
    if (msg) { msg.textContent = 'Enter a valid phone number'; msg.style.color = UI.danger; }
    return;
  }

  if (msg) { msg.textContent = 'Updating...'; msg.style.color = ''; }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ phone: normalized, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);

    if (error) throw error;

    currentUserProfile = await getUserProfile(currentUser.id);

    if (msg) { msg.textContent = 'Phone updated successfully'; msg.style.color = UI.success; setTimeout(() => msg.textContent = '', 3000); }
  } catch (error) {
    console.error('Update phone error:', error);
    if (msg) { msg.textContent = error.message || 'Failed to update phone'; msg.style.color = UI.danger; }
  }
}

async function handleChangePassword() {
  const currentPwd = document.getElementById('currentPassword')?.value;
  const newPwd = document.getElementById('newPassword')?.value;
  const confirmPwd = document.getElementById('confirmNewPassword')?.value;
  const msg = document.getElementById('passwordMsg');

  if (!currentPwd || !newPwd || !confirmPwd) {
    if (msg) { msg.textContent = 'Fill all password fields'; msg.style.color = UI.danger; }
    return;
  }

  if (newPwd.length < 6) {
    if (msg) { msg.textContent = 'New password must be at least 6 characters'; msg.style.color = UI.danger; }
    return;
  }

  if (newPwd !== confirmPwd) {
    if (msg) { msg.textContent = 'New passwords do not match'; msg.style.color = UI.danger; }
    return;
  }

  if (msg) { msg.textContent = 'Changing password...'; msg.style.color = ''; }

  try {
    // Re-authenticate by signing in with existing credentials (rare pattern, but matches previous code)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPwd
    });
    if (signInError) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) throw error;

    if (msg) { msg.textContent = 'Password changed successfully'; msg.style.color = UI.success; }
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
    setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
  } catch (error) {
    console.error('Change password error:', error);
    if (msg) { msg.textContent = error.message || 'Password change failed'; msg.style.color = UI.danger; }
  }
}

// ---------------------------
// UI update functions
// ---------------------------
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
            <span style="color:#333;text-align:left;">Settings</span>
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
      if (!dropdown) return;
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

  if (adminPanelBtn) adminPanelBtn.addEventListener('click', function() { if (dropdown) dropdown.style.display = 'none'; window.location.href = 'admin.html'; });
  if (viewProfileBtn) viewProfileBtn.addEventListener('click', function() { if (dropdown) dropdown.style.display = 'none'; openProfileSettings(); });
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

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

  userMenu.outerHTML = '<button id="openModal">Sign-in/Register</button>';

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

// ---------------------------
// Messages
// ---------------------------
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
  setTimeout(() => { msg.style.display = 'none'; }, duration);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------
// Expose a few utilities globally (used by other pages)
// ---------------------------
window.openProfileSettings = openProfileSettings;
window.handleLogout = handleLogout;
window.ensureSupabaseClient = ensureSupabaseClient;
window.getUserProfile = getUserProfile;
window.createUserProfile = createUserProfile;


// ==============================================
// 3. CART STORAGE HELPERS
// ==============================================

// Temp cart for non-logged-in users
function getTempCart() {
  try {
    const cart = localStorage.getItem('God's Only Store_temp_cart');
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error('Error reading temp cart:', error);
    return [];
  }
}

function saveTempCart(cart) {
  try {
    localStorage.setItem('God's Only Store_temp_cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving temp cart:', error);
  }
}

function clearTempCart() {
  localStorage.removeItem('God's Only Store_temp_cart');
}

// ==============================================
// 4. CART OPERATIONS
// ==============================================




async function clearCart() {
  if (currentUser && supabase) {
    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  } else {
    clearTempCart();
  }
  
  await loadCart();
  updateCartBadge();
  showMessage('Cart cleared', 'success');
}



// ==============================================
// 5. CART UI
// ==============================================

function initializeCartUI() {
  const cartToggleBtns = document.querySelectorAll('#cart-toggle-desktop, #cart-toggle-mobile');
  const cartClose = document.getElementById('cart-close');
  const backdrop = document.getElementById('cart-backdrop');
  const checkoutBtn = document.getElementById('checkout');
  const clearCartBtn = document.getElementById('clear-cart');
  
  // Open cart
  cartToggleBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
      });
    }
  });
  
  // Close cart
  if (cartClose) {
    cartClose.addEventListener('click', closeCart);
  }
  
  if (backdrop) {
    backdrop.addEventListener('click', closeCart);
  }
  
  // Checkout button
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }
  
  // Clear cart button (NO CONFIRMATION)
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await clearCart();
    });
  }
  
  // Initial load
  loadCart();
  updateCartBadge();
}

function openCart() {
  const panel = document.getElementById('cart-panel');
  const backdrop = document.getElementById('cart-backdrop');
  
  if (panel) panel.classList.add('open');
  if (backdrop) backdrop.hidden = false;
  
  loadCart();
}

function closeCart() {
  const panel = document.getElementById('cart-panel');
  const backdrop = document.getElementById('cart-backdrop');
  
  if (panel) panel.classList.remove('open');
  if (backdrop) backdrop.hidden = true;
}

// ---- Replace addToCart (guest branch now normalizes IDs) ----
async function addToCart(productId, quantity = 1) {
  const pid = String(productId);
  if (currentUser && supabase) {
    // Logged in branch unchanged (keeps using DB)
    try {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: (existing.quantity || 0) + Number(quantity) })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cart_items')
          .insert([{
            user_id: currentUser.id,
            product_id: productId,
            quantity: Number(quantity),
            added_at: new Date().toISOString()
          }]);
      }
    } catch (error) {
      console.error('Error adding to cart (DB):', error);
      showMessage('Failed to add to cart', 'error');
      return;
    }
  } else {
    // Guest: store product_id as STRING for consistent matching
    const cart = getTempCart();
    const existingItem = cart.find(item => String(item.product_id) === pid);

    if (existingItem) {
      existingItem.quantity = Number(existingItem.quantity || 0) + Number(quantity);
    } else {
      cart.push({ product_id: pid, quantity: Number(quantity) });
    }

    saveTempCart(cart);
  }

  await loadCart();
  updateCartBadge();
  showMessage('Added to cart!', 'success');
}

// ---- Replace updateCartItemQuantity ----
async function updateCartItemQuantity(productId, newQuantity) {
  const pid = String(productId);
  if (newQuantity < 1) {
    await removeFromCart(productId);
    return;
  }

  if (currentUser && supabase) {
    try {
      await supabase
        .from('cart_items')
        .update({ quantity: Number(newQuantity) })
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);
    } catch (error) {
      console.error('Error updating quantity (DB):', error);
    }
  } else {
    const cart = getTempCart();
    const item = cart.find(i => String(i.product_id) === pid);
    if (item) {
      item.quantity = Number(newQuantity);
      saveTempCart(cart);
    }
  }

  await loadCart();
  updateCartBadge();
}

// ---- Replace removeFromCart ----
async function removeFromCart(productId) {
  const pid = String(productId);
  if (currentUser && supabase) {
    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);
    } catch (error) {
      console.error('Error removing from cart (DB):', error);
    }
  } else {
    const cart = getTempCart().filter(item => String(item.product_id) !== pid);
    saveTempCart(cart);
  }

  await loadCart();
  updateCartBadge();
  showMessage('Removed from cart', 'success');
}

// ---- Replace syncTempCartToDatabase (string/number-safe merge) ----
async function syncTempCartToDatabase() {
  if (!currentUser || !supabase) return;

  const tempCart = getTempCart();
  if (!Array.isArray(tempCart) || tempCart.length === 0) {
    await loadCart();
    return;
  }

  try {
    const { data: existingItems = [] } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', currentUser.id);

    for (const tmp of tempCart) {
      const tmpPidStr = String(tmp.product_id);
      const tmpQty = Number(tmp.quantity || 0);
      const existing = existingItems.find(e => String(e.product_id) === tmpPidStr);

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: (existing.quantity || 0) + tmpQty })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cart_items')
          .insert([{
            user_id: currentUser.id,
            product_id: tmpPidStr,
            quantity: tmpQty,
            added_at: new Date().toISOString()
          }]);
      }
    }

    clearTempCart();
    await loadCart();
    updateCartBadge();
  } catch (error) {
    console.error('Error syncing temp cart:', error);
  }
}

// ---- Replace loadCart (robust id handling & product fetch) ----
async function loadCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  const subtotalEl = document.getElementById('cart-subtotal');

  if (!cartItemsContainer) return;

  let cartItems = [];

  // get cart items
  if (currentUser && supabase) {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', currentUser.id);
      if (!error && Array.isArray(data)) cartItems = data;
    } catch (err) {
      console.error('Error reading DB cart in loadCart:', err);
    }
  } else {
    cartItems = getTempCart();
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    cartItemsContainer.innerHTML = `
      <div style="padding:40px 20px;text-align:center;color:#666;">
        <i class="fas fa-shopping-cart" style="font-size:48px;color:#ddd;margin-bottom:16px;"></i>
        <p style="font-size:16px;">Your cart is empty.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = 'RWF 0';
    return;
  }

  // Build numeric productIds for query (deduped)
  const productIds = Array.from(new Set(cartItems.map(i => {
    const val = i.product_id;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }).filter(x => x !== null)));

  // If no valid numeric IDs, render fallback (guest items might be strings; still try fetching by strings)
  try {
    let products = [];
    if (productIds.length > 0) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);
      products = Array.isArray(data) ? data : [];
    }

    // if product list is empty but we have cartItems (maybe IDs are strings), do a fallback fetch per-id
    if (products.length === 0) {
      // attempt to fetch by filtering string ids individually (safe, small sets)
      const fetched = [];
      for (const it of cartItems) {
        const pid = String(it.product_id);
        // try numeric first
        const numeric = Number(pid);
        let qRes = null;
        if (!Number.isNaN(numeric)) {
          const { data } = await supabase.from('products').select('*').eq('id', numeric).maybeSingle();
          if (data) { fetched.push(data); continue; }
        }
        // try by string equality on some string id field (unlikely) - skip
      }
      products = fetched;
    }

    // render
    let subtotal = 0;
    const cartHTML = cartItems.map(item => {
      // match by normalized string
      const product = (products || []).find(p => String(p.id) === String(item.product_id));
      if (!product) return ''; // can't match this product row — skip (keeps container non-empty)
      const qty = Number(item.quantity || 0);
      const itemTotal = Number(product.price || 0) * qty;
      subtotal += itemTotal;

      return `
        <div class="cart-item" data-product-id="${product.id}" style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #eee;align-items:center;">
          <img src="${product.image_url || 'https://via.placeholder.com/80'}" alt="${product.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">
          <div style="flex:1;padding:0 12px;">
            <h5 style="margin:0 0 4px;font-size:14px;">${product.name}</h5>
            <p style="margin:0;color:#666;font-size:13px;">RWF ${product.price}</p>
            <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
              <button class="qty-btn decrease" onclick="changeQuantity('${product.id}', -1)" style="width:28px;height:28px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;">−</button>
              <input type="number" value="${qty}" min="1" onchange="setQuantity('${product.id}', this.value)" style="width:50px;text-align:center;padding:4px;border:1px solid #ddd;border-radius:4px;">
              <button class="qty-btn increase" onclick="changeQuantity('${product.id}', 1)" style="width:28px;height:28px;border:1px solid #ddd;background:#fff;border-radius:4px;cursor:pointer;">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 8px;font-weight:700;">RWF ${itemTotal}</p>
            <button onclick="removeItem('${product.id}')" style="padding:6px 12px;background:#ff9db1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    cartItemsContainer.innerHTML = cartHTML || `
      <div style="padding:20px;text-align:center;color:#666;">
        <p style="margin:0;">Some items in your cart couldn't be displayed (missing product data).</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = `RWF ${subtotal}`;

  } catch (error) {
    console.error('Error rendering cart (loadCart):', error);
    cartItemsContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Error loading cart</div>';
    if (subtotalEl) subtotalEl.textContent = 'RWF 0';
  }
}

// ---- Replace updateCartBadge (simple normalization) ----
async function updateCartBadge() {
  const badges = document.querySelectorAll('#cart-badge');
  let totalItems = 0;

  if (currentUser && supabase) {
    try {
      const { data } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', currentUser.id);
      if (Array.isArray(data)) totalItems = data.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    } catch (error) {
      console.error('Error updating badge (DB):', error);
    }
  } else {
    const cart = getTempCart();
    if (Array.isArray(cart)) totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  badges.forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  });
}





async function handleCheckout() {
  if (!currentUser) {
    // Show login modal for unsigned users
    const modal = document.getElementById('modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open');
    }
    showMessage('Please sign in to checkout', 'info');
  } else {
    // Redirect to checkout for signed in users
    window.location.href = 'checkout.html';
  }
}

// ==============================================
// 6. GLOBAL FUNCTIONS (called from HTML)
// ==============================================

window.changeQuantity = async function(productId, change) {
  let currentQty = 0;
  
  if (currentUser && supabase) {
    const { data } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', currentUser.id)
      .eq('product_id', productId)
      .single();
    currentQty = data?.quantity || 0;
  } else {
    const cart = getTempCart();
    const item = cart.find(i => i.product_id === productId);
    currentQty = item?.quantity || 0;
  }
  
  const newQty = Math.max(1, currentQty + change);
  await updateCartItemQuantity(productId, newQty);
};

window.setQuantity = async function(productId, value) {
  const newQty = Math.max(1, parseInt(value) || 1);
  await updateCartItemQuantity(productId, newQty);
};

window.removeItem = async function(productId) {
  await removeFromCart(productId);
};

window.addToCart = addToCart;

// ==============================================
// 7. UTILITIES
// ==============================================

function showMessage(text, type = 'info') {
  let msg = document.getElementById('global-message');
  
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'global-message';
    msg.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;font-weight:700;z-index:10001;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    document.body.appendChild(msg);
  }
  
  const colors = {
    error: { bg: '#ffecec', text: '#c62828' },
    success: { bg: '#e8f5e9', text: '#2e7d32' },
    info: { bg: '#fff4f7', text: '#ff9db1' }
  };
  
  const color = colors[type] || colors.info;
  msg.style.backgroundColor = color.bg;
  msg.style.color = color.text;
  msg.textContent = text;
  msg.style.display = 'block';
  
  setTimeout(() => {
    msg.style.display = 'none';
  }, 3000);
}

function setupMobileMenu() {
  const bar = document.getElementById('bar');
  const close = document.getElementById('close');
  const nav = document.getElementById('navbar');
  
  if (bar && nav) {
    bar.addEventListener('click', () => nav.classList.add('active'));
  }
  
  if (close && nav) {
    close.addEventListener('click', () => nav.classList.remove('active'));
  }
}

// ---------------------------
// App initializer (fixes missing initializeApp error)
// ---------------------------
function initializeApp() {
  // guard so we don't double-init if called twice
  if (initializeApp._ran) return;
  initializeApp._ran = true;

  try {
    // Ensure supabase client exists
    ensureSupabaseClient();

    // Initialize core pieces (these are defined above in your script)
    try { initializeSupabase(); } catch(e){ console.warn('initializeSupabase() failed or already ran:', e); }
    try { setupAuth(); } catch(e){ console.warn('setupAuth() failed or already ran:', e); }

    // Mobile menu handlers
    try { setupMobileMenu(); } catch(e){ /* non-fatal */ }

    // If cart UI exists in this script, initialize it (safe noop if not present)
    if (typeof initializeCartUI === 'function') {
      try { initializeCartUI(); } catch(e){ console.warn('initializeCartUI failed:', e); }
    }
    // ensure UI reflects current cart when app starts
    setTimeout(() => { try { refreshProductInCartStates(); } catch(e){} }, 250);


    // Keep product pages happy: expose window.supabase once ready (already done in initializeSupabase,
    // but this makes sure any waiting code can see it)
    if (!window.supabase) {
      try { ensureSupabaseClient(); } catch(e){/*ignore*/ }
    }
  } catch (err) {
    console.error('initializeApp fatal error:', err);
  }
}

// Also call initializeApp on load if your existing code expects it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Fallback: if app didn't init for some reason, try on window.load (keeps previous behavior)
window.addEventListener('load', () => {
  if (!initializeApp._ran) initializeApp();
});


// ==============================================
// 8. START THE APP
// ==============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Also run on page load as fallback
window.addEventListener('load', () => {
  if (!supabase) initializeApp();
});

// ---------------------------
// Utility: refresh product card icons based on current cart
// ---------------------------
async function refreshProductInCartStates() {
  const inCartSet = new Set();

  try {
    // temp/local cart
    if (typeof getTempCart === 'function') {
      const temp = getTempCart() || [];
      (temp || []).forEach(i => { if (i?.product_id != null) inCartSet.add(String(i.product_id)); });
    } else {
      const raw = localStorage.getItem('God's Only Store_temp_cart') || localStorage.getItem('tempCart') || '[]';
      JSON.parse(raw || '[]').forEach(i => { if (i?.product_id != null) inCartSet.add(String(i.product_id)); });
    }

    // db cart for signed-in user
    if (currentUser && typeof supabase !== 'undefined' && supabase) {
      try {
        const { data } = await supabase.from('cart_items').select('product_id').eq('user_id', currentUser.id);
        (data || []).forEach(it => inCartSet.add(String(it.product_id)));
      } catch (e) {
        // ignore DB errors — we still use temp cart
      }
    }
  } catch (e) {
    console.warn('refreshProductInCartStates error', e);
  }

  // Toggle class on all product cards
  document.querySelectorAll('.cart-icon-wrapper').forEach(wrapper => {
    const pid = wrapper.getAttribute('data-product-id');
    const icon = wrapper.querySelector('.cart-icon');
    if (!icon) return;
    if (pid != null && inCartSet.has(String(pid))) icon.classList.add('in-cart');
    else icon.classList.remove('in-cart');
  });
}

// ---------------------------
// addToCart (keep DB logic, but update icons after change)
// ---------------------------
async function addToCart(productId, quantity = 1) {
  const pid = String(productId);
  if (currentUser && supabase) {
    try {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: (existing.quantity || 0) + Number(quantity) })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cart_items')
          .insert([{
            user_id: currentUser.id,
            product_id: productId,
            quantity: Number(quantity),
            added_at: new Date().toISOString()
          }]);
      }
    } catch (error) {
      console.error('Error adding to cart (DB):', error);
      showMessage('Failed to add to cart', 'error');
      return;
    }
  } else {
    // Guest: store product_id as string
    const cart = getTempCart();
    const existingItem = cart.find(item => String(item.product_id) === pid);
    if (existingItem) existingItem.quantity = Number(existingItem.quantity || 0) + Number(quantity);
    else cart.push({ product_id: pid, quantity: Number(quantity) });
    saveTempCart(cart);
  }

  // Update UI
  await loadCart();
  await updateCartBadge();
  // refresh product card icons across pages
  try { await refreshProductInCartStates(); } catch (e) { /* ignore */ }
  showMessage('Added to cart!', 'success');
}

// ---------------------------
// removeFromCart (also updates icons)
// ---------------------------
async function removeFromCart(productId) {
  const pid = String(productId);
  if (currentUser && supabase) {
    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);
    } catch (error) {
      console.error('Error removing from cart (DB):', error);
    }
  } else {
    const cart = getTempCart().filter(item => String(item.product_id) !== pid);
    saveTempCart(cart);
  }

  await loadCart();
  await updateCartBadge();
  try { await refreshProductInCartStates(); } catch (e) { /* ignore */ }
  showMessage('Removed from cart', 'success');
}

// ---------------------------
// updateCartBadge (adds numeric badge and adjacent qty text)
// ---------------------------
async function updateCartBadge() {
  const badges = document.querySelectorAll('#cart-badge');
  let totalItems = 0;

  if (currentUser && supabase) {
    try {
      const { data } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', currentUser.id);
      if (Array.isArray(data)) totalItems = data.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    } catch (error) {
      console.error('Error updating badge (DB):', error);
    }
  } else {
    const cart = getTempCart();
    if (Array.isArray(cart)) totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  badges.forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
    if (totalItems > 0) badge.classList.add('show'); else badge.classList.remove('show');

    // Ensure a small text "(N)" beside the badge for clarity
    const parent = badge.parentElement;
    if (!parent) return;
    let qtyText = parent.querySelector('.cart-qty-text');
    if (totalItems > 0) {
      if (!qtyText) {
        qtyText = document.createElement('span');
        qtyText.className = 'cart-qty-text';
        qtyText.style.marginLeft = '8px';
        qtyText.style.fontWeight = '700';
        qtyText.style.fontSize = '14px';
        parent.appendChild(qtyText);
      }
      qtyText.textContent = `(${totalItems})`;
      qtyText.style.display = 'inline';
    } else {
      if (qtyText) qtyText.style.display = 'none';
    }
  });

  // Also keep product icons in sync (useful if updateBadge called after external change)
  try { await refreshProductInCartStates(); } catch (e) { /* ignore */ }
}

