// ==========================================
// SUPABASE AUTHENTICATION WITH USER PROFILE
// Updated: Added profile creation on registration
// ==========================================

// Supabase Configuration (keep your keys)
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;

// UI colors — avatar is pink to match your site
const UI = {
  primaryPink: '#ff9db1',
  pinkSoft: '#fff0f3',
  avatarPink: '#ff7da7',
  dropdownBg: '#ffffff',
  subtleGray: '#f6f3f4',
  danger: '#c62828'
};

// Full country list with Rwanda first
const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'AF', code: '+93', label: 'Afghanistan' },
  // ... (keep all your existing country codes)
  { iso: 'ZW', code: '+263', label: 'Zimbabwe' }
];

// Initialize on load
window.addEventListener('load', function() {
  console.log('Page loaded: initializing Supabase auth...');
  initializeSupabaseAuth();
});

function initializeSupabaseAuth() {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client created');
    setupAuthUI();
    createProfileModal();
  } else {
    console.error('Supabase library not loaded in window.supabase');
  }
}

function setupAuthUI() {
  const modal = document.getElementById('modal');
  const openModalBtn = document.getElementById('openModal');
  const closeModalBtn = document.getElementById('closeModal');
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');
  const toggle = document.getElementById('toggle');
  const formTitle = document.getElementById('form-title');
  const toggleText = document.querySelector('.toggle-text');

  if (!modal || !openModalBtn) {
    console.log('Auth modal or open button not found; skipping setupAuthUI');
    return;
  }

  checkAuthStatus();

  openModalBtn.addEventListener('click', function(e) {
    e.preventDefault();
    modal.style.display = 'flex';
    if (signinForm && registerForm && formTitle) {
      signinForm.classList.add('active');
      registerForm.classList.remove('active');
      formTitle.textContent = 'Sign In';
    }
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      modal.style.display = 'none';
      clearModalMessage();
    });
  }

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      clearModalMessage();
    }
  });

  // Toggle between Sign In and Register
  function handleToggle() {
    if (!signinForm || !registerForm || !formTitle || !toggleText) return;
    if (signinForm.classList.contains('active')) {
      signinForm.classList.remove('active');
      registerForm.classList.add('active');
      formTitle.textContent = 'Register';
      toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
    } else {
      registerForm.classList.remove('active');
      signinForm.classList.add('active');
      formTitle.textContent = 'Sign In';
      toggleText.innerHTML = 'Don\'t have an account? <span id="toggle">Register</span>';
    }
    const newToggle = document.getElementById('toggle');
    if (newToggle) newToggle.addEventListener('click', handleToggle);
    clearModalMessage();
  }
  if (toggle) toggle.addEventListener('click', handleToggle);

  // Sign in form
  if (signinForm) {
    signinForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = signinForm.querySelectorAll('input');
      const email = inputs[0].value.trim();
      const password = inputs[1].value;
      await handleSignIn(email, password);
    });
  }

  // Register form
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = registerForm.querySelectorAll('input');
      const name = inputs[0].value.trim();
      const email = inputs[1].value.trim();
      const password = inputs[2].value;
      const confirmPassword = inputs[3].value;
      await handleRegister(name, email, password, confirmPassword);
    });
  }

  // Listen to auth state changes
  if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        currentUser = session.user;
        updateUIForLoggedInUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        updateUIForLoggedOutUser();
      }
    });
  }
}

