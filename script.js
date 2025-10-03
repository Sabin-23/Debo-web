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
// SUPABASE AUTHENTICATION SYSTEM - FIXED
// Complete solution with profile management, order history, and cart
// ==========================================

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================

const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;
let currentUserProfile = null;

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

// ==========================================
// 2. COMPLETE COUNTRY DATA
// ==========================================

const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'US', code: '+1', label: 'United States' },
  { iso: 'GB', code: '+44', label: 'United Kingdom' },
  { iso: 'CA', code: '+1', label: 'Canada' },
  { iso: 'AU', code: '+61', label: 'Australia' },
  { iso: 'DE', code: '+49', label: 'Germany' },
  { iso: 'FR', code: '+33', label: 'France' },
  { iso: 'IT', code: '+39', label: 'Italy' },
  { iso: 'ES', code: '+34', label: 'Spain' },
  { iso: 'NL', code: '+31', label: 'Netherlands' },
  { iso: 'BE', code: '+32', label: 'Belgium' },
  { iso: 'CH', code: '+41', label: 'Switzerland' },
  { iso: 'AT', code: '+43', label: 'Austria' },
  { iso: 'SE', code: '+46', label: 'Sweden' },
  { iso: 'NO', code: '+47', label: 'Norway' },
  { iso: 'DK', code: '+45', label: 'Denmark' },
  { iso: 'FI', code: '+358', label: 'Finland' },
  { iso: 'PL', code: '+48', label: 'Poland' },
  { iso: 'CZ', code: '+420', label: 'Czech Republic' },
  { iso: 'GR', code: '+30', label: 'Greece' },
  { iso: 'PT', code: '+351', label: 'Portugal' },
  { iso: 'IE', code: '+353', label: 'Ireland' },
  { iso: 'IN', code: '+91', label: 'India' },
  { iso: 'CN', code: '+86', label: 'China' },
  { iso: 'JP', code: '+81', label: 'Japan' },
  { iso: 'KR', code: '+82', label: 'South Korea' },
  { iso: 'BR', code: '+55', label: 'Brazil' },
  { iso: 'MX', code: '+52', label: 'Mexico' },
  { iso: 'AR', code: '+54', label: 'Argentina' },
  { iso: 'ZA', code: '+27', label: 'South Africa' },
  { iso: 'NG', code: '+234', label: 'Nigeria' },
  { iso: 'KE', code: '+254', label: 'Kenya' },
  { iso: 'UG', code: '+256', label: 'Uganda' },
  { iso: 'TZ', code: '+255', label: 'Tanzania' },
  { iso: 'ET', code: '+251', label: 'Ethiopia' },
  { iso: 'EG', code: '+20', label: 'Egypt' },
  { iso: 'AE', code: '+971', label: 'UAE' },
  { iso: 'SA', code: '+966', label: 'Saudi Arabia' },
  { iso: 'SG', code: '+65', label: 'Singapore' },
  { iso: 'MY', code: '+60', label: 'Malaysia' },
  { iso: 'TH', code: '+66', label: 'Thailand' },
  { iso: 'PH', code: '+63', label: 'Philippines' },
  { iso: 'ID', code: '+62', label: 'Indonesia' },
  { iso: 'VN', code: '+84', label: 'Vietnam' },
  { iso: 'NZ', code: '+64', label: 'New Zealand' }
];

// ==========================================
// 3. INITIALIZATION & SETUP
// ==========================================

window.addEventListener('load', function() {
  console.log('🔧 Initializing application...');
  initializeSupabaseAuth();
  setupFormToggle();
  setupModalHandlers();
  initializeCart();
});

function initializeSupabaseAuth() {
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded');
    showGlobalMessage('Authentication service not available. Please refresh the page.', 'error');
    return;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized successfully');
    
    setupAuthStateListener();
    setupAuthUI();
    createProfileModal();
    checkAuthStatus();
    
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    showGlobalMessage('Failed to initialize authentication. Please refresh the page.', 'error');
  }
}

// ==========================================
// 4. AUTHENTICATION STATE MANAGEMENT - FIXED
// ==========================================

