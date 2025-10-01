// ==========================================
// SUPABASE AUTHENTICATION WITH USER PROFILE
// Fixed phone saving (uses top-level phone field) + OTP verify + improved UI
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
            // assumes order: name, email, password, confirmPassword
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
        <div id="userProfileModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: #fff; border-radius: 12px; width: 92%; max-width: 760px; max-height: 90vh; overflow-y: auto; box-shadow: 0 6px 30px rgba(0,0,0,0.25);">
                <div style="padding: 22px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                        <h2 style="margin: 0; color: #333; font-size: 22px;">Account Settings</h2>
                        <button id="closeProfileModal" style="background: none; border: none; font-size: 26px; cursor: pointer; color: #666;">&times;</button>
                    </div>

                    <!-- User Info Section -->
                    <div style="margin-bottom: 18px;">
                        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 6px;">
                            <div id="userAvatar" style="width: 64px; height: 64px; border-radius: 50%; background: #0b8f75; display: flex; align-items: center; justify-content: center; color: white; font-size: 26px; font-weight: 700; box-shadow: 0 4px 12px rgba(11,143,117,0.12);"></div>
                            <div>
                                <h3 id="userName" style="margin: 0 0 4px 0; color: #222; font-size: 16px; font-weight: 700;">Loading...</h3>
                                <p id="userEmail" style="margin: 0; color: #666; font-size: 13px;">Loading...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Phone Number Section -->
                    <div style="margin-bottom: 18px; padding: 14px; background: #fff4f8; border-radius: 8px;">
                        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 15px;">Phone Number</h3>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <select id="countryCodeSelect" style="padding:10px; border-radius:6px; border:1px solid #e6d7e0; background:#fff; min-width:110px; font-size:14px;">
                                <option value="+250" data-code="RW">🇷🇼 RW +250</option>
                                <option value="+1" data-code="US">🇺🇸 US +1</option>
                                <option value="+44" data-code="GB">🇬🇧 UK +44</option>
                                <option value="+254" data-code="KE">🇰🇪 KE +254</option>
                                <!-- add more as required -->
                            </select>
                            <input type="tel" id="phoneInput" placeholder="7XXXXXXXX" style="flex:1; padding:10px; border:1px solid #e9dbe4; border-radius:6px; font-size:14px;">
                            <button id="updatePhoneBtn" style="padding:10px 14px; background:#0b8f75; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:700;">Update</button>
                        </div>
                        <p id="phoneMessage" style="margin:8px 0 0 0; font-size:13px;"></p>

                        <!-- OTP area (hidden until SMS sent) -->
                        <div id="phoneOtpArea" style="display:none; margin-top:12px;">
                            <div style="display:flex; gap:8px; align-items:center;">
                                <input type="text" id="phoneOtpInput" placeholder="Enter 6-digit code" style="flex:1; padding:10px; border:1px solid #e9dbe4; border-radius:6px; font-size:14px;">
                                <button id="verifyPhoneOtpBtn" style="padding:10px 14px; background:#ff5a7a; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:700;">Verify</button>
                            </div>
                            <p id="phoneOtpMessage" style="margin:8px 0 0 0; font-size:13px;"></p>
                        </div>
                    </div>

                    <!-- Change Password Section -->
                    <div style="margin-bottom: 18px; padding: 14px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">Change Password</h3>
                        <input type="password" id="currentPassword" placeholder="Current Password" style="width: 100%; padding: 10px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 8px; font-size: 14px; box-sizing: border-box;">
                        <input type="password" id="newPassword" placeholder="New Password (min 6 characters)" style="width: 100%; padding: 10px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 8px; font-size: 14px; box-sizing: border-box;">
                        <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" style="width: 100%; padding: 10px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 10px; font-size: 14px; box-sizing: border-box;">
                        <button id="changePasswordBtn" style="padding: 10px 14px; background: #0b8f75; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; width:100%;">Change Password</button>
                        <p id="passwordMessage" style="margin: 8px 0 0 0; font-size: 13px;"></p>
                    </div>

                    <!-- Delete Account Section -->
                    <div style="padding: 12px; background: #fff5f5; border: 1px solid #fee; border-radius: 8px;">
                        <h3 style="margin: 0 0 6px 0; color: #c62828; font-size: 15px;">Danger Zone</h3>
                        <p style="margin: 0 0 10px 0; color: #666; font-size: 13px;">Once you delete your account, there is no going back. Please be certain.</p>
                        <button id="deleteAccountBtn" style="padding: 10px 14px; background: #c62828; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;">Delete My Account</button>
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
    document.getElementById('verifyPhoneOtpBtn').addEventListener('click', handleVerifyPhoneOtp);
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
        const phoneInput = document.getElementById('phoneInput');
        if (phoneInput) phoneInput.value = '';
        const otpInput = document.getElementById('phoneOtpInput');
        if (otpInput) otpInput.value = '';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
        const pm = document.getElementById('phoneMessage'); if (pm) pm.textContent = '';
        const pom = document.getElementById('phoneOtpMessage'); if (pom) pom.textContent = '';
        const pwdm = document.getElementById('passwordMessage'); if (pwdm) pwdm.textContent = '';
        const otpArea = document.getElementById('phoneOtpArea'); if (otpArea) otpArea.style.display = 'none';
    }
}

