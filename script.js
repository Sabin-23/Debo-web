// ==============================================
// GOD'S ONLY STORE - COMPLETE SCRIPT
// Auth, Profile, Cart with Supabase
// ==============================================

const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

// ADD THIS RIGHT AFTER YOUR CONSTANTS (after SUPABASE_ANON_KEY line)

// ADD THIS RIGHT AFTER YOUR CONSTANTS (after SUPABASE_ANON_KEY line)

// Prevent sign-out flicker - check session immediately
(function() {
  if (typeof window.supabase !== 'undefined') {
    const tempSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    tempSupabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Session exists, prevent UI flicker
        const openModalBtn = document.getElementById('openModal');
        if (openModalBtn) {
          openModalBtn.style.display = 'none';
        }
      }
    });
  }
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

// ==============================================
// INITIALIZATION
// ==============================================

window.addEventListener('load', function() {
  initializeSupabase();
  setupAuth();
  initializeCart();
  
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

const bar = document.getElementById('bar');
const close = document.getElementById('close');
const nav = document.getElementById('navbar');
  
if (bar) bar.addEventListener('click', () => nav.classList.add('active'));
if (close) close.addEventListener('click', () => nav.classList.remove('active'));


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
        // REMOVED: showMessage('Successfully signed in!', 'success');
        await syncTempCartToDatabase();
        
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
      await syncTempCartToDatabase();
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

// ==========================================
// 7. PROFILE SETTINGS MODAL
// ==========================================

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
  if (!currentUser || !currentUserProfile) return;

  const nameInput = document.getElementById('settingsName');
  const emailInput = document.getElementById('settingsEmail');
  const phoneInput = document.getElementById('settingsPhone');
  const countrySelect = document.getElementById('settingsCountryCode');

  if (nameInput) nameInput.value = currentUser.user_metadata?.full_name || '';
  if (emailInput) emailInput.value = currentUser.email || '';

  if (currentUserProfile.phone && phoneInput && countrySelect) {
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
  const name = nameInput.value.trim();

  if (!name) {
    msg.textContent = 'Name cannot be empty';
    msg.style.color = UI.danger;
    return;
  }

  msg.textContent = 'Updating...';
  msg.style.color = '';

  try {
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name }
    });

    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);

    if (profileError) throw profileError;

    const { data } = await supabase.auth.getSession();
    currentUser = data?.session?.user || currentUser;
    currentUserProfile = await getUserProfile(currentUser.id);

    msg.textContent = 'Name updated successfully';
    msg.style.color = UI.success;
    setTimeout(() => msg.textContent = '', 3000);

  } catch (error) {
    console.error('Update name error:', error);
    msg.textContent = error.message || 'Failed to update name';
    msg.style.color = UI.danger;
  }
}

async function handleUpdateEmail() {
  const emailInput = document.getElementById('settingsEmail');
  const msg = document.getElementById('emailMsg');
  const email = emailInput.value.trim();

  if (!isValidEmail(email)) {
    msg.textContent = 'Enter a valid email';
    msg.style.color = UI.danger;
    return;
  }

  msg.textContent = 'Updating...';
  msg.style.color = '';

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

    msg.textContent = 'Email updated (check your inbox for confirmation)';
    msg.style.color = UI.success;
    setTimeout(() => msg.textContent = '', 4000);

  } catch (error) {
    console.error('Update email error:', error);
    msg.textContent = error.message || 'Failed to update email';
    msg.style.color = UI.danger;
  }
}