// === PROFILE MODAL (No delete-account) ===
function createProfileModal() {
  if (document.getElementById('userProfileModal')) return;

  const countryOptions = COUNTRY_LIST.map(c => `<option value="${c.code}" data-iso="${c.iso}">${c.iso} ${c.label} ${c.code}</option>`).join('\n');

  const modalHTML = `
    <div id="userProfileModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:10000; justify-content:center; align-items:center;">
      <div style="background:#fff; border-radius:12px; width:90%; max-width:780px; max-height:90vh; overflow:auto; box-shadow:0 12px 40px rgba(0,0,0,0.25);">
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
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Attach event handlers
  const closeBtn = document.getElementById('closeProfileModal');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
  const modalRoot = document.getElementById('userProfileModal');
  if (modalRoot) modalRoot.addEventListener('click', function(e) {
    if (e.target.id === 'userProfileModal') closeProfileModal();
  });

  const updateBtn = document.getElementById('updatePhoneBtn');
  if (updateBtn) updateBtn.addEventListener('click', handleUpdatePhone);
  const changePwdBtn = document.getElementById('changePasswordBtn');
  if (changePwdBtn) changePwdBtn.addEventListener('click', handleChangePassword);

  // default to Rwanda
  const countrySelect = document.getElementById('countryCodeSelect');
  if (countrySelect) countrySelect.value = '+250';
}

// Profile open/close & load
function openProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  if (!currentUser) {
    alert('Please sign in to open profile settings.');
    return;
  }
  modal.style.display = 'flex';
  loadUserProfile();
}

function closeProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  modal.style.display = 'none';
  // clear messages and inputs
  const phoneInput = document.getElementById('phoneInput'); if (phoneInput) phoneInput.value = '';
  const pm = document.getElementById('phoneMessage'); if (pm) pm.textContent = '';
  const pwd = document.getElementById('passwordMessage'); if (pwd) pwd.textContent = '';
}

async function loadUserProfile() {
  if (!currentUser) return;

  const nameSource = currentUser.user_metadata?.full_name || currentUser.email || 'User';
  const initial = nameSource.charAt(0).toUpperCase();
  const avatar = document.getElementById('userAvatar'); if (avatar) avatar.textContent = initial;
  const nameEl = document.getElementById('userName'); if (nameEl) nameEl.textContent = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
  const emailEl = document.getElementById('userEmail'); if (emailEl) emailEl.textContent = currentUser.email || '';

  // phone from metadata
  const phoneField = currentUser.user_metadata?.phone || currentUser.phone || '';
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

// session helper
async function _ensureSessionOrShowError(targetMessageEl) {
  if (!supabase) {
    if (targetMessageEl) { targetMessageEl.style.color = UI.danger; targetMessageEl.textContent = 'Auth unavailable.'; }
    return false;
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (!data || !data.session || !data.session.user) {
      if (targetMessageEl) {
        targetMessageEl.style.color = UI.danger;
        targetMessageEl.textContent = 'Session expired. Please sign out and sign in again.';
      } else {
        alert('Session expired. Please sign out and sign in again.');
      }
      return false;
    }
    currentUser = data.session.user;
    return true;
  } catch (err) {
    console.error('Error checking session:', err);
    if (targetMessageEl) { targetMessageEl.style.color = UI.danger; targetMessageEl.textContent = 'Session check failed. Re-login required.'; }
    return false;
  }
}

// ====== handleUpdatePhone (save to user_metadata, no verification) ======
async function handleUpdatePhone() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneRaw = document.getElementById('phoneInput').value.trim();
  const message = document.getElementById('phoneMessage');

  if (!phoneRaw) {
    message.style.color = UI.danger;
    message.textContent = 'Please enter a phone number.';
    return;
  }

  const ok = await _ensureSessionOrShowError(message);
  if (!ok) return;

  let normalized = phoneRaw.replace(/\s|-/g, '');
  if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
  const country = countrySelect ? countrySelect.value : '+250';
  if (!/^\+/.test(normalized)) normalized = country + normalized;

  // Rwanda check
  if (country === '+250') {
    if (!/^\+2507\d{8}$/.test(normalized)) {
      message.style.color = UI.danger;
      message.textContent = 'Enter a valid Rwandan mobile number (e.g. +2507xxxxxxxx).';
      return;
    }
  } else {
    if (!/^\+\d{5,15}$/.test(normalized)) {
      message.style.color = UI.danger;
      message.textContent = 'Enter a valid international phone number.';
      return;
    }
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { phone: normalized }
    });

    if (error) {
      console.error('Error saving phone to user_metadata:', error);
      message.style.color = UI.danger;
      message.textContent = error.message || 'Failed to save phone.';
      return;
    }

    if (data && data.user) currentUser = data.user;
    message.style.color = '#2e7d32';
    message.textContent = 'Phone saved to profile.';
  } catch (err) {
    console.error('Unexpected error saving phone:', err);
    message.style.color = UI.danger;
    message.textContent = err.message || 'Unexpected error saving phone.';
  }
}

// Change password
async function handleChangePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  const message = document.getElementById('passwordMessage');

  if (!currentPassword || !newPassword || !confirmPassword) {
    message.style.color = UI.danger;
    message.textContent = 'Please fill in all password fields';
    return;
  }
  if (newPassword.length < 6) {
    message.style.color = UI.danger;
    message.textContent = 'New password must be at least 6 characters';
    return;
  }
  if (newPassword !== confirmPassword) {
    message.style.color = UI.danger;
    message.textContent = 'New passwords do not match';
    return;
  }

  try {
    const signInResult = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPassword });
    if (signInResult.error) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    message.style.color = '#2e7d32';
    message.textContent = 'Password changed successfully!';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
  } catch (error) {
    console.error('Change password error:', error);
    message.style.color = UI.danger;
    message.textContent = error.message || 'Password change failed';
  }
}

// === AUTH HANDLERS (sign in / register / logout) ===
async function handleSignIn(email, password) {
  if (!supabase) { showModalMessage('Authentication not available', 'error'); return; }
  showModalMessage('Signing in...', 'info');
  try {
    if (!email || !password) throw new Error('Please fill in all fields');
    if (!isValidEmail(email)) throw new Error('Please enter a valid email address');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showModalMessage('Sign in successful!', 'success');
    setTimeout(() => {
      const modal = document.getElementById('modal'); if (modal) modal.style.display = 'none';
      clearModalMessage();
    }, 900);
  } catch (error) {
    showModalMessage(error.message || 'Sign in failed', 'error');
  }
}

async function handleRegister(name, email, password, confirmPassword) {
  if (!supabase) { showModalMessage('Authentication not available', 'error'); return; }
  showModalMessage('Creating account...', 'info');
  try {
    if (!name || !email || !password || !confirmPassword) throw new Error('Please fill in all fields');
    if (!isValidEmail(email)) throw new Error('Please enter a valid email address');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    if (password !== confirmPassword) throw new Error('Passwords do not match');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) throw error;

    // === NEW CODE: Create profile in profiles table ===
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id, 
            email: email,
            full_name: name,
            is_admin: false,
            created_at: new Date().toISOString()
            // phone, updated_at left as null by default
          }
        ]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't throw here - the user was created successfully, just profile failed
        // You might want to handle this differently based on your needs
      }
    }

    if (data.user && !data.session) {
      showModalMessage('Success! Please check your email to confirm your account.', 'success');
    } else {
      showModalMessage('Registration successful!', 'success');
      setTimeout(() => { const modal = document.getElementById('modal'); if (modal) modal.style.display = 'none'; clearModalMessage(); }, 1200);
    }
  } catch (error) {
    showModalMessage(error.message || 'Registration failed', 'error');
  }
}

async function handleLogout(e) {
  if (e) e.preventDefault();
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.reload();
  } catch (error) {
    console.error('Logout error:', error);
    alert('Error logging out');
  }
}

// === UI update + session check ===
async function checkAuthStatus() {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    if (data && data.session && data.session.user) {
      currentUser = data.session.user;
      updateUIForLoggedInUser(currentUser);
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('Session check error', error);
  }
}

function updateUIForLoggedInUser(user) {
  const openModalBtn = document.getElementById('openModal');
  if (!openModalBtn) return;

  const displayName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();

  // Replace sign-in button with avatar + dropdown (styled to match pink theme)
  openModalBtn.outerHTML = `
    <div id="userMenuContainer" style="position:relative; display:flex; align-items:center; gap:12px;">
      <button id="userAvatarBtn" aria-label="Open user menu" 
        style="width:48px; height:48px; border-radius:50%; background:${UI.avatarPink}; color:#fff; border:3px solid #fff; cursor:pointer; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 30px rgba(255,125,167,0.12);">
        ${initial}
      </button>

      <div id="userDropdown" style="display:none; position:absolute; top:64px; right:0; background:${UI.dropdownBg}; border-radius:14px; box-shadow:0 18px 50px rgba(0,0,0,0.12); min-width:260px; z-index:1000; overflow:visible;">
        <div style="padding:14px 16px; border-radius:14px; background:linear-gradient(180deg, rgba(255,249,250,1), #fff);">
          <p style="margin:0; font-weight:800; color:#221; font-size:15px;">${displayName}</p>
          <p style="margin:6px 0 0 0; font-size:13px; color:#6b6b6b;">${user.email || ''}</p>
        </div>

        <div style="padding:12px; display:flex; flex-direction:column; gap:10px;">
          <button id="viewProfileBtn" style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; box-shadow:0 6px 18px rgba(0,0,0,0.06);">
            <span style="width:28px; height:28px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background: #6b3fb0; color:#fff; font-size:14px;">👤</span>
            <span style="color:#333;">View Profile</span>
          </button>

          <button id="logoutBtn" style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; color:${UI.danger}; box-shadow:0 6px 18px rgba(0,0,0,0.04);">
            <span style="width:28px; height:28px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background:#ffdcd3; color:${UI.danger}; font-size:14px;">🚪</span>
            <span style="color:${UI.danger};">Logout</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach handlers after replacing DOM
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');

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

  if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', function() {
      if (dropdown) dropdown.style.display = 'none';
      openProfileModal();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const dd = document.getElementById('userDropdown');
    const av = document.getElementById('userAvatarBtn');
    if (!dd) return;
    if (event.target !== dd && !dd.contains(event.target) && event.target !== av && !av.contains(event.target)) {
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
  userMenu.outerHTML = '<button id="openModal" style="padding:8px 12px; border-radius:8px; background:transparent; border:1px solid #eee; cursor:pointer;">Sign in</button>';
  const newOpenModalBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  if (newOpenModalBtn && modal) {
    newOpenModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      modal.style.display = 'flex';
    });
  }
}

