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
// SUPABASE AUTHENTICATION SYSTEM
// Complete solution with profile management, order history, and cart
// ==========================================

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================

// Supabase project configuration - Replace with your actual credentials
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

// Global state variables to track user session and data
let supabase = null;        // Supabase client instance
let currentUser = null;     // Currently logged in user from Supabase Auth
let currentUserProfile = null; // User profile data from profiles table

// UI color scheme for consistent styling
const UI = {
  primaryPink: '#ff9db1',   // Main brand color
  pinkSoft: '#fff0f3',      // Light pink for backgrounds
  avatarPink: '#ff7da7',    // Avatar circle color
  dropdownBg: '#ffffff',    // Dropdown background
  subtleGray: '#f6f3f4',    // Subtle borders and backgrounds
  danger: '#c62828',        // Error and danger states
  success: '#2e7d32',       // Success messages
  warning: '#ff9800'        // Warning states
};

// ==========================================
// 2. COUNTRY DATA FOR PHONE NUMBER INPUT
// ==========================================

// Comprehensive list of countries with ISO codes, phone codes, and labels
// Used for the country code dropdown in profile settings
const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'AF', code: '+93', label: 'Afghanistan' },
  // ... (include all other countries from your original list)
  // For brevity, I'm showing just Rwanda but you should include all countries
  { iso: 'ZW', code: '+263', label: 'Zimbabwe' }
];

// ==========================================
// 3. INITIALIZATION & SETUP
// ==========================================

/**
 * Main initialization function that runs when page loads
 * Sets up Supabase client, event listeners, and checks auth status
 */
window.addEventListener('load', function() {
  console.log('🔧 Initializing application...');
  initializeSupabaseAuth();
  setupFormToggle();
  setupModalHandlers();
  initializeCart();
});

/**
 * Initializes the Supabase client and sets up authentication system
 * This must be called before any auth-related operations
 */
function initializeSupabaseAuth() {
  // Check if Supabase library is loaded
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded');
    showGlobalMessage('Authentication service not available. Please refresh the page.', 'error');
    return;
  }

  try {
    // Create Supabase client instance with project credentials
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized successfully');
    
    // Set up authentication state listener for login/logout events
    setupAuthStateListener();
    
    // Initialize UI components and check current authentication status
    setupAuthUI();
    createProfileModal();
    checkAuthStatus();
    
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    showGlobalMessage('Failed to initialize authentication. Please refresh the page.', 'error');
  }
}

// ==========================================
// 4. AUTHENTICATION STATE MANAGEMENT
// ==========================================

/**
 * Sets up listener for authentication state changes
 * Handles user sign in, sign out, token refresh, and profile loading
 */
function setupAuthStateListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Auth state changed:', event);
    
    switch (event) {
      case 'SIGNED_IN':
        currentUser = session.user;
        try {
          // 🔧 CRITICAL FIX: Get or create user profile
          currentUserProfile = await getUserProfile(currentUser.id);
          if (!currentUserProfile) {
            // Profile doesn't exist - create it automatically
            console.log('📝 Creating new user profile...');
            currentUserProfile = await createUserProfile(currentUser.id);
          }
          updateUIForLoggedInUser(currentUser);
          showGlobalMessage('✅ Successfully signed in!', 'success');
        } catch (error) {
          console.error('❌ Error during sign-in process:', error);
          showGlobalMessage('⚠️ Signed in but profile issues detected.', 'warning');
        }
        break;
        
      case 'SIGNED_OUT':
        currentUser = null;
        currentUserProfile = null;
        updateUIForLoggedOutUser();
        showGlobalMessage('👋 Successfully signed out.', 'info');
        break;
        
      case 'USER_UPDATED':
        currentUser = session.user;
        break;
        
      case 'TOKEN_REFRESHED':
        console.log('🔄 Token refreshed');
        break;
    }
  });
}

/**
 * Checks if user has an active session when page loads
 * Useful for page refreshes or returning visitors
 */