let isProcessingAuth = false; // Prevent infinite loops

function setupAuthStateListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Auth state changed:', event);
    
    // Prevent processing multiple auth events simultaneously
    if (event === 'SIGNED_IN' && isProcessingAuth) {
      console.log('⏸️ Already processing auth, skipping...');
      return;
    }
    
    switch (event) {
      case 'SIGNED_IN':
        isProcessingAuth = true;
        currentUser = session.user;
        console.log('👤 User signed in:', currentUser.email);
        
        try {
          // Load or create profile
          currentUserProfile = await getUserProfile(currentUser.id);
          console.log('📋 Profile fetched:', currentUserProfile);
          
          if (!currentUserProfile) {
            console.log('📝 Creating new user profile...');
            currentUserProfile = await createUserProfile(currentUser.id);
            console.log('✅ Profile created:', currentUserProfile);
            
            if (!currentUserProfile) {
              throw new Error('Failed to create user profile');
            }
          }
          
          console.log('🎨 Updating UI...');
          updateUIForLoggedInUser(currentUser);
          showGlobalMessage('Successfully signed in!', 'success');
          
        } catch (error) {
          console.error('❌ Error during sign-in process:', error);
          showGlobalMessage('Error loading profile: ' + error.message, 'error');
        } finally {
          isProcessingAuth = false;
          console.log('✅ Auth processing complete');
        }
        break;
        
      case 'SIGNED_OUT':
        isProcessingAuth = false;
        currentUser = null;
        currentUserProfile = null;
        updateUIForLoggedOutUser();
        showGlobalMessage('Successfully signed out.', 'info');
        break;
        
      case 'USER_UPDATED':
        // Don't reload profile on update to prevent loops
        if (session?.user) {
          currentUser = session.user;
        }
        break;
        
      case 'TOKEN_REFRESHED':
        console.log('🔄 Token refreshed');
        break;
    }
  });
}

async function checkAuthStatus() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session check error:', error);
      return;
    }
    
    if (data.session?.user) {
      currentUser = data.session.user;
      currentUserProfile = await getUserProfile(currentUser.id);
      
      // FIX: Create profile if it doesn't exist
      if (!currentUserProfile) {
        console.log('📝 Profile missing, creating...');
        currentUserProfile = await createUserProfile(currentUser.id);
      }
      
      updateUIForLoggedInUser(currentUser);
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
  }
}

// ==========================================
// 5. USER PROFILE MANAGEMENT - FIXED
// ==========================================

async function getUserProfile(userId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    console.log('🔍 Fetching profile for user:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Profile fetch error:', error);
      if (error.code === 'PGRST116') {
        console.log('📝 No existing profile found');
        return null;
      }
      throw error;
    }

    console.log('✅ Profile fetched successfully:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    return null;
  }
}

async function createUserProfile(userId) {
  if (!supabase || !currentUser) {
    throw new Error('Cannot create profile: missing user data');
  }

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
      // If profile already exists, just fetch it
      if (error.code === '23505') {
        console.log('Profile already exists, fetching...');
        return await getUserProfile(userId);
      }
      console.error('Profile creation error:', error);
      throw error;
    }
    
    console.log('Successfully created new user profile');
    return data;
    
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new Error(`Failed to create user profile: ${error.message}`);
  }
}

async function getUserOrders(userId) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user orders:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getUserOrders:', error);
    return [];
  }
}

// ==========================================
// 6. AUTHENTICATION UI SETUP
// ==========================================

function setupAuthUI() {
  const modal = document.getElementById('modal');
  const openModalBtn = document.getElementById('openModal');
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');

  if (!modal || !openModalBtn) {
    console.log('Auth modal elements not found');
    return;
  }

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
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<div class="loading-spinner"></div> Loading...';
    button.style.opacity = '0.7';
  } else {
    button.disabled = false;
    button.textContent = originalText;
    button.style.opacity = '1';
  }
}

// ==========================================
// 7. FORM TOGGLE & MODAL MANAGEMENT
// ==========================================

