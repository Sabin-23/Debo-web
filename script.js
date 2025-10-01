// ==========================================
// SUPABASE AUTHENTICATION WITH USER PROFILE
// ==========================================

// Supabase Configuration
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;

// Wait for page to fully load
window.addEventListener('load', function() {
    console.log('Page loaded, initializing auth...');
    initializeSupabaseAuth();
});

function initializeSupabaseAuth() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✓ Supabase initialized successfully');
        setupAuthUI();
        createProfileModal();
    } else {
        console.error('✗ Supabase library not loaded!');
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
        console.log('Auth modal not found on this page');
        return;
    }

    checkAuthStatus();

    // Modal controls
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

    // Toggle functionality
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
        if (newToggle) {
            newToggle.addEventListener('click', handleToggle);
        }
        clearModalMessage();
    }

    if (toggle) {
        toggle.addEventListener('click', handleToggle);
    }

    // Form handlers
    if (signinForm) {
        signinForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = signinForm.querySelectorAll('input');
            const email = inputs[0].value.trim();
            const password = inputs[1].value;
            await handleSignIn(email, password);
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
            await handleRegister(name, email, password, confirmPassword);
        });
    }

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

// === CREATE PROFILE MODAL ===
function createProfileModal() {
    // Check if modal already exists
    if (document.getElementById('userProfileModal')) return;

    const modalHTML = `
        <div id="userProfileModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <div style="padding: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h2 style="margin: 0; color: #333; font-size: 24px;">Account Settings</h2>
                        <button id="closeProfileModal" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666;">&times;</button>
                    </div>

                    <!-- User Info Section -->
                    <div style="margin-bottom: 30px;">
                        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                            <div id="userAvatar" style="width: 80px; height: 80px; border-radius: 50%; background: #088178; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold;"></div>
                            <div>
                                <h3 id="userName" style="margin: 0 0 5px 0; color: #333;">Loading...</h3>
                                <p id="userEmail" style="margin: 0; color: #666;">Loading...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Phone Number Section -->
                    <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Phone Number</h3>
                        <div style="display: flex; gap: 10px;">
                            <input type="tel" id="phoneInput" placeholder="+1234567890" style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                            <button id="updatePhoneBtn" style="padding: 12px 24px; background: #088178; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Update</button>
                        </div>
                        <p id="phoneMessage" style="margin: 10px 0 0 0; font-size: 13px;"></p>
                    </div>

                    <!-- Change Password Section -->
                    <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Change Password</h3>
                        <input type="password" id="currentPassword" placeholder="Current Password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px; font-size: 14px; box-sizing: border-box;">
                        <input type="password" id="newPassword" placeholder="New Password (min 6 characters)" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px; font-size: 14px; box-sizing: border-box;">
                        <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; font-size: 14px; box-sizing: border-box;">
                        <button id="changePasswordBtn" style="padding: 12px 24px; background: #088178; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%;">Change Password</button>
                        <p id="passwordMessage" style="margin: 10px 0 0 0; font-size: 13px;"></p>
                    </div>

                    <!-- Delete Account Section -->
                    <div style="padding: 20px; background: #fff5f5; border: 1px solid #fee; border-radius: 8px;">
                        <h3 style="margin: 0 0 10px 0; color: #c62828; font-size: 18px;">Danger Zone</h3>
                        <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">Once you delete your account, there is no going back. Please be certain.</p>
                        <button id="deleteAccountBtn" style="padding: 12px 24px; background: #c62828; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Delete My Account</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach event listeners
    document.getElementById('closeProfileModal').addEventListener('click', closeProfileModal);
    document.getElementById('userProfileModal').addEventListener('click', function(e) {
        if (e.target.id === 'userProfileModal') closeProfileModal();
    });
    document.getElementById('updatePhoneBtn').addEventListener('click', handleUpdatePhone);
    document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
    document.getElementById('deleteAccountBtn').addEventListener('click', handleDeleteAccount);
}

// === PROFILE MODAL FUNCTIONS ===

function openProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal && currentUser) {
        modal.style.display = 'flex';
        loadUserProfile();
    }
}

function closeProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.style.display = 'none';
        // Clear form fields
        document.getElementById('phoneInput').value = '';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
        document.getElementById('phoneMessage').textContent = '';
        document.getElementById('passwordMessage').textContent = '';
    }
}

async function loadUserProfile() {
    if (!currentUser) return;

    // Set avatar
    const initial = (currentUser.user_metadata?.full_name || currentUser.email).charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = initial;

    // Set name and email
    document.getElementById('userName').textContent = currentUser.user_metadata?.full_name || 'User';
    document.getElementById('userEmail').textContent = currentUser.email;

    // Load phone number
    const phone = currentUser.user_metadata?.phone || currentUser.phone || '';
    document.getElementById('phoneInput').value = phone;
}

async function handleUpdatePhone() {
    const phone = document.getElementById('phoneInput').value.trim();
    const message = document.getElementById('phoneMessage');

    if (!phone) {
        message.style.color = '#c62828';
        message.textContent = 'Please enter a phone number';
        return;
    }

    try {
        const { data, error } = await supabase.auth.updateUser({
            data: { phone: phone }
        });

        if (error) throw error;

        message.style.color = '#2e7d32';
        message.textContent = 'Phone number updated successfully!';
        currentUser = data.user;

    } catch (error) {
        message.style.color = '#c62828';
        message.textContent = error.message;
    }
}

async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const message = document.getElementById('passwordMessage');

    if (!currentPassword || !newPassword || !confirmPassword) {
        message.style.color = '#c62828';
        message.textContent = 'Please fill in all password fields';
        return;
    }

    if (newPassword.length < 6) {
        message.style.color = '#c62828';
        message.textContent = 'New password must be at least 6 characters';
        return;
    }

    if (newPassword !== confirmPassword) {
        message.style.color = '#c62828';
        message.textContent = 'New passwords do not match';
        return;
    }

    try {
        // First verify current password by trying to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });

        if (signInError) throw new Error('Current password is incorrect');

        // Update password
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        message.style.color = '#2e7d32';
        message.textContent = 'Password changed successfully!';

        // Clear fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';

    } catch (error) {
        message.style.color = '#c62828';
        message.textContent = error.message;
    }
}

async function handleDeleteAccount() {
    const confirmed = confirm('Are you absolutely sure you want to delete your account? This action cannot be undone!');
    
    if (!confirmed) return;

    const doubleConfirm = confirm('This is your last chance. Delete account permanently?');
    
    if (!doubleConfirm) return;

    try {
        // Note: Supabase doesn't have a direct deleteUser method in client SDK
        // You need to set up a server-side function or use Supabase admin API
        // For now, we'll sign out and show a message
        
        alert('Account deletion requires server-side setup. Please contact support to delete your account, or we can set up a Supabase Edge Function for this.');
        
        // Sign out
        await supabase.auth.signOut();
        closeProfileModal();

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// === AUTH FUNCTIONS ===

async function handleSignIn(email, password) {
    if (!supabase) {
        showModalMessage('Authentication not available', 'error');
        return;
    }

    showModalMessage('Signing in...', 'info');

    try {
        if (!email || !password) throw new Error('Please fill in all fields');
        if (!isValidEmail(email)) throw new Error('Please enter a valid email address');

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        showModalMessage('Sign in successful!', 'success');
        
        setTimeout(() => {
            const modal = document.getElementById('modal');
            if (modal) modal.style.display = 'none';
            clearModalMessage();
        }, 1500);

    } catch (error) {
        showModalMessage(error.message || 'Sign in failed', 'error');
    }
}

async function handleRegister(name, email, password, confirmPassword) {
    if (!supabase) {
        showModalMessage('Authentication not available', 'error');
        return;
    }

    showModalMessage('Creating account...', 'info');

    try {
        if (!name || !email || !password || !confirmPassword) {
            throw new Error('Please fill in all fields');
        }
        if (!isValidEmail(email)) throw new Error('Please enter a valid email address');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (password !== confirmPassword) throw new Error('Passwords do not match');

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });

        if (error) throw error;

        if (data.user && !data.session) {
            showModalMessage('Success! Please check your email to confirm your account.', 'success');
        } else {
            showModalMessage('Registration successful!', 'success');
            setTimeout(() => {
                const modal = document.getElementById('modal');
                if (modal) modal.style.display = 'none';
                clearModalMessage();
            }, 1500);
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
        alert('Error logging out');
    }
}

// === UI UPDATE FUNCTIONS ===

async function checkAuthStatus() {
    if (!supabase) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            currentUser = session.user;
            updateUIForLoggedInUser(session.user);
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

function updateUIForLoggedInUser(user) {
    const openModalBtn = document.getElementById('openModal');
    
    if (openModalBtn) {
        const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
        const initial = displayName.charAt(0).toUpperCase();
        
        openModalBtn.outerHTML = `
            <div id="userMenuContainer" style="position: relative; display: flex; align-items: center; gap: 15px;">
                <button id="userAvatarBtn" style="width: 40px; height: 40px; border-radius: 50%; background: #088178; color: white; border: none; cursor: pointer; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center;">${initial}</button>
                <div id="userDropdown" style="display: none; position: absolute; top: 50px; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 200px; z-index: 1000;">
                    <div style="padding: 15px; border-bottom: 1px solid #eee;">
                        <p style="margin: 0; font-weight: 600; color: #333;">${displayName}</p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">${user.email}</p>
                    </div>
                    <button id="viewProfileBtn" style="width: 100%; padding: 12px 15px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; color: #333; display: flex; align-items: center; gap: 10px;">
                        <span>👤</span> View Profile
                    </button>
                    <button id="logoutBtn" style="width: 100%; padding: 12px 15px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; color: #c62828; border-top: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                        <span>🚪</span> Logout
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const avatarBtn = document.getElementById('userAvatarBtn');
        const dropdown = document.getElementById('userDropdown');
        const viewProfileBtn = document.getElementById('viewProfileBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        avatarBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        viewProfileBtn.addEventListener('click', function() {
            dropdown.style.display = 'none';
            openProfileModal();
        });
        
        logoutBtn.addEventListener('click', handleLogout);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdown.style.display = 'none';
        });
    }
}