async function checkAuthStatus() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session check error:', error);
      return;
    }
    
    // If session exists, load user data and update UI
    if (data.session?.user) {
      currentUser = data.session.user;
      currentUserProfile = await getUserProfile(currentUser.id);
      updateUIForLoggedInUser(currentUser);
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
  }
}

// ==========================================
// 5. USER PROFILE MANAGEMENT
// ==========================================

/**
 * Fetches user profile from the database
 * @param {string} userId - The user's unique ID from Supabase Auth
 * @returns {Object|null} User profile object or null if not found
 */
async function getUserProfile(userId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .timeout(10000); // 10 second timeout

    if (error) {
      // Profile doesn't exist - this is normal for new users
      if (error.code === 'PGRST116') {
        console.log('📝 No existing profile found for user:', userId);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    throw new Error(`Failed to load user profile: ${error.message}`);
  }
}

/**
 * Creates a new user profile in the database
 * Called automatically when user signs up or if profile is missing
 * @param {string} userId - The user's unique ID from Supabase Auth
 * @returns {Object} The newly created profile
 */
async function createUserProfile(userId) {
  if (!supabase || !currentUser) {
    throw new Error('Cannot create profile: missing user data');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
          phone: null,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ Successfully created new user profile');
    return data;
    
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    throw new Error(`Failed to create user profile: ${error.message}`);
  }
}

/**
 * Fetches user's order history from the database
 * @param {string} userId - The user's unique ID
 * @returns {Array} Array of order objects
 */
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

/**
 * Sets up authentication UI event listeners
 * Handles form submissions for sign in and register
 */
function setupAuthUI() {
  const modal = document.getElementById('modal');
  const openModalBtn = document.getElementById('openModal');
  const closeModalBtn = document.getElementById('closeModal');
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');

  if (!modal || !openModalBtn) {
    console.log('Auth modal elements not found');
    return;
  }

  // Sign in form submission handler
  if (signinForm) {
    signinForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = signinForm.querySelectorAll('input');
      const email = inputs[0].value.trim();
      const password = inputs[1].value;
      
      // Show loading state on submit button
      const submitBtn = signinForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      setButtonLoading(submitBtn, true);
      await handleSignIn(email, password);
      setButtonLoading(submitBtn, false, originalText);
    });
  }

  // Register form submission handler
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const inputs = registerForm.querySelectorAll('input');
      const name = inputs[0].value.trim();
      const email = inputs[1].value.trim();
      const password = inputs[2].value;
      const confirmPassword = inputs[3].value;
      
      // Show loading state on submit button
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      setButtonLoading(submitBtn, true);
      await handleRegister(name, email, password, confirmPassword);
      setButtonLoading(submitBtn, false, originalText);
    });
  }
}

/**
 * Shows loading state on buttons during async operations
 * @param {HTMLElement} button - The button element
 * @param {boolean} isLoading - Whether to show loading state
 * @param {string} originalText - Original button text to restore
 */
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

/**
 * Sets up toggle functionality between sign in and register forms
 * Handles form switching and UI updates
 */
function setupFormToggle() {
  const signinForm = document.getElementById("signin-form");
  const registerForm = document.getElementById("register-form");
  const formTitle = document.getElementById("form-title");
  const toggleText = document.querySelector(".toggle-text");

  if (!signinForm || !registerForm || !formTitle || !toggleText) {
    console.log('Form elements not found for toggle');
    return;
  }

  /**
   * Switches between sign in and register forms
   * Updates form title and toggle link text
   */
  function switchForms() {
    if (signinForm.classList.contains("active")) {
      // Switch to register form
      signinForm.classList.remove("active");
      registerForm.classList.add("active");
      formTitle.textContent = "Create Account";
      toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
    } else {
      // Switch to sign in form
      registerForm.classList.remove("active");
      signinForm.classList.add("active");
      formTitle.textContent = "Sign In";
      toggleText.innerHTML = 'Don\'t have an account? <span id="toggle">Register</span>';
    }
    
    clearModalMessage();
    
    // Re-bind toggle span since innerHTML is replaced
    const newToggle = document.getElementById("toggle");
    if (newToggle) newToggle.addEventListener("click", switchForms);
  }

  // Initial bind for toggle link
  const toggle = document.getElementById("toggle");
  if (toggle) {
    toggle.addEventListener("click", switchForms);
  }
}