async function loadUserProfile() {
    if (!currentUser) return;

    // Set avatar initial from metadata or email
    const nameSource = currentUser.user_metadata?.full_name || currentUser.email || 'User';
    const initial = nameSource.charAt(0).toUpperCase();
    const avatar = document.getElementById('userAvatar');
    if (avatar) avatar.textContent = initial;

    // Set name and email
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    if (nameEl) nameEl.textContent = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
    if (emailEl) emailEl.textContent = currentUser.email || '';

    // Load phone number (top-level phone preferred)
    const phoneField = currentUser.phone || currentUser.user_metadata?.phone || '';
    const phoneInput = document.getElementById('phoneInput');
    const countrySelect = document.getElementById('countryCodeSelect');

    if (phoneField && phoneInput) {
        // if phone looks like +2507..., try to extract code and local part
        const m = phoneField.match(/^\+(\d{1,3})(.*)$/);
        if (m && countrySelect) {
            const code = '+' + m[1];
            // set the country select if known
            const opt = Array.from(countrySelect.options).find(o => o.value === code);
            if (opt) countrySelect.value = code;
            // local part
            phoneInput.value = m[2].replace(/^0+/, ''); // strip any leading zeros if present
        } else {
            if (countrySelect) countrySelect.value = '+250';
            phoneInput.value = phoneField;
        }
    } else {
        if (countrySelect) countrySelect.value = '+250';
        if (phoneInput) phoneInput.value = '';
    }
}