function updateUIForLoggedOutUser() {
    const userMenu = document.getElementById('userMenuContainer');
    
    if (userMenu) {
        userMenu.outerHTML = '<button id="openModal">Sign-in/Register</button>';
        
        const newOpenModalBtn = document.getElementById('openModal');
        const modal = document.getElementById('modal');
        
        if (newOpenModalBtn && modal) {
            newOpenModalBtn.addEventListener('click', function(e) {
                e.preventDefault();
                modal.style.display = 'flex';
            });
        }
    }
}

// === MESSAGE FUNCTIONS ===

function showModalMessage(text, type = 'info') {
    const modal = document.getElementById('modal');
    if (!modal) return;

    let messageDiv = modal.querySelector('.auth-message');
    
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.className = 'auth-message';
        messageDiv.style.cssText = 'padding: 12px; margin: 10px 0; border-radius: 6px; text-align: center; font-weight: 500;';
        
        const authContainer = modal.querySelector('.auth-container');
        const formTitle = modal.querySelector('#form-title');
        if (authContainer && formTitle) {
            formTitle.insertAdjacentElement('afterend', messageDiv);
        }
    }

    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    
    const colors = {
        error: { bg: '#ffebee', text: '#c62828', border: '#ef5350' },
        success: { bg: '#e8f5e9', text: '#2e7d32', border: '#66bb6a' },
        info: { bg: '#e3f2fd', text: '#1565c0', border: '#42a5f5' }
    };
    
    const color = colors[type] || colors.info;
    messageDiv.style.backgroundColor = color.bg;
    messageDiv.style.color = color.text;
    messageDiv.style.border = `2px solid ${color.border}`;
}

function clearModalMessage() {
    const modal = document.getElementById('modal');
    if (!modal) return;

    const messageDiv = modal.querySelector('.auth-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==========================================
// YOUR EXISTING SCRIPT.JS CODE BELOW
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
    toggleText.innerHTML = 'Don’t have an account? <span id="toggle">Register</span>';
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