/**
 * Sets up modal open/close handlers
 * Manages authentication modal behavior
 */
function setupModalHandlers() {
  const openBtn = document.getElementById("openModal");
  const closeBtn = document.getElementById("closeModal");
  const modal = document.getElementById("modal");

  // Open modal when sign in button is clicked
  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      modal.style.display = 'flex';
      modal.classList.add("open");
      clearModalMessage();
    });
  }

  // Close modal when close button is clicked
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = 'none';
      modal.classList.remove("open");
      clearModalMessage();
      resetAuthForms();
    });
  }

  // Close modal when clicking outside content
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

/**
 * Resets authentication forms to clean state
 */
function resetAuthForms() {
  const signinForm = document.getElementById('signin-form');
  const registerForm = document.getElementById('register-form');
  
  if (signinForm) signinForm.reset();
  if (registerForm) registerForm.reset();
}

// ==========================================
// 8. AUTHENTICATION HANDLERS
// ==========================================

/**
 * Handles user sign in with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 */
async function handleSignIn(email, password) {
  if (!supabase) {
    showModalMessage('Authentication service not available. Please refresh the page.', 'error');
    return;
  }

  // Input validation
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

    // Attempt to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) throw error;

    showModalMessage('✅ Sign in successful!', 'success');
    
    // Close modal after successful sign in
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
    
    // User-friendly error messages
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

/**
 * Handles new user registration
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} confirmPassword - Password confirmation
 */
async function handleRegister(name, email, password, confirmPassword) {
  if (!supabase) {
    showModalMessage('Authentication service not available. Please refresh the page.', 'error');
    return;
  }

  // Comprehensive validation
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

    // Create user with Supabase Auth
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

    // Handle different registration scenarios
    if (data.user && !data.session) {
      // Email confirmation required
      showModalMessage('✅ Success! Please check your email to confirm your account before signing in.', 'success');
    } else {
      // Automatic sign in after registration
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
    
    // User-friendly error messages
    let errorMessage = 'Registration failed. ';
    if (error.message.includes('User already registered')) {
      errorMessage += 'An account with this email already exists.';
    } else {
      errorMessage += error.message;
    }
    
    showModalMessage(errorMessage, 'error');
  }
}

/**
 * Handles user logout with confirmation
 * @param {Event} e - Click event
 */
async function handleLogout(e) {
  if (e) e.preventDefault();
  
  if (!supabase) {
    alert('Authentication service not available.');
    return;
  }

  // Confirm logout action
  if (!confirm('Are you sure you want to sign out?')) {
    return;
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Auth state listener will handle UI update automatically
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    alert('Error signing out: ' + error.message);
  }
}

// ==========================================
// 9. PROFILE MODAL & SETTINGS MANAGEMENT
// ==========================================

/**
 * Creates the profile settings modal dynamically
 * Includes phone number, password change, and order history sections
 */
function createProfileModal() {
  if (document.getElementById('userProfileModal')) return;

  // Generate country options for phone number dropdown
  const countryOptions = COUNTRY_LIST.map(c => 
    `<option value="${c.code}" data-iso="${c.iso}">${c.label} ${c.code}</option>`
  ).join('\n');

  const modalHTML = `
    <div id="userProfileModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:10000; justify-content:center; align-items:center;">
      <div style="background:#fff; border-radius:12px; width:90%; max-width:900px; max-height:90vh; overflow:auto; box-shadow:0 12px 40px rgba(0,0,0,0.25);">
        <div style="padding:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0; color:#222; font-size:20px;">Account Settings</h2>
            <button id="closeProfileModal" style="background:none; border:none; font-size:26px; cursor:pointer; color:#666;">&times;</button>
          </div>

          <!-- User Info Section -->
          <div style="margin-bottom:18px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div id="userAvatar" style="width:64px; height:64px; border-radius:50%; background:${UI.avatarPink}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:26px; font-weight:700; box-shadow:0 6px 18px rgba(0,0,0,0.06); border:3px solid #fff;"></div>
              <div>
                <h3 id="userName" style="margin:0 0 4px 0; color:#222; font-size:16px; font-weight:700;">Loading...</h3>
                <p id="userEmail" style="margin:0; color:#666; font-size:13px;">Loading...</p>
              </div>
            </div>
          </div>

          <!-- Phone Number Section -->
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

          <!-- Change Password Section -->
          <div style="margin-bottom:16px; padding:14px; background:#fff; border-radius:8px; border:1px solid #f2f2f2;">
            <h3 style="margin:0 0 10px 0; color:#222; font-size:15px;">Change Password</h3>
            <input type="password" id="currentPassword" placeholder="Current Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
            <input type="password" id="newPassword" placeholder="New Password (min 6 characters)" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
            <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:10px;">
            <button id="changePasswordBtn" style="width:100%; padding:10px; background:${UI.primaryPink}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Change Password</button>
            <p id="passwordMessage" style="margin:10px 0 0 0; font-size:13px;"></p>
          </div>

          <!-- Order History Section -->
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
  
  // Insert modal HTML into page
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add CSS for loading spinner animation
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

  // Attach event handlers to modal elements
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

  // Set default country to Rwanda
  const countrySelect = document.getElementById('countryCodeSelect');
  if (countrySelect) countrySelect.value = '+250';
}

/**
 * Opens the profile modal and loads user data
 */
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

/**
 * Closes the profile modal and cleans up sensitive data
 */
function closeProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;
  
  modal.style.display = 'none';
  
  // Clear messages and sensitive password fields
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

/**
 * Loads user data into the profile modal
 * Displays user info, avatar, and current phone number
 */
async function loadUserProfile() {
  if (!currentUser) return;

  try {
    const nameSource = currentUser.user_metadata?.full_name || currentUser.email || 'User';
    const initial = nameSource.charAt(0).toUpperCase();
    
    // Update avatar and user info elements
    const avatar = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    
    if (avatar) avatar.textContent = initial;
    if (nameEl) nameEl.textContent = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
    if (emailEl) emailEl.textContent = currentUser.email || '';

    // Load phone number from profile data
    if (currentUserProfile) {
      const phoneField = currentUserProfile.phone || '';
      const phoneInput = document.getElementById('phoneInput');
      const countrySelect = document.getElementById('countryCodeSelect');
      
      if (phoneField && phoneInput) {
        // Parse phone number to extract country code and local number
        const m = phoneField.match(/^\+(\d{1,3})(.*)$/);
        if (m && countrySelect) {
          const code = '+' + m[1];
          const opt = Array.from(countrySelect.options).find(o => o.value === code);
          if (opt) countrySelect.value = code;
          phoneInput.value = m[2].replace(/^0+/, '');
        } else {
          // Fallback to default Rwanda number
          if (countrySelect) countrySelect.value = '+250';
          phoneInput.value = phoneField;
        }
      } else {
        // No phone number set - use defaults
        if (countrySelect) countrySelect.value = '+250';
        if (phoneInput) phoneInput.value = '';
      }
    }
  } catch (error) {
    console.error('❌ Error loading user profile:', error);
  }
}

/**
 * Loads and displays user's order history
 * Fetches orders from database and renders them in the modal
 */
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
    
    // Generate HTML for each order
    orders.forEach(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Color code based on payment status
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
                Total: $${((order.total_amount || 0) / 100).toFixed(2)}
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
// 10. PROFILE UPDATE HANDLERS
// ==========================================

/**
 * Handles phone number updates in user profile
 * Validates phone format and saves to database
 */
async function handleUpdatePhone() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneInput = document.getElementById('phoneInput');
  const phoneRaw = phoneInput.value.trim();
  const message = document.getElementById('phoneMessage');
  const updateBtn = document.getElementById('updatePhoneBtn');

  // Validation
  if (!phoneRaw) {
    showMessage(message, 'Please enter a phone number.', 'error');
    return;
  }

  if (!currentUser) {
    showMessage(message, 'Please sign in to update your phone number.', 'error');
    return;
  }

  // Show loading state on button
  const originalText = updateBtn.textContent;
  setButtonLoading(updateBtn, true);

  try {
    // Normalize phone number format
    let normalized = phoneRaw.replace(/\s|-/g, '');
    if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
    const country = countrySelect ? countrySelect.value : '+250';
    if (!/^\+/.test(normalized)) normalized = country + normalized;

    // Rwanda-specific validation
    if (country === '+250') {
      if (!/^\+2507\d{8}$/.test(normalized)) {
        throw new Error('Enter a valid Rwandan mobile number (e.g. +2507xxxxxxxx).');
      }
    } else {
      // General international validation
      if (!/^\+\d{5,15}$/.test(normalized)) {
        throw new Error('Enter a valid international phone number.');
      }
    }

    // Update phone in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        phone: normalized,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    // Also update in user_metadata for consistency
    await supabase.auth.updateUser({
      data: { phone: normalized }
    });

    // Refresh profile data
    currentUserProfile = await getUserProfile(currentUser.id);
    
    showMessage(message, '✅ Phone number updated successfully!', 'success');
    
  } catch (error) {
    console.error('❌ Error updating phone:', error);
    showMessage(message, error.message || 'Failed to update phone number.', 'error');
  } finally {
    setButtonLoading(updateBtn, false, originalText);
  }
}

/**
 * Handles password change with current password verification
 * Validates inputs and updates password in Supabase Auth
 */
async function handleChangePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  const message = document.getElementById('passwordMessage');
  const changeBtn = document.getElementById('changePasswordBtn');

  // Clear previous messages
  message.textContent = '';

  // Validation
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

  // Show loading state
  const originalText = changeBtn.textContent;
  setButtonLoading(changeBtn, true);

  try {
    showMessage(message, 'Changing password...', 'info');

    // Verify current password is correct
    const signInResult = await supabase.auth.signInWithPassword({ 
      email: currentUser.email, 
      password: currentPassword 
    });
    
    if (signInResult.error) {
      throw new Error('Current password is incorrect');
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({ 
      password: newPassword 
    });
    
    if (error) throw error;

    showMessage(message, '✅ Password changed successfully!', 'success');
    
    // Clear password fields for security
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

/**
 * Updates UI when user is logged in
 * Replaces sign-in button with user avatar and dropdown menu
 * @param {Object} user - The logged-in user object from Supabase
 */
async function updateUIForLoggedInUser(user) {
  const openModalBtn = document.getElementById('openModal');
  if (!openModalBtn) return;

  const displayName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
  const initial = displayName.charAt(0).toUpperCase();
  
  // Check if user has admin privileges
  const isAdmin = currentUserProfile?.is_admin === true;
  
  // Admin badge HTML
  const adminBadge = isAdmin ? '<span style="background: #ff9db1; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Admin</span>' : '';

  // Replace sign-in button with user menu
  openModalBtn.outerHTML = `
    <div id="userMenuContainer" style="position:relative; display:flex; align-items:center; gap:12px;">
      <button id="userAvatarBtn" aria-label="Open user menu" 
        style="width:48px; height:48px; border-radius:50%; background:${UI.avatarPink}; color:#fff; border:3px solid #fff; cursor:pointer; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 30px rgba(255,125,167,0.12);">
        ${initial}
      </button>

      <div id="userDropdown" style="display:none; position:absolute; top:64px; right:0; background:${UI.dropdownBg}; border-radius:14px; box-shadow:0 18px 50px rgba(0,0,0,0.12); width:220px; z-index:1000; overflow:visible;">
        <div style="padding:14px 16px; border-radius:14px; background:linear-gradient(180deg, rgba(255,249,250,1), #fff);">
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
    </div>
  `;

  // Attach event handlers to new user menu elements
  attachUserMenuHandlers();
}

/**
 * Attaches event handlers to user dropdown menu elements
 * Handles menu toggle, profile viewing, and logout actions
 */
function attachUserMenuHandlers() {
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminPanelBtn = document.getElementById('adminPanelBtn');

  // Toggle dropdown visibility with smooth animation
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

  // Admin panel navigation
  if (adminPanelBtn) {
    adminPanelBtn.addEventListener('click', function() {
      if (dropdown) dropdown.style.display = 'none';
      window.location.href = 'admin.html';
    });
  }

  // Open profile modal
  if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', function() {
      if (dropdown) dropdown.style.display = 'none';
      openProfileModal();
    });
  }

  // Handle logout
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

/**
 * Updates UI when user logs out
 * Replaces user menu with sign-in button
 */
function updateUIForLoggedOutUser() {
  const userMenu = document.getElementById('userMenuContainer');
  if (!userMenu) return;
  
  userMenu.outerHTML = '<button id="openModal" style="padding:8px 12px; border-radius:8px; background:transparent; border:1px solid #eee; cursor:pointer;">Sign in</button>';
  
  // Reattach event listener to new sign-in button
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

/**
 * Shows a message in a specific element with styled formatting
 * @param {HTMLElement} element - The element to show the message in
 * @param {string} text - The message text
 * @param {string} type - Message type: 'error', 'success', 'info', 'warning'
 */
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

/**
 * Shows a message in the authentication modal
 * @param {string} text - The message text
 * @param {string} type - Message type: 'error', 'success', 'info', 'warning'
 */
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

/**
 * Clears any messages from the authentication modal
 */
function clearModalMessage() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  
  const message = modal.querySelector('.auth-message'); 
  if (message) message.style.display = 'none';
}

/**
 * Shows a global notification message (toast-style)
 * @param {string} text - The message text
 * @param {string} type - Message type: 'error', 'success', 'info', 'warning'
 */
function showGlobalMessage(text, type = 'info') {
  // Create or find global message container
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
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageContainer.style.display = 'none';
  }, 5000);
}

// ==========================================
// 13. UTILITY FUNCTIONS
// ==========================================

/**
 * Validates email format using regex
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ==========================================
// 14. CART FUNCTIONALITY
// ==========================================

// Cart storage keys for localStorage
const CART_KEY = "local_cart_v1";
const PRODUCTS_KEY = "local_products_v1";

// Cart UI element references
let cartToggle, cartBadge, cartPanel, cartBackdrop, cartClose, cartItemsNode, cartSubtotalNode, checkoutBtn, clearCartBtn;

// Currency formatter for price display
const fmt = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
});

/**
 * Initializes cart functionality and event listeners
 */
function initializeCart() {
  cartToggle = document.getElementById("cart-toggle");
  cartBadge = document.getElementById("cart-badge");
  cartPanel = document.getElementById("cart-panel");
  cartBackdrop = document.getElementById("cart-backdrop");
  cartClose = document.getElementById("cart-close");
  cartItemsNode = document.getElementById("cart-items");
  cartSubtotalNode = document.getElementById("cart-subtotal");
  checkoutBtn = document.getElementById("checkout");
  clearCartBtn = document.getElementById("clear-cart");

  if (!cartToggle) return;

  // Cart toggle event
  cartToggle.addEventListener("click", () => {
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