async function handleUpdatePhone() {
    const countrySelect = document.getElementById('countryCodeSelect');
    const phoneRaw = document.getElementById('phoneInput').value.trim();
    const message = document.getElementById('phoneMessage');
    const otpArea = document.getElementById('phoneOtpArea');
    const phoneOtpMessage = document.getElementById('phoneOtpMessage');

    if (!phoneRaw) {
        message.style.color = '#c62828';
        message.textContent = 'Please enter a phone number.';
        return;
    }

    // Build E.164. If user typed local like 7XXXXXXXX we combine with country code
    const country = countrySelect ? countrySelect.value : '+250';
    let normalized = phoneRaw.replace(/\s|-/g, '');
    // If user included leading zero like 078..., drop the leading zero for E.164
    if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
    // If user already included +, use as-is:
    if (!/^\+/.test(normalized)) {
        normalized = country + normalized;
    }

    // Basic E.164 check for Rwanda if country is +250; adjust or relax as needed
    if (country === '+250') {
        const rwRegex = /^\+2507\d{8}$/;
        if (!rwRegex.test(normalized)) {
            message.style.color = '#c62828';
            message.textContent = 'Enter a valid Rwandan mobile number (e.g. +2507xxxxxxxx).';
            return;
        }
    } else {
        // Generic minimal check: +countrycode + 4-15 digits
        if (!/^\+\d{5,15}$/.test(normalized)) {
            message.style.color = '#c62828';
            message.textContent = 'Enter a valid phone number in international format.';
            return;
        }
    }

    try {
        message.style.color = '#1565c0';
        message.textContent = 'Updating phone... you will receive an SMS to confirm the change.';

        // IMPORTANT: Use top-level phone field (not user_metadata) so Auth table "Phone" is used.
        const { data, error } = await supabase.auth.updateUser({ phone: normalized });

        if (error) throw error;

        // When updating phone, Supabase sends an SMS and requires verification.
        // Show OTP area so user can enter code and verify the phone change (type: 'phone_change').
        if (otpArea) otpArea.style.display = 'block';
        if (phoneOtpMessage) { phoneOtpMessage.style.color = '#1565c0'; phoneOtpMessage.textContent = 'SMS sent — enter the 6-digit code you received.'; }

        // Keep currentUser up-to-date locally if returned
        if (data && data.user) currentUser = data.user;

    } catch (error) {
        message.style.color = '#c62828';
        // show human-friendly message if possible
        message.textContent = (error && error.message) ? error.message : 'Failed to update phone.';
        console.error('Phone update error:', error);
    }
}

async function handleVerifyPhoneOtp() {
    const countrySelect = document.getElementById('countryCodeSelect');
    const phoneRaw = document.getElementById('phoneInput').value.trim();
    const otp = document.getElementById('phoneOtpInput').value.trim();
    const phoneOtpMessage = document.getElementById('phoneOtpMessage');
    const phoneMessage = document.getElementById('phoneMessage');

    if (!otp) {
        phoneOtpMessage.style.color = '#c62828';
        phoneOtpMessage.textContent = 'Please enter the 6-digit code.';
        return;
    }

    // Reconstruct E.164 as above
    let normalized = phoneRaw.replace(/\s|-/g, '');
    if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
    if (!/^\+/.test(normalized)) normalized = (countrySelect ? countrySelect.value : '+250') + normalized;

    try {
        phoneOtpMessage.style.color = '#1565c0';
        phoneOtpMessage.textContent = 'Verifying...';

        // Call verifyOtp with type 'phone_change'
        const { data, error } = await supabase.auth.verifyOtp({
            phone: normalized,
            token: otp,
            type: 'phone_change'
        });

        if (error) throw error;

        phoneOtpMessage.style.color = '#2e7d32';
        phoneOtpMessage.textContent = 'Phone verified and updated successfully!';
        if (phoneMessage) { phoneMessage.style.color = '#2e7d32'; phoneMessage.textContent = 'Phone updated in your account.'; }

        // update currentUser from returned data if present
        if (data && data.session && data.session.user) {
            currentUser = data.session.user;
            updateUIForLoggedInUser(currentUser);
        } else {
            // refresh session to get latest user object
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData && sessionData.session && sessionData.session.user) {
                currentUser = sessionData.session.user;
                updateUIForLoggedInUser(currentUser);
            }
        }

        // hide OTP area after success
        const otpArea = document.getElementById('phoneOtpArea');
        if (otpArea) otpArea.style.display = 'none';

    } catch (error) {
        phoneOtpMessage.style.color = '#c62828';
        phoneOtpMessage.textContent = (error && error.message) ? error.message : 'Verification failed.';
        console.error('OTP verify error:', error);
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
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) throw error;

        message.style.color = '#2e7d32';
        message.textContent = 'Password changed successfully!';

        // Clear fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';

    } catch (error) {
        message.style.color = '#c62828';
        message.textContent = (error && error.message) ? error.message : 'Password change failed';
    }
}

