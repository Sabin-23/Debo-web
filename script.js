// ==========================================
// SUPABASE AUTHENTICATION
// ==========================================

// Supabase Configuration
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;

// Initialize Supabase and Auth on page load
function initSupabaseAuth() {
    try {
        // Check if Supabase library is loaded
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully');
            initializeAuth();
        } else {
            console.warn('Supabase library not loaded. Make sure to include it in your HTML.');
        }
    } catch (error) {
        console.error('Supabase initialization error:', error);
    }
}

function initializeAuth() {
    // Get all required elements
    const modal = document.getElementById('modal');
    const openModalBtn = document.getElementById('openModal');
    const closeModalBtn = document.getElementById('closeModal');
    const signinForm = document.getElementById('signin-form');
    const registerForm = document.getElementById('register-form');
    const toggle = document.getElementById('toggle');
    const formTitle = document.getElementById('form-title');
    const toggleText = document.querySelector('.toggle-text');

    // Only proceed if auth elements exist on this page
    if (!modal || !openModalBtn) {
        console.log('Auth modal not found on this page');
        return;
    }

    // Check if user is logged in and update UI
    checkAuthStatus();

    // Modal controls
    openModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        modal.style.display = 'flex';
        // Reset to sign-in form
        if (signinForm && registerForm) {
            signinForm.classList.add('active');
            registerForm.classList.remove('active');
            if (formTitle) formTitle.textContent = 'Sign In';
        }
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            modal.style.display = 'none';
            clearMessages();
        });
    }

    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            clearMessages();
        }
    });

    // Form toggle functionality
    function handleToggle() {
        if (!signinForm || !registerForm || !formTitle || !toggleText) return;

        if (signinForm.classList.contains('active')) {
            // Switch to register
            signinForm.classList.remove('active');
            registerForm.classList.add('active');
            formTitle.textContent = 'Register';
            toggleText.innerHTML = 'Already have an account? <span id="toggle">Sign In</span>';
        } else {
            // Switch to sign in
            registerForm.classList.remove('active');
            signinForm.classList.add('active');
            formTitle.textContent = 'Sign In';
            toggleText.innerHTML = 'Don\'t have an account? <span id="toggle">Register</span>';
        }
        
        // Re-attach event listener
        const newToggle = document.getElementById('toggle');
        if (newToggle) {
            newToggle.addEventListener('click', handleToggle);
        }
        clearMessages();
    }

    if (toggle) {
        toggle.addEventListener('click', handleToggle);
    }

    // Sign In Form Handler
    if (signinForm) {
        signinForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const emailInput = signinForm.querySelector('input[type="email"]');
            const passwordInput = signinForm.querySelector('input[type="password"]');
            
            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            await handleSignIn(email, password);
        });
    }

    // Register Form Handler
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const inputs = registerForm.querySelectorAll('input');
            if (inputs.length < 4) return;

            const name = inputs[0].value.trim();
            const email = inputs[1].value.trim();
            const password = inputs[2].value;
            const confirmPassword = inputs[3].value;

            await handleRegister(name, email, password, confirmPassword);
        });
    }

    // Listen for auth state changes
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

// Check current authentication status
async function checkAuthStatus() {
    if (!supabase) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            updateUIForLoggedInUser(session.user);
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Update UI for logged-in user
function updateUIForLoggedInUser(user) {
    const openModalBtn = document.getElementById('openModal');
    
    if (openModalBtn) {
        // Get user's name or email
        const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
        
        // Replace button with user info and logout
        openModalBtn.outerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #088178; font-weight: 600;">Hi, ${displayName}</span>
                <button id="logoutBtn" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Logout</button>
            </div>
        `;
        
        // Add logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }
}

// Update UI for logged-out user
function updateUIForLoggedOutUser() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn && logoutBtn.parentElement) {
        // Restore original sign-in button
        logoutBtn.parentElement.outerHTML = '<button id="openModal">Sign-in/Register</button>';
        
        // Re-initialize modal functionality
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

// Handle Sign In
async function handleSignIn(email, password) {
    if (!supabase) {
        showModalMessage('Authentication service not available', 'error');
        return;
    }

    showModalMessage('Signing in...', 'info');

    try {
        // Validation
        if (!email || !password) {
            throw new Error('Please fill in all fields');
        }

        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        showModalMessage('Sign in successful!', 'success');
        
        // Close modal after short delay
        setTimeout(() => {
            const modal = document.getElementById('modal');
            if (modal) modal.style.display = 'none';
            clearMessages();
        }, 1500);

    } catch (error) {
        console.error('Sign in error:', error);
        showModalMessage(error.message || 'Sign in failed. Please try again.', 'error');
    }
}

// Handle Register
async function handleRegister(name, email, password, confirmPassword) {
    if (!supabase) {
        showModalMessage('Authentication service not available', 'error');
        return;
    }

    showModalMessage('Registering...', 'info');

    try {
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            throw new Error('Please fill in all fields');
        }

        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

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
            showModalMessage('Please check your email to confirm your account.', 'success');
        } else {
            showModalMessage('Registration successful!', 'success');
            
            // Close modal after short delay
            setTimeout(() => {
                const modal = document.getElementById('modal');
                if (modal) modal.style.display = 'none';
                clearMessages();
            }, 1500);
        }

    } catch (error) {
        console.error('Registration error:', error);
        showModalMessage(error.message || 'Registration failed. Please try again.', 'error');
    }
}

// Handle Logout
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    if (!supabase) return;

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        console.log('Logged out successfully');
        
        // Page will refresh to show logged-out state
        window.location.reload();

    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

// Show message in modal
function showModalMessage(text, type = 'info') {
    const modal = document.getElementById('modal');
    if (!modal) return;

    let messageDiv = modal.querySelector('.auth-message');
    
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.className = 'auth-message';
        messageDiv.style.cssText = 'padding: 10px; margin: 10px 0; border-radius: 5px; text-align: center;';
        
        const authContainer = modal.querySelector('.auth-container');
        if (authContainer) {
            authContainer.insertBefore(messageDiv, authContainer.firstChild);
        }
    }

    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = type === 'error' ? '#ffebee' : 
                                      type === 'success' ? '#e8f5e8' : '#e3f2fd';
    messageDiv.style.color = type === 'error' ? '#c62828' : 
                            type === 'success' ? '#2e7d32' : '#1565c0';
    messageDiv.style.border = `1px solid ${type === 'error' ? '#c62828' : 
                                            type === 'success' ? '#2e7d32' : '#1565c0'}`;
}

// Clear messages
function clearMessages() {
    const modal = document.getElementById('modal');
    if (!modal) return;

    const messageDiv = modal.querySelector('.auth-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabaseAuth);
} else {
    initSupabaseAuth();
}

// ==========================================
// YOUR EXISTING SCRIPT.JS CODE BELOW
// ==========================================

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


