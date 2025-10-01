// ==========================================
// SUPABASE AUTHENTICATION - COMPLETE WORKING VERSION
// ==========================================

// Supabase Configuration
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;

// Wait for page to fully load
window.addEventListener('load', function() {
    console.log('Page loaded, initializing auth...');
    initializeSupabaseAuth();
});

function initializeSupabaseAuth() {
    // Initialize Supabase
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✓ Supabase initialized successfully');
        setupAuthUI();
    } else {
        console.error('✗ Supabase library not loaded! Add <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> to your HTML');
    }
}

function setupAuthUI() {
    // Get all modal elements
    const modal = document.getElementById('modal');
    const openModalBtn = document.getElementById('openModal');
    const closeModalBtn = document.getElementById('closeModal');
    const signinForm = document.getElementById('signin-form');
    const registerForm = document.getElementById('register-form');
    const toggle = document.getElementById('toggle');
    const formTitle = document.getElementById('form-title');
    const toggleText = document.querySelector('.toggle-text');

    console.log('Modal elements found:', {
        modal: !!modal,
        openModalBtn: !!openModalBtn,
        signinForm: !!signinForm,
        registerForm: !!registerForm
    });

    // Check if modal exists on this page
    if (!modal || !openModalBtn) {
        console.log('Auth modal not found on this page - skipping auth setup');
        return;
    }

    // Check user auth status
    checkAuthStatus();

    // === MODAL CONTROLS ===
    openModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Opening modal...');
        modal.style.display = 'flex';
        // Reset to sign-in form
        if (signinForm && registerForm && formTitle) {
            signinForm.classList.add('active');
            registerForm.classList.remove('active');
            formTitle.textContent = 'Sign In';
        }
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Closing modal...');
            modal.style.display = 'none';
            clearModalMessage();
        });
    }

    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            console.log('Closing modal (outside click)...');
            modal.style.display = 'none';
            clearModalMessage();
        }
    });

    // === TOGGLE BETWEEN SIGNIN AND REGISTER ===
    function handleToggle() {
        console.log('Toggling forms...');
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

    // === SIGN IN FORM ===
    if (signinForm) {
        signinForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Sign in form submitted');
            
            const inputs = signinForm.querySelectorAll('input');
            const email = inputs[0].value.trim();
            const password = inputs[1].value;

            console.log('Attempting sign in with email:', email);
            await handleSignIn(email, password);
        });
        console.log('✓ Sign in form listener attached');
    }

    // === REGISTER FORM ===
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Register form submitted');
            
            const inputs = registerForm.querySelectorAll('input');
            const name = inputs[0].value.trim();
            const email = inputs[1].value.trim();
            const password = inputs[2].value;
            const confirmPassword = inputs[3].value;

            console.log('Attempting registration with:', { name, email });
            await handleRegister(name, email, password, confirmPassword);
        });
        console.log('✓ Register form listener attached');
    }

    // Listen for auth changes
    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'SIGNED_IN') {
                updateUIForLoggedInUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                updateUIForLoggedOutUser();
            }
        });
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
        if (!email || !password) {
            throw new Error('Please fill in all fields');
        }

        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        console.log('Calling Supabase signInWithPassword...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('Supabase sign in error:', error);
            throw error;
        }

        console.log('Sign in successful!', data);
        showModalMessage('Sign in successful! Welcome back!', 'success');
        
        setTimeout(() => {
            const modal = document.getElementById('modal');
            if (modal) modal.style.display = 'none';
            clearModalMessage();
        }, 1500);

    } catch (error) {
        console.error('Sign in error:', error);
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

        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        console.log('Calling Supabase signUp...');
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });

        if (error) {
            console.error('Supabase sign up error:', error);
            throw error;
        }

        console.log('Registration successful!', data);

        if (data.user && !data.session) {
            showModalMessage('Success! Please check your email to confirm your account.', 'success');
        } else {
            showModalMessage('Registration successful! Welcome!', 'success');
            setTimeout(() => {
                const modal = document.getElementById('modal');
                if (modal) modal.style.display = 'none';
                clearModalMessage();
            }, 1500);
        }

    } catch (error) {
        console.error('Registration error:', error);
        showModalMessage(error.message || 'Registration failed', 'error');
    }
}

async function handleLogout(e) {
    if (e) e.preventDefault();
    
    if (!supabase) return;

    try {
        console.log('Logging out...');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        console.log('Logged out successfully');
        window.location.reload();

    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out');
    }
}

// === UI UPDATE FUNCTIONS ===

async function checkAuthStatus() {
    if (!supabase) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            console.log('User is logged in:', session.user.email);
            updateUIForLoggedInUser(session.user);
        } else {
            console.log('No user logged in');
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
        
        openModalBtn.outerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #088178; font-weight: 600;">Hi, ${displayName}</span>
                <button id="logoutBtn" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">Logout</button>
            </div>
        `;
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        console.log('UI updated for logged in user:', displayName);
    }
}

function updateUIForLoggedOutUser() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn && logoutBtn.parentElement) {
        logoutBtn.parentElement.outerHTML = '<button id="openModal">Sign-in/Register</button>';
        
        const newOpenModalBtn = document.getElementById('openModal');
        const modal = document.getElementById('modal');
        
        if (newOpenModalBtn && modal) {
            newOpenModalBtn.addEventListener('click', function(e) {
                e.preventDefault();
                modal.style.display = 'flex';
            });
        }
        
        console.log('UI updated for logged out user');
    }
}

// === MESSAGE FUNCTIONS ===

function showModalMessage(text, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${text}`);
    
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

// === VALIDATION ===

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ==========================================
// YOUR EXISTING SCRIPT.JS CODE BELOW THIS LINE
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