async function handleUpdatePhone() {
  const phoneInput = document.getElementById('settingsPhone');
  const countrySelect = document.getElementById('settingsCountryCode');
  const msg = document.getElementById('phoneMsg');
  
  const phoneRaw = phoneInput.value.trim();
  const countryCode = countrySelect.value || '+250';

  if (!phoneRaw) {
    msg.textContent = 'Enter a phone number';
    msg.style.color = UI.danger;
    return;
  }

  let normalized = phoneRaw.replace(/\s|-/g, '');
  if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
  if (!/^\+/.test(normalized)) normalized = countryCode + normalized;

  if (!/^\+\d{10,15}$/.test(normalized)) {
    msg.textContent = 'Enter a valid phone number';
    msg.style.color = UI.danger;
    return;
  }

  msg.textContent = 'Updating...';
  msg.style.color = '';

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ phone: normalized, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);

    if (error) throw error;

    currentUserProfile = await getUserProfile(currentUser.id);

    msg.textContent = 'Phone updated successfully';
    msg.style.color = UI.success;
    setTimeout(() => msg.textContent = '', 3000);

  } catch (error) {
    console.error('Update phone error:', error);
    msg.textContent = error.message || 'Failed to update phone';
    msg.style.color = UI.danger;
  }
}

async function handleChangePassword() {
  const currentPwd = document.getElementById('currentPassword').value;
  const newPwd = document.getElementById('newPassword').value;
  const confirmPwd = document.getElementById('confirmNewPassword').value;
  const msg = document.getElementById('passwordMsg');

  if (!currentPwd || !newPwd || !confirmPwd) {
    msg.textContent = 'Fill all password fields';
    msg.style.color = UI.danger;
    return;
  }

  if (newPwd.length < 6) {
    msg.textContent = 'New password must be at least 6 characters';
    msg.style.color = UI.danger;
    return;
  }

  if (newPwd !== confirmPwd) {
    msg.textContent = 'New passwords do not match';
    msg.style.color = UI.danger;
    return;
  }

  msg.textContent = 'Changing password...';
  msg.style.color = '';

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPwd
    });

    if (signInError) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: newPwd });

    if (error) throw error;

    msg.textContent = 'Password changed successfully';
    msg.style.color = UI.success;

    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';

    setTimeout(() => msg.textContent = '', 3000);

  } catch (error) {
    console.error('Change password error:', error);
    msg.textContent = error.message || 'Password change failed';
    msg.style.color = UI.danger;
  }
}


// ==========================================
// 8. UI UPDATE FUNCTIONS
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
      openProfileSettings();
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

// ====== CART SYSTEM (replace previous cart block with this) ======

const TEMP_CART_KEY = 'temp_cart_v1';

// ===== TEMPORARY CART (LocalStorage) =====
function getTempCart() {
  try {
    const cart = localStorage.getItem(TEMP_CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (e) { return []; }
}
function saveTempCart(cart) {
  try { localStorage.setItem(TEMP_CART_KEY, JSON.stringify(cart)); } catch (e) { console.error(e); }
}
function addToTempCart(productId, quantity = 1) {
  const cart = getTempCart();
  const idx = cart.findIndex(i => String(i.product_id) === String(productId));
  if (idx !== -1) cart[idx].quantity += quantity;
  else cart.push({ product_id: productId, quantity, added_at: new Date().toISOString() });
  saveTempCart(cart);
  if (typeof updateCartBadge === 'function') updateCartBadge();
  updateProductCardIcon(productId, true);
}
function clearTempCart() { try { localStorage.removeItem(TEMP_CART_KEY); } catch (e) { console.error(e); } }

// ====== HELPERS FOR UI ======
function updateProductCardIcon(productId, inCart) {
  try {
    const selector = `.cart-icon-wrapper[data-product-id="${productId}"] .cart-icon, .cart-icon-wrapper[data-product-id='${productId}'] .cart-icon`;
    document.querySelectorAll(selector).forEach(icon => {
      if (inCart) icon.classList.add('in-cart'); else icon.classList.remove('in-cart');
    });
  } catch(e) { /* ignore */ }
}

// ====== SYNC TEMP CART TO DATABASE ======
async function syncTempCartToDatabase() {
  if (!window.currentUser || !window.supabase) return;
  const temp = getTempCart();
  if (!temp || temp.length === 0) {
    if (typeof updateCartBadge === 'function') updateCartBadge();
    return;
  }
  try {
    for (const item of temp) {
      const { data: existing, error: checkErr } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('product_id', item.product_id)
        .maybeSingle();
      if (checkErr && checkErr.code !== 'PGRST116') { console.error(checkErr); continue; }
      if (existing) {
        await supabase.from('cart_items').update({ quantity: existing.quantity + item.quantity }).eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert([{ user_id: currentUser.id, product_id: item.product_id, quantity: item.quantity, added_at: new Date().toISOString() }]);
      }
    }
    clearTempCart();
    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof showMessage === 'function') showMessage('Cart synced!', 'success', 2000);
  } catch (e) { console.error('syncTempCartToDatabase error', e); }
}

// ====== CART (server-backed) ======
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
  

  // wire UI
  if (cartToggleMobile) cartToggleMobile.addEventListener("click", (e)=>{ e.preventDefault(); toggleCart(); });
  if (cartToggleDesktop) cartToggleDesktop.addEventListener("click", (e)=>{ e.preventDefault(); toggleCart(); });
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);
  if (checkoutBtn) checkoutBtn.addEventListener("click", handleCheckout);
  if (clearCartBtn) clearCartBtn.addEventListener("click", handleClearCart);

  if (typeof updateCartBadge === 'function') updateCartBadge();
}

  // Inside or after initializeCart()