// UI message helpers
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
  messageDiv.style.display = 'block';
  const colors = {
    error: { bg: '#ffecec', text: '#c62828', border: '#f2a1a1' },
    success: { bg: '#e8f5e9', text: '#2e7d32', border: '#a8e0b5' },
    info: { bg: '#fff4f7', text: '#b23b5a', border: '#ffd1dc' }
  };
  const color = colors[type] || colors.info;
  messageDiv.style.backgroundColor = color.bg;
  messageDiv.style.color = color.text;
  messageDiv.style.border = `1px solid ${color.border}`;
}
function clearModalMessage() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  const md = modal.querySelector('.auth-message'); if (md) md.style.display = 'none';
}
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ==========================================
// End of script
// ==========================================


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
    toggleText.innerHTML = 'Don\'t have an account? <span id="toggle">Register</span>';
  }
  // re-bind toggle span since innerHTML is replaced
  document.getElementById("toggle").addEventListener("click", switchForms);
}

document.getElementById("toggle").addEventListener("click", switchForms);

const openBtn = document.getElementById("openModal");
const closeBtn = document.getElementById("closeModal");
const modal = document.getElementById("modal");

openBtn.addEventListener("click", () => {
  modal.classList.add("open");
});

closeBtn.addEventListener("click", () => {
  modal.classList.remove("open");
});

// trial-success shop page
// Same KEY as in admin
const KEY = "local_products_v1";

function loadAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

// Render shop products
function renderShopProducts() {
  const products = loadAll();
  const container = document.querySelector(".pro-container");
  container.innerHTML = "";

  products.forEach(p => {
    container.innerHTML += `
      <div class="pro">
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

renderShopProducts();