function setupFormToggle() {
  const signinForm = document.getElementById("signin-form");
  const registerForm = document.getElementById("register-form");
  const formTitle = document.getElementById("form-title");
  const toggleText = document.querySelector(".toggle-text");

  if (!signinForm || !registerForm || !formTitle || !toggleText) {
    console.log('Form elements not found for toggle');
    return;
  }

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
    
    clearModalMessage();
    
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
      clearModalMessage();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = 'none';
      modal.classList.remove("open");
      clearModalMessage();
      resetAuthForms();
    });
  }

  if (modal) {
    modal.addEventListener("click", function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.classList.remove("open");
        clearModalMessage();
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
// 8. AUTHENTICATION HANDLERS
// ==========================================

async function handleSignIn(email, password) {
  if (!supabase) {
    showModalMessage('Authentication service not available. Please refresh the page.', 'error');
    return;
  }

  if (!email || !password) {
    showModalMessage('Please fill in all fields.', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showModalMessage('Please enter a valid email address.', 'error');
    return;
  }

  try {
    showModalMessage('Signing in...', 'info');

    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) throw error;

    showModalMessage('✅ Sign in successful!', 'success');
    
    setTimeout(() => {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
      }
      clearModalMessage();
      resetAuthForms();
    }, 1500);

  } catch (error) {
    console.error('❌ Sign in error:', error);
    
    let errorMessage = 'Sign in failed. ';
    if (error.message.includes('Invalid login credentials')) {
      errorMessage += 'Invalid email or password.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage += 'Please confirm your email address first.';
    } else {
      errorMessage += error.message;
    }
    
    showModalMessage(errorMessage, 'error');
  }
}

async function handleRegister(name, email, password, confirmPassword) {
  if (!supabase) {
    showModalMessage('Authentication service not available. Please refresh the page.', 'error');
    return;
  }

  if (!name || !email || !password || !confirmPassword) {
    showModalMessage('Please fill in all fields.', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showModalMessage('Please enter a valid email address.', 'error');
    return;
  }

  if (password.length < 6) {
    showModalMessage('Password must be at least 6 characters long.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showModalMessage('Passwords do not match.', 'error');
    return;
  }

  try {
    showModalMessage('Creating your account...', 'info');

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
      showModalMessage('✅ Success! Please check your email to confirm your account before signing in.', 'success');
    } else {
      showModalMessage('✅ Registration successful! Welcome!', 'success');
      setTimeout(() => {
        const modal = document.getElementById('modal');
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('open');
        }
        clearModalMessage();
        resetAuthForms();
      }, 2000);
    }

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    let errorMessage = 'Registration failed. ';
    if (error.message.includes('User already registered')) {
      errorMessage += 'An account with this email already exists.';
    } else {
      errorMessage += error.message;
    }
    
    showModalMessage(errorMessage, 'error');
  }
}

async function handleLogout(e) {
  if (e) e.preventDefault();
  
  if (!supabase) {
    alert('Authentication service not available.');
    return;
  }

  if (!confirm('Are you sure you want to sign out?')) {
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    alert('Error signing out: ' + error.message);
  }
}

// ==========================================
// 9. PROFILE MODAL & SETTINGS - FIXED
// ==========================================

function createProfileModal() {
  if (document.getElementById('userProfileModal')) return;

  const countryOptions = COUNTRY_LIST.map(c => 
    `<option value="${c.code}" data-iso="${c.iso}">${c.iso} ${c.code} - ${c.label}</option>`
  ).join('\n');

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
            <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
              <select id="countryCodeSelect" style="padding:10px; border-radius:8px; border:1px solid #f4d7df; background:#fff; min-width:180px; font-size:13px;">
                ${countryOptions}
              </select>
              <input type="tel" id="phoneInput" placeholder="7XXXXXXXX" style="flex:1; min-width:150px; padding:10px; border:1px solid #efe7ea; border-radius:8px; font-size:14px;">
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

          <div style="margin-bottom:16px; padding:14px; background:#fff; border-radius:8px; border:1px solid #f2f2f2;">
            <h3 style="margin:0 0 10px 0; color:#222; font-size:15px;">Order History</h3>
            <div id="orderHistoryContainer">
              <div style="text-align:center; padding:20px; color:#666;">
                <p>Loading order history...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const style = document.createElement('style');
  style.textContent = `
    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const closeBtn = document.getElementById('closeProfileModal');
  if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
  
  const modalRoot = document.getElementById('userProfileModal');
  if (modalRoot) {
    modalRoot.addEventListener('click', function(e) {
      if (e.target.id === 'userProfileModal') closeProfileModal();
    });
  }

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
  
  if (!currentUser) {
    alert('Please sign in to open profile settings.');
    return;
  }
  
  modal.style.display = 'flex';
  loadUserProfile();
  loadOrderHistory();
}

function closeProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  
  modal.style.display = 'none';
  
  const phoneMessage = document.getElementById('phoneMessage');
  const passwordMessage = document.getElementById('passwordMessage');
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmNewPassword = document.getElementById('confirmNewPassword');
  
  if (phoneMessage) phoneMessage.textContent = '';
  if (passwordMessage) passwordMessage.textContent = '';
  if (currentPassword) currentPassword.value = '';
  if (newPassword) newPassword.value = '';
  if (confirmNewPassword) confirmNewPassword.value = '';
}

async function loadUserProfile() {
  if (!currentUser) return;

  try {
    const nameSource = currentUser.user_metadata?.full_name || currentUser.email || 'User';
    const initial = nameSource.charAt(0).toUpperCase();
    
    const avatar = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    
    if (avatar) avatar.textContent = initial;
    if (nameEl) nameEl.textContent = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
    if (emailEl) emailEl.textContent = currentUser.email || '';

    if (currentUserProfile) {
      const phoneField = currentUserProfile.phone || '';
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
  } catch (error) {
    console.error('❌ Error loading user profile:', error);
  }
}

async function loadOrderHistory() {
  if (!currentUser) return;
  
  const container = document.getElementById('orderHistoryContainer');
  if (!container) return;

  try {
    container.innerHTML = '<div style="text-align:center; padding:10px; color:#666;">Loading orders...</div>';
    
    const orders = await getUserOrders(currentUser.id);
    
    if (orders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#666;">
          <p style="margin:0;">No orders found</p>
          <p style="margin:10px 0 0 0; font-size:14px;">Start shopping to see your order history here!</p>
        </div>
      `;
      return;
    }

    let ordersHTML = '';
    
    orders.forEach(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const statusColor = order.payment_status === 'paid' ? UI.success : 
                         order.payment_status === 'pending' ? '#ff9800' : UI.danger;
      
      ordersHTML += `
        <div style="border:1px solid #eee; border-radius:8px; padding:16px; margin-bottom:12px; background:#fafafa;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <strong style="color:#222; font-size:14px;">Order #${order.id.slice(-8)}</strong>
              <p style="margin:4px 0 0 0; color:#666; font-size:12px;">${orderDate}</p>
            </div>
            <span style="background:${statusColor}; color:white; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700;">
              ${order.payment_status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <p style="margin:0; color:#444; font-size:13px;">
                Product ID: ${order.product_id || 'N/A'}
              </p>
              <p style="margin:4px 0 0 0; color:#444; font-size:13px;">
                Quantity: ${order.quantity || 1}
              </p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0; color:#222; font-size:14px; font-weight:700;">
                Total: ${((order.total_amount || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = ordersHTML;
    
  } catch (error) {
    console.error('❌ Error loading order history:', error);
    container.innerHTML = `
      <div style="text-align:center; padding:20px; color:${UI.danger};">
        <p>Error loading order history</p>
      </div>
    `;
  }
}

// ==========================================
// 10. PROFILE UPDATE HANDLERS - FIXED
// ==========================================

async function handleUpdatePhone() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneInput = document.getElementById('phoneInput');
  const phoneRaw = phoneInput.value.trim();
  const message = document.getElementById('phoneMessage');
  const updateBtn = document.getElementById('updatePhoneBtn');

  if (!phoneRaw) {
    showMessage(message, 'Please enter a phone number.', 'error');
    return;
  }

  if (!currentUser) {
    showMessage(message, 'Please sign in to update your phone number.', 'error');
    return;
  }

  const originalText = updateBtn.textContent;
  setButtonLoading(updateBtn, true);

  try {
    let normalized = phoneRaw.replace(/\s|-/g, '');
    if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
    const country = countrySelect ? countrySelect.value : '+250';
    if (!/^\+/.test(normalized)) normalized = country + normalized;

    if (country === '+250') {
      if (!/^\+2507\d{8}$/.test(normalized)) {
        throw new Error('Enter a valid Rwandan mobile number (e.g. +2507xxxxxxxx).');
      }
    } else {
      if (!/^\+\d{5,15}$/.test(normalized)) {
        throw new Error('Enter a valid international phone number.');
      }
    }

    // FIX: Corrected update query - REMOVED auth.updateUser that causes loops
    const { error } = await supabase
      .from('profiles')
      .update({ 
        phone: normalized,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (error) {
      console.error('Phone update error:', error);
      throw error;
    }

    // Refresh profile data
    currentUserProfile = await getUserProfile(currentUser.id);
    
    showMessage(message, 'Phone number updated successfully!', 'success');
    
  } catch (error) {
    console.error('Error updating phone:', error);
    showMessage(message, error.message || 'Failed to update phone number.', 'error');
  } finally {
    setButtonLoading(updateBtn, false, originalText);
  }
}

async function handleChangePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  const message = document.getElementById('passwordMessage');
  const changeBtn = document.getElementById('changePasswordBtn');

  message.textContent = '';

  if (!currentPassword || !newPassword || !confirmPassword) {
    showMessage(message, 'Please fill in all password fields', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showMessage(message, 'New password must be at least 6 characters', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage(message, 'New passwords do not match', 'error');
    return;
  }

  const originalText = changeBtn.textContent;
  setButtonLoading(changeBtn, true);

  try {
    showMessage(message, 'Changing password...', 'info');

    const signInResult = await supabase.auth.signInWithPassword({ 
      email: currentUser.email, 
      password: currentPassword 
    });
    
    if (signInResult.error) {
      throw new Error('Current password is incorrect');
    }

    const { error } = await supabase.auth.updateUser({ 
      password: newPassword 
    });
    
    if (error) throw error;

    showMessage(message, '✅ Password changed successfully!', 'success');
    
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
    
  } catch (error) {
    console.error('❌ Change password error:', error);
    showMessage(message, error.message || 'Password change failed', 'error');
  } finally {
    setButtonLoading(changeBtn, false, originalText);
  }
}

// ==========================================
// 11. UI UPDATE FUNCTIONS
// ==========================================

async function updateUIForLoggedInUser(user) {
  const openModalBtn = document.getElementById('openModal');
  if (!openModalBtn) {
    console.error('❌ Sign-in button not found');
    return;
  }

  const displayName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();
  
  const isAdmin = currentUserProfile?.is_admin === true;
  
  const adminBadge = isAdmin ? '<span style="background: #ff9db1; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Admin</span>' : '';

  // Create a list item to replace the button
  const userMenuHTML = `
    <li id="userMenuContainer" style="position:relative; list-style:none;">
      <button id="userAvatarBtn" aria-label="Open user menu" 
        style="width:48px; height:48px; border-radius:50%; background:${UI.avatarPink}; color:#fff; border:3px solid #fff; cursor:pointer; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 30px rgba(255,125,167,0.12);">
        ${initial}
      </button>

      <div id="userDropdown" style="display:none; position:absolute; top:60px; right:0; background:${UI.dropdownBg}; border-radius:14px; box-shadow:0 18px 50px rgba(0,0,0,0.12); width:220px; z-index:1000; overflow:visible;">
        <div style="padding:14px 16px; border-radius:14px 14px 0 0; background:linear-gradient(180deg, rgba(255,249,250,1), #fff);">
          <div style="display: flex; align-items: center; flex-wrap: wrap;">
            <p style="margin:0; font-weight:800; color:#221; font-size:15px; line-height:1.4;">${displayName}</p>
            ${adminBadge}
          </div>
          <p style="margin:6px 0 0 0; font-size:13px; color:#6b6b6b; word-break:break-all;">${user.email || ''}</p>
        </div>

        <div style="padding:12px; display:flex; flex-direction:column; gap:8px;">
          ${isAdmin ? `
            <button id="adminPanelBtn" style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; box-shadow:0 6px 18px rgba(0,0,0,0.06); width:100%;">
              <span style="width:28px; height:28px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background: #6b3fb0; color:#fff; font-size:14px;">⚙️</span>
              <span style="color:#333; text-align:left;">Admin Panel</span>
            </button>
          ` : ''}
          
          <button id="viewProfileBtn" style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; box-shadow:0 6px 18px rgba(0,0,0,0.06); width:100%;">
            <span style="width:28px; height:28px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background: #6b3fb0; color:#fff; font-size:14px;">👤</span>
            <span style="color:#333; text-align:left;">View Profile</span>
          </button>

          <button id="logoutBtn" style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:30px; background:#fff; border:1px solid ${UI.subtleGray}; cursor:pointer; font-size:14px; color:${UI.danger}; box-shadow:0 6px 18px rgba(0,0,0,0.04); width:100%;">
            <span style="width:28px; height:28px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background:#ffdcd3; color:${UI.danger}; font-size:14px;">🚪</span>
            <span style="color:${UI.danger}; text-align:left;">Logout</span>
          </button>
        </div>
      </div>
    </li>
  `;

  // Replace the button with the user menu
  openModalBtn.outerHTML = userMenuHTML;
  
  console.log('✅ UI updated for logged in user');
  
  // Attach event handlers after DOM update
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
      openProfileModal();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

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
      modal.classList.add('open');
    });
  }
}

// ==========================================
// 12. MESSAGE & NOTIFICATION SYSTEM
// ==========================================

function showMessage(element, text, type = 'info') {
  if (!element) return;
  
  element.textContent = text;
  element.style.display = 'block';
  
  const colors = {
    error: { color: UI.danger },
    success: { color: UI.success },
    warning: { color: UI.warning },
    info: { color: UI.primaryPink }
  };
  
  const style = colors[type] || colors.info;
  element.style.color = style.color;
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
  messageDiv.style.display = 'block';
  
  const colors = {
    error: { bg: '#ffecec', text: UI.danger, border: '#f2a1a1' },
    success: { bg: '#e8f5e9', text: UI.success, border: '#a8e0b5' },
    info: { bg: '#fff4f7', text: UI.primaryPink, border: '#ffd1dc' },
    warning: { bg: '#fff4e5', text: UI.warning, border: '#ffcc80' }
  };
  
  const color = colors[type] || colors.info;
  messageDiv.style.backgroundColor = color.bg;
  messageDiv.style.color = color.text;
  messageDiv.style.border = `1px solid ${color.border}`;
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
  
  const colors = {
    error: { bg: '#ffecec', text: UI.danger, border: '#f2a1a1' },
    success: { bg: '#e8f5e9', text: UI.success, border: '#a8e0b5' },
    info: { bg: '#fff4f7', text: UI.primaryPink, border: '#ffd1dc' },
    warning: { bg: '#fff4e5', text: UI.warning, border: '#ffcc80' }
  };
  
  const color = colors[type] || colors.info;
  messageContainer.style.backgroundColor = color.bg;
  messageContainer.style.color = color.text;
  messageContainer.style.border = `1px solid ${color.border}`;
  messageContainer.textContent = text;
  messageContainer.style.display = 'block';
  
  setTimeout(() => {
    messageContainer.style.display = 'none';
  }, 5000);
}

// ==========================================
// 13. UTILITY FUNCTIONS
// ==========================================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


// ==========================================
// 14. CART INITIALIZATION (STUB)
// ==========================================

function initializeCart() {
  // Add your cart initialization logic here
  console.log('Cart initialized');
}


// ==========================================
// 14. CART INITIALIZATION (STUB)
// ==========================================

function initializeCart() {
  // Add your cart initialization logic here
  console.log('Cart initialized');
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