const checkoutBtn = document.getElementById('checkout');
if (checkoutBtn) {
  checkoutBtn.onclick = async () => {
    const { data: { user } } = await window.supabase.auth.getUser();

    if (!user) {
      // user not logged in → show message or login modal
      alert('You must sign in before checking out.');

      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('open');
      }

      return; // stop here — don’t redirect
    }

    // user logged in → proceed
    window.location.href = 'checkout.html';
  };
}


// ---- Local (guest) Cart Helpers ----
function getTempCart() {
  try {
    return JSON.parse(localStorage.getItem('temp_cart') || '[]');
  } catch {
    return [];
  }
}

function saveTempCart(cart) {
  localStorage.setItem('temp_cart', JSON.stringify(cart));
}

window.addToTempCart = function (productId, qty = 1) {
  const cart = getTempCart();
  const existing = cart.find(p => p.id === productId);
  if (existing) existing.qty += qty;
  else cart.push({ id: productId, qty });
  saveTempCart(cart);
  if (typeof updateCartBadge === 'function') updateCartBadge();
  if (typeof showMessage === 'function') showMessage('Added to local cart', 'success');
};


// ---- Render local cart if not signed in ----
window.renderCart = async function () {
  const cartItemsDiv = document.getElementById('cart-items');
  const subtotalDiv = document.getElementById('cart-subtotal');
  const user = window.currentUser;

  cartItemsDiv.innerHTML = '<div style="padding:20px;color:#666;">Loading...</div>';

  if (!user) {
    // guest cart
    const cart = getTempCart();
    if (!cart.length) {
      cartItemsDiv.innerHTML = '<div style="padding:20px;color:#666;">Your cart is empty.</div>';
      subtotalDiv.textContent = 'RWF 0';
      return;
    }

    // fetch product info for each id
    const ids = cart.map(c => c.id);
    const { data: products, error } = await window.supabase
      .from('products')
      .select('*')
      .in('id', ids);

    if (error) {
      cartItemsDiv.innerHTML = `<div style="padding:20px;color:red;">Error loading cart</div>`;
      return;
    }

    let subtotal = 0;
    cartItemsDiv.innerHTML = '';
    cart.forEach(item => {
      const p = products.find(prod => prod.id === item.id);
      if (!p) return;
      const total = (p.price || 0) * item.qty;
      subtotal += total;
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${p.image_url || 'https://via.placeholder.com/60'}" alt="">
        <div class="cart-info">
          <strong>${p.name}</strong>
          <span>RWF ${p.price} × ${item.qty}</span>
          <div class="cart-actions">
            <button onclick="removeTempCartItem(${p.id})">Remove</button>
          </div>
        </div>`;
      cartItemsDiv.appendChild(div);
    });
    subtotalDiv.textContent = 'RWF ' + subtotal;
    return;
  }

  // If logged in → load from Supabase
  const { data, error } = await window.supabase
    .from('cart_items')
    .select('quantity, products(id, name, price, image_url)')
    .eq('user_id', user.id);

  if (error) {
    cartItemsDiv.innerHTML = `<div style="padding:20px;color:red;">Error loading cart</div>`;
    return;
  }

  if (!data || !data.length) {
    cartItemsDiv.innerHTML = '<div style="padding:20px;color:#666;">Your cart is empty.</div>';
    subtotalDiv.textContent = 'RWF 0';
    return;
  }

  let subtotal = 0;
  cartItemsDiv.innerHTML = '';
  data.forEach(item => {
    const p = item.products;
    const total = (p.price || 0) * item.quantity;
    subtotal += total;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${p.image_url || 'https://via.placeholder.com/60'}" alt="">
      <div class="cart-info">
        <strong>${p.name}</strong>
        <span>RWF ${p.price} × ${item.quantity}</span>
        <div class="cart-actions">
          <button onclick="removeCartItem(${p.id})">Remove</button>
        </div>
      </div>`;
    cartItemsDiv.appendChild(div);
  });
  subtotalDiv.textContent = 'RWF ' + subtotal;
};

function removeTempCartItem(productId) {
  let cart = getTempCart();
  cart = cart.filter(item => item.id !== productId);
  saveTempCart(cart);
  renderCart();
  if (typeof updateCartBadge === 'function') updateCartBadge();
}


// exported helpers
window.toggleCart = function toggleCart() {
  const panel = document.getElementById('cart-panel');
  const backdrop = document.getElementById('cart-backdrop');
  if (!panel || !backdrop) return;
  if (panel.classList.contains('open')) closeCart(); else openCart();
};
window.openCart = function openCart() {
  const panel = document.getElementById('cart-panel');
  const backdrop = document.getElementById('cart-backdrop');
  if (!panel || !backdrop) return;
  panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); backdrop.hidden = false;
  if (typeof renderCart === 'function') renderCart();
};
window.closeCart = function closeCart() {
  const panel = document.getElementById('cart-panel');
  const backdrop = document.getElementById('cart-backdrop');
  if (!panel || !backdrop) return;
  panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); backdrop.hidden = true;
};