async function handleDeleteAccount() {
    const confirmed = confirm('Are you absolutely sure you want to delete your account? This action cannot be undone!');
    
    if (!confirmed) return;

    const doubleConfirm = confirm('This is your last chance. Delete account permanently?');
    
    if (!doubleConfirm) return;

    try {
        alert('Account deletion requires server-side setup. Please contact support to delete your account or set up an Edge Function to handle deletion.');
        
        // Sign out locally
        await supabase.auth.signOut();
        closeProfileModal();

    } catch (error) {
        alert('Error: ' + (error && error.message ? error.message : 'Unknown error'));
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
        }, 1200);

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
            }, 1200);
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
        const displayName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'User');
        const initial = displayName.charAt(0).toUpperCase();
        
        // create compact avatar+dropdown matching your site's colors (teal avatar, compact menu)
        openModalBtn.outerHTML = `
            <div id="userMenuContainer" style="position: relative; display: flex; align-items: center; gap: 10px;">
                <button id="userAvatarBtn" aria-label="Open user menu" style="width:42px; height:42px; border-radius:50%; background:#0b8f75; color:#fff; border:none; cursor:pointer; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow: 0 6px 12px rgba(11,143,117,0.18);">${initial}</button>
                <div id="userDropdown" style="display:none; position:absolute; top:52px; right:0; background:#fff; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.12); min-width:200px; z-index:1000; overflow:hidden;">
                    <div style="padding:10px 12px; border-bottom:1px solid #f2f2f2;">
                        <p style="margin:0; font-weight:700; color:#222; font-size:14px;">${displayName}</p>
                        <p style="margin:6px 0 0 0; font-size:12px; color:#666;">${user.email || ''}</p>
                    </div>
                    <button id="viewProfileBtn" style="width:100%; padding:10px 12px; background:none; border:none; text-align:left; cursor:pointer; font-size:13px; color:#333;">👤 Profile</button>
                    <button id="logoutBtn" style="width:100%; padding:10px 12px; background:none; border:none; text-align:left; cursor:pointer; font-size:13px; color:#c62828; border-top:1px solid #f7f7f7;">🚪 Logout</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const avatarBtn = document.getElementById('userAvatarBtn');
        const dropdown = document.getElementById('userDropdown');
        const viewProfileBtn = document.getElementById('viewProfileBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (avatarBtn && dropdown) {
            avatarBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
        }
        
        if (viewProfileBtn) viewProfileBtn.addEventListener('click', function() {
            if (dropdown) dropdown.style.display = 'none';
            openProfileModal();
        });
        
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            const dd = document.getElementById('userDropdown');
            if (dd) dd.style.display = 'none';
        });
    }
}

function updateUIForLoggedOutUser() {
    const userMenu = document.getElementById('userMenuContainer');
    
    if (userMenu) {
        userMenu.outerHTML = '<button id="openModal" style="padding:8px 12px; border-radius:6px; background:transparent; border:1px solid #ddd; cursor:pointer;">Sign in</button>';
        
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
        messageDiv.style.cssText = 'padding: 10px; margin: 8px 0; border-radius: 6px; text-align: center; font-weight: 600;';
        
        const authContainer = modal.querySelector('.auth-container');
        const formTitle = modal.querySelector('#form-title');
        if (authContainer && formTitle) {
            formTitle.insertAdjacentElement('afterend', messageDiv);
        } else {
            modal.insertAdjacentElement('afterbegin', messageDiv);
        }
    }

    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    
    const colors = {
        error: { bg: '#ffebee', text: '#c62828', border: '#ef5350' },
        success: { bg: '#e8f5e9', text: '#2e7d32', border: '#66bb6a' },
        info: { bg: '#fff7ed', text: '#b26b00', border: '#ffd54f' }
    };
    
    const color = colors[type] || colors.info;
    messageDiv.style.backgroundColor = color.bg;
    messageDiv.style.color = color.text;
    messageDiv.style.border = `1px solid ${color.border}`;
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