// addToCartFromSupabase: prefer server, else fallback to temp cart
async function addToCartFromSupabase(productId) {
  if (!productId) return;
  // if user not signed in, store temp
  if (!window.currentUser || !window.currentUser.id) {
    addToTempCart(productId, 1);
    updateProductCardIcon(productId, true);
    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof showMessage === 'function') showMessage('Added to cart (local). Sign in to save.', 'success', 2000);
    return;
  }
  if (!window.supabase) { alert('Service unavailable'); return; }
  try {
    const { data: existing, error: checkError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existing) {
      const { error: upErr } = await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabase.from('cart_items').insert([{ user_id: currentUser.id, product_id: productId, quantity:1, added_at: new Date().toISOString() }]);
      if (insErr) throw insErr;
    }
    updateProductCardIcon(productId, true);
    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof showMessage === 'function') showMessage('Added to cart', 'success', 1500);
  } catch (e) {
    console.error('addToCartFromSupabase error', e);
    throw e;
  }
}
window.addToCartFromSupabase = addToCartFromSupabase;

// optional helper to remove by product id (used by UI toggle in shop)
async function removeFromCartByProductId(productId) {
  if (!window.currentUser || !window.currentUser.id || !window.supabase) {
    // remove from temp
    const t = getTempCart().filter(x => String(x.product_id) !== String(productId));
    saveTempCart(t);
    updateProductCardIcon(productId, false);
    if (typeof updateCartBadge === 'function') updateCartBadge();
    return;
  }
  try {
    // find cart entry
    const { data: item, error } = await supabase.from('cart_items').select('id').eq('user_id', currentUser.id).eq('product_id', productId).maybeSingle();
    if (error) throw error;
    if (item && item.id) {
      const { error: delErr } = await supabase.from('cart_items').delete().eq('id', item.id);
      if (delErr) throw delErr;
    }
    updateProductCardIcon(productId, false);
    if (typeof updateCartBadge === 'function') updateCartBadge();
  } catch (e) {
    console.error('removeFromCartByProductId error', e);
    throw e;
  }
}
window.removeFromCartByProductId = removeFromCartByProductId;

// renderCart, updateCartBadge, update quantity/ removal - provide safe implementations that map to your DB structure.
// If you already have renderCart/updateCartBadge implementations, keep them. Otherwise the following are safe fallback implementations.

async function renderCart() {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*');
  const node = document.getElementById('cart-items');
  const subtotalNode = document.getElementById('cart-subtotal');
  if (!node) return;
  node.innerHTML = '<div style="padding:20px;color:#666;">Loading cart...</div>';
  // if user not signed in show temp cart
  if (!window.currentUser || !window.currentUser.id) {
    const temp = getTempCart();
    if (!temp || temp.length === 0) {
      node.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">Your cart is empty.</div>';
      if (subtotalNode) subtotalNode.textContent = 'RWF 0';
      return;
    }
    node.innerHTML = '';
    let subtotal = 0;
    for (const t of temp) {
      const p = document.querySelector(`.pro [data-product-id="${t.product_id}"]`);
      const name = p ? p.alt || 'Product' : 'Product';
      const price = 0;
      subtotal += 0;
      const div = document.createElement('div');
      div.style.cssText = 'padding:12px;border-bottom:1px solid #eee;';
      div.textContent = `${name} × ${t.quantity}`;
      node.appendChild(div);
    }
    if (subtotalNode) subtotalNode.textContent = `RWF ${subtotal}`;
    return;
  }

  // if signed in, attempt to read from DB
  if (!window.supabase) { node.innerHTML = '<div style="padding:20px;color:#666;">Service unavailable</div>'; return; }
  try {
    const { data: cartItems, error } = await supabase.from('cart_items').select('id,quantity,products(id,name,price,image_url)').eq('user_id', currentUser.id);
    if (error) throw error;
    node.innerHTML = '';
    if (!cartItems || cartItems.length === 0) {
      node.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">Your cart is empty.</div>';
      if (subtotalNode) subtotalNode.textContent = 'RWF 0';
      return;
    }
    let subtotal = 0;
    for (const ci of cartItems) {
      const prod = ci.products || {};
      const total = (prod.price || 0) * (ci.quantity || 1);
      subtotal += total;
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;gap:12px;padding:12px;border-bottom:1px solid #eee;';
      div.innerHTML = `<div style="flex:1;"><strong>${escapeHtml(prod.name||'Product')}</strong><div>Qty: ${ci.quantity}</div></div><div>RWF ${total}</div>`;
      node.appendChild(div);
    }
    if (subtotalNode) subtotalNode.textContent = `RWF ${subtotal}`;
  } catch (err) {
    console.error('renderCart err', err);
    node.innerHTML = '<div style="text-align:center;padding:20px;color:#c62828;">Error loading cart</div>';
  }
}

async function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  let count = 0;
  try {
    if (window.currentUser && window.currentUser.id && window.supabase) {
      const { data, error } = await supabase.from('cart_items').select('quantity').eq('user_id', currentUser.id);
      if (!error && Array.isArray(data)) count = data.reduce((s,i)=>s+(i.quantity||0),0);
    } else {
      const t = getTempCart();
      count = Array.isArray(t) ? t.reduce((s,i)=>s+(i.quantity||0),0) : 0;
    }
  } catch (e) { console.error('updateCartBadge error', e); }
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

// wire cart UI on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  try { initializeCart(); } catch (e) { /* ignore */ }
});


// export some helpers for other pages
window.addToTempCart = addToTempCart;
window.getTempCart = getTempCart;
window.saveTempCart = saveTempCart;
window.syncTempCartToDatabase = syncTempCartToDatabase;







