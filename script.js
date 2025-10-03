// ==========================================
// SUPABASE AUTHENTICATION SYSTEM - FIXED VERSION
// ==========================================

// Mobile menu functionality (keeping your team's code intact)
const bar = document.getElementById('bar');
const close = document.getElementById('close');
const nav = document.getElementById('navbar');

if (bar) {
    bar.addEventListener('click', () => {
        nav.classList.add('active');
    })
}

if (close) {
    close.addEventListener('click', () => {
        nav.classList.remove('active');
    })
}

// Supabase configuration
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

// Global state
let supabase = null;
let currentUser = null;
let currentUserProfile = null;

// UI Colors
const UI = {
  primaryPink: '#ff9db1',
  pinkSoft: '#fff0f3',
  avatarPink: '#ff7da7',
  dropdownBg: '#ffffff',
  subtleGray: '#f6f3f4',
  danger: '#c62828',
  success: '#2e7d32'
};

// ==========================================
// COMPREHENSIVE COUNTRY DATA FOR PHONE NUMBERS
// ==========================================

const COUNTRY_LIST = [
  { iso: 'AF', code: '+93', label: 'Afghanistan' },
  { iso: 'AL', code: '+355', label: 'Albania' },
  { iso: 'DZ', code: '+213', label: 'Algeria' },
  { iso: 'AD', code: '+376', label: 'Andorra' },
  { iso: 'AO', code: '+244', label: 'Angola' },
  { iso: 'AG', code: '+1-268', label: 'Antigua and Barbuda' },
  { iso: 'AR', code: '+54', label: 'Argentina' },
  { iso: 'AM', code: '+374', label: 'Armenia' },
  { iso: 'AU', code: '+61', label: 'Australia' },
  { iso: 'AT', code: '+43', label: 'Austria' },
  { iso: 'AZ', code: '+994', label: 'Azerbaijan' },
  { iso: 'BS', code: '+1-242', label: 'Bahamas' },
  { iso: 'BH', code: '+973', label: 'Bahrain' },
  { iso: 'BD', code: '+880', label: 'Bangladesh' },
  { iso: 'BB', code: '+1-246', label: 'Barbados' },
  { iso: 'BY', code: '+375', label: 'Belarus' },
  { iso: 'BE', code: '+32', label: 'Belgium' },
  { iso: 'BZ', code: '+501', label: 'Belize' },
  { iso: 'BJ', code: '+229', label: 'Benin' },
  { iso: 'BT', code: '+975', label: 'Bhutan' },
  { iso: 'BO', code: '+591', label: 'Bolivia' },
  { iso: 'BA', code: '+387', label: 'Bosnia and Herzegovina' },
  { iso: 'BW', code: '+267', label: 'Botswana' },
  { iso: 'BR', code: '+55', label: 'Brazil' },
  { iso: 'BN', code: '+673', label: 'Brunei' },
  { iso: 'BG', code: '+359', label: 'Bulgaria' },
  { iso: 'BF', code: '+226', label: 'Burkina Faso' },
  { iso: 'BI', code: '+257', label: 'Burundi' },
  { iso: 'CV', code: '+238', label: 'Cabo Verde' },
  { iso: 'KH', code: '+855', label: 'Cambodia' },
  { iso: 'CM', code: '+237', label: 'Cameroon' },
  { iso: 'CA', code: '+1', label: 'Canada' },
  { iso: 'CF', code: '+236', label: 'Central African Republic' },
  { iso: 'TD', code: '+235', label: 'Chad' },
  { iso: 'CL', code: '+56', label: 'Chile' },
  { iso: 'CN', code: '+86', label: 'China' },
  { iso: 'CO', code: '+57', label: 'Colombia' },
  { iso: 'KM', code: '+269', label: 'Comoros' },
  { iso: 'CD', code: '+243', label: 'Congo, Democratic Republic of the' },
  { iso: 'CG', code: '+242', label: 'Congo, Republic of the' },
  { iso: 'CR', code: '+506', label: 'Costa Rica' },
  { iso: 'CI', code: '+225', label: 'Côte d\'Ivoire' },
  { iso: 'HR', code: '+385', label: 'Croatia' },
  { iso: 'CU', code: '+53', label: 'Cuba' },
  { iso: 'CY', code: '+357', label: 'Cyprus' },
  { iso: 'CZ', code: '+420', label: 'Czech Republic' },
  { iso: 'DK', code: '+45', label: 'Denmark' },
  { iso: 'DJ', code: '+253', label: 'Djibouti' },
  { iso: 'DM', code: '+1-767', label: 'Dominica' },
  { iso: 'DO', code: '+1-809', label: 'Dominican Republic' },
  { iso: 'EC', code: '+593', label: 'Ecuador' },
  { iso: 'EG', code: '+20', label: 'Egypt' },
  { iso: 'SV', code: '+503', label: 'El Salvador' },
  { iso: 'GQ', code: '+240', label: 'Equatorial Guinea' },
  { iso: 'ER', code: '+291', label: 'Eritrea' },
  { iso: 'EE', code: '+372', label: 'Estonia' },
  { iso: 'SZ', code: '+268', label: 'Eswatini' },
  { iso: 'ET', code: '+251', label: 'Ethiopia' },
  { iso: 'FJ', code: '+679', label: 'Fiji' },
  { iso: 'FI', code: '+358', label: 'Finland' },
  { iso: 'FR', code: '+33', label: 'France' },
  { iso: 'GA', code: '+241', label: 'Gabon' },
  { iso: 'GM', code: '+220', label: 'Gambia' },
  { iso: 'GE', code: '+995', label: 'Georgia' },
  { iso: 'DE', code: '+49', label: 'Germany' },
  { iso: 'GH', code: '+233', label: 'Ghana' },
  { iso: 'GR', code: '+30', label: 'Greece' },
  { iso: 'GD', code: '+1-473', label: 'Grenada' },
  { iso: 'GT', code: '+502', label: 'Guatemala' },
  { iso: 'GN', code: '+224', label: 'Guinea' },
  { iso: 'GW', code: '+245', label: 'Guinea-Bissau' },
  { iso: 'GY', code: '+592', label: 'Guyana' },
  { iso: 'HT', code: '+509', label: 'Haiti' },
  { iso: 'HN', code: '+504', label: 'Honduras' },
  { iso: 'HU', code: '+36', label: 'Hungary' },
  { iso: 'IS', code: '+354', label: 'Iceland' },
  { iso: 'IN', code: '+91', label: 'India' },
  { iso: 'ID', code: '+62', label: 'Indonesia' },
  { iso: 'IR', code: '+98', label: 'Iran' },
  { iso: 'IQ', code: '+964', label: 'Iraq' },
  { iso: 'IE', code: '+353', label: 'Ireland' },
  { iso: 'IL', code: '+972', label: 'Israel' },
  { iso: 'IT', code: '+39', label: 'Italy' },
  { iso: 'JM', code: '+1-876', label: 'Jamaica' },
  { iso: 'JP', code: '+81', label: 'Japan' },
  { iso: 'JO', code: '+962', label: 'Jordan' },
  { iso: 'KZ', code: '+7', label: 'Kazakhstan' },
  { iso: 'KE', code: '+254', label: 'Kenya' },
  { iso: 'KI', code: '+686', label: 'Kiribati' },
  { iso: 'KP', code: '+850', label: 'Korea, North' },
  { iso: 'KR', code: '+82', label: 'Korea, South' },
  { iso: 'XK', code: '+383', label: 'Kosovo' },
  { iso: 'KW', code: '+965', label: 'Kuwait' },
  { iso: 'KG', code: '+996', label: 'Kyrgyzstan' },
  { iso: 'LA', code: '+856', label: 'Laos' },
  { iso: 'LV', code: '+371', label: 'Latvia' },
  { iso: 'LB', code: '+961', label: 'Lebanon' },
  { iso: 'LS', code: '+266', label: 'Lesotho' },
  { iso: 'LR', code: '+231', label: 'Liberia' },
  { iso: 'LY', code: '+218', label: 'Libya' },
  { iso: 'LI', code: '+423', label: 'Liechtenstein' },
  { iso: 'LT', code: '+370', label: 'Lithuania' },
  { iso: 'LU', code: '+352', label: 'Luxembourg' },
  { iso: 'MG', code: '+261', label: 'Madagascar' },
  { iso: 'MW', code: '+265', label: 'Malawi' },
  { iso: 'MY', code: '+60', label: 'Malaysia' },
  { iso: 'MV', code: '+960', label: 'Maldives' },
  { iso: 'ML', code: '+223', label: 'Mali' },
  { iso: 'MT', code: '+356', label: 'Malta' },
  { iso: 'MH', code: '+692', label: 'Marshall Islands' },
  { iso: 'MR', code: '+222', label: 'Mauritania' },
  { iso: 'MU', code: '+230', label: 'Mauritius' },
  { iso: 'MX', code: '+52', label: 'Mexico' },
  { iso: 'FM', code: '+691', label: 'Micronesia' },
  { iso: 'MD', code: '+373', label: 'Moldova' },
  { iso: 'MC', code: '+377', label: 'Monaco' },
  { iso: 'MN', code: '+976', label: 'Mongolia' },
  { iso: 'ME', code: '+382', label: 'Montenegro' },
  { iso: 'MA', code: '+212', label: 'Morocco' },
  { iso: 'MZ', code: '+258', label: 'Mozambique' },
  { iso: 'MM', code: '+95', label: 'Myanmar' },
  { iso: 'NA', code: '+264', label: 'Namibia' },
  { iso: 'NR', code: '+674', label: 'Nauru' },
  { iso: 'NP', code: '+977', label: 'Nepal' },
  { iso: 'NL', code: '+31', label: 'Netherlands' },
  { iso: 'NZ', code: '+64', label: 'New Zealand' },
  { iso: 'NI', code: '+505', label: 'Nicaragua' },
  { iso: 'NE', code: '+227', label: 'Niger' },
  { iso: 'NG', code: '+234', label: 'Nigeria' },
  { iso: 'MK', code: '+389', label: 'North Macedonia' },
  { iso: 'NO', code: '+47', label: 'Norway' },
  { iso: 'OM', code: '+968', label: 'Oman' },
  { iso: 'PK', code: '+92', label: 'Pakistan' },
  { iso: 'PW', code: '+680', label: 'Palau' },
  { iso: 'PS', code: '+970', label: 'Palestine' },
  { iso: 'PA', code: '+507', label: 'Panama' },
  { iso: 'PG', code: '+675', label: 'Papua New Guinea' },
  { iso: 'PY', code: '+595', label: 'Paraguay' },
  { iso: 'PE', code: '+51', label: 'Peru' },
  { iso: 'PH', code: '+63', label: 'Philippines' },
  { iso: 'PL', code: '+48', label: 'Poland' },
  { iso: 'PT', code: '+351', label: 'Portugal' },
  { iso: 'QA', code: '+974', label: 'Qatar' },
  { iso: 'RO', code: '+40', label: 'Romania' },
  { iso: 'RU', code: '+7', label: 'Russia' },
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'KN', code: '+1-869', label: 'Saint Kitts and Nevis' },
  { iso: 'LC', code: '+1-758', label: 'Saint Lucia' },
  { iso: 'VC', code: '+1-784', label: 'Saint Vincent and the Grenadines' },
  { iso: 'WS', code: '+685', label: 'Samoa' },
  { iso: 'SM', code: '+378', label: 'San Marino' },
  { iso: 'ST', code: '+239', label: 'Sao Tome and Principe' },
  { iso: 'SA', code: '+966', label: 'Saudi Arabia' },
  { iso: 'SN', code: '+221', label: 'Senegal' },
  { iso: 'RS', code: '+381', label: 'Serbia' },
  { iso: 'SC', code: '+248', label: 'Seychelles' },
  { iso: 'SL', code: '+232', label: 'Sierra Leone' },
  { iso: 'SG', code: '+65', label: 'Singapore' },
  { iso: 'SK', code: '+421', label: 'Slovakia' },
  { iso: 'SI', code: '+386', label: 'Slovenia' },
  { iso: 'SB', code: '+677', label: 'Solomon Islands' },
  { iso: 'SO', code: '+252', label: 'Somalia' },
  { iso: 'ZA', code: '+27', label: 'South Africa' },
  { iso: 'SS', code: '+211', label: 'South Sudan' },
  { iso: 'ES', code: '+34', label: 'Spain' },
  { iso: 'LK', code: '+94', label: 'Sri Lanka' },
  { iso: 'SD', code: '+249', label: 'Sudan' },
  { iso: 'SR', code: '+597', label: 'Suriname' },
  { iso: 'SE', code: '+46', label: 'Sweden' },
  { iso: 'CH', code: '+41', label: 'Switzerland' },
  { iso: 'SY', code: '+963', label: 'Syria' },
  { iso: 'TW', code: '+886', label: 'Taiwan' },
  { iso: 'TJ', code: '+992', label: 'Tajikistan' },
  { iso: 'TZ', code: '+255', label: 'Tanzania' },
  { iso: 'TH', code: '+66', label: 'Thailand' },
  { iso: 'TL', code: '+670', label: 'Timor-Leste' },
  { iso: 'TG', code: '+228', label: 'Togo' },
  { iso: 'TO', code: '+676', label: 'Tonga' },
  { iso: 'TT', code: '+1-868', label: 'Trinidad and Tobago' },
  { iso: 'TN', code: '+216', label: 'Tunisia' },
  { iso: 'TR', code: '+90', label: 'Turkey' },
  { iso: 'TM', code: '+993', label: 'Turkmenistan' },
  { iso: 'TV', code: '+688', label: 'Tuvalu' },
  { iso: 'UG', code: '+256', label: 'Uganda' },
  { iso: 'UA', code: '+380', label: 'Ukraine' },
  { iso: 'AE', code: '+971', label: 'United Arab Emirates' },
  { iso: 'GB', code: '+44', label: 'United Kingdom' },
  { iso: 'US', code: '+1', label: 'United States' },
  { iso: 'UY', code: '+598', label: 'Uruguay' },
  { iso: 'UZ', code: '+998', label: 'Uzbekistan' },
  { iso: 'VU', code: '+678', label: 'Vanuatu' },
  { iso: 'VA', code: '+379', label: 'Vatican City' },
  { iso: 'VE', code: '+58', label: 'Venezuela' },
  { iso: 'VN', code: '+84', label: 'Vietnam' },
  { iso: 'YE', code: '+967', label: 'Yemen' },
  { iso: 'ZM', code: '+260', label: 'Zambia' },
  { iso: 'ZW', code: '+263', label: 'Zimbabwe' }
];

// ==========================================
// INITIALIZATION & SETUP
// ==========================================

window.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Initializing application...');
  initializeSupabaseAuth();
  setupFormToggle();
  setupModalHandlers();
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
// AUTHENTICATION STATE MANAGEMENT - FIXED
// ==========================================

function setupAuthStateListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Auth state changed:', event);
    
    switch (event) {
      case 'SIGNED_IN':
        currentUser = session.user;
        try {
          currentUserProfile = await getUserProfile(currentUser.id);
          if (!currentUserProfile) {
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
    }
  });
}

async function checkAuthStatus() {
  if (!supabase) return;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session check error:', error);
      return;
    }
    
    if (session?.user) {
      currentUser = session.user;
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
// USER PROFILE MANAGEMENT - FIXED
// ==========================================

async function getUserProfile(userId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    throw error;
  }
}

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
    throw error;
  }
}

// ==========================================
// AUTHENTICATION HANDLERS - IMPROVED ERROR HANDLING
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

    if (error) {
      // Handle specific Supabase auth errors :cite[1]
      if (error.message === 'Invalid login credentials') {
        throw new Error('Invalid email or password.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before signing in.');
      } else {
        throw error;
      }
    }

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
    showModalMessage(error.message, 'error');
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

    if (error) {
      // Handle specific Supabase auth errors :cite[1]
      if (error.message === 'User already registered') {
        throw new Error('An account with this email already exists.');
      } else {
        throw error;
      }
    }

    if (data.user && !data.session) {
      showModalMessage('✅ Success! Please check your email to confirm your account.', 'success');
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
    showModalMessage(error.message, 'error');
  }
}

// ==========================================
// PHONE NUMBER HANDLING - FIXED WITH E.164 FORMAT :cite[6]
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
    // Format phone number to E.164 format :cite[6]
    let normalized = phoneRaw.replace(/\s|-|\(|\)/g, '');
    const country = countrySelect ? countrySelect.value : '+250';
    
    // Ensure country code is included
    if (!normalized.startsWith('+')) {
      normalized = country + normalized;
    }

    // Basic E.164 validation
    if (!/^\+\d{8,15}$/.test(normalized)) {
      throw new Error('Please enter a valid international phone number (e.g., +250712345678)');
    }

    // Update only in profiles table, not in auth metadata :cite[9]
    const { error } = await supabase
      .from('profiles')
      .update({ 
        phone: normalized,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    currentUserProfile = await getUserProfile(currentUser.id);
    showMessage(message, '✅ Phone number updated successfully!', 'success');
    
  } catch (error) {
    console.error('❌ Error updating phone:', error);
    showMessage(message, error.message || 'Failed to update phone number.', 'error');
  } finally {
    setButtonLoading(updateBtn, false, originalText);
  }
}

// ==========================================
// PASSWORD RESET FUNCTIONALITY - NEW FEATURE
// ==========================================

async function handleForgotPassword(email) {
  if (!supabase) {
    showModalMessage('Authentication service not available.', 'error');
    return;
  }

  if (!email || !isValidEmail(email)) {
    showModalMessage('Please enter a valid email address.', 'error');
    return;
  }

  try {
    showModalMessage('Sending password reset email...', 'info');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`,
    });

    if (error) throw error;

    showModalMessage('✅ Password reset email sent! Check your inbox.', 'success');
    
  } catch (error) {
    console.error('❌ Password reset error:', error);
    showModalMessage('Failed to send password reset email. Please try again.', 'error');
  }
}

// ==========================================
// PROFILE MODAL WITH COUNTRY CODES
// ==========================================

function createProfileModal() {
  if (document.getElementById('userProfileModal')) return;

  const countryOptions = COUNTRY_LIST.map(c => 
    `<option value="${c.code}" ${c.code === '+250' ? 'selected' : ''}>${c.label} ${c.code}</option>`
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
              <select id="countryCodeSelect" style="padding:10px; border-radius:8px; border:1px solid #f4d7df; background:#fff; min-width:160px; font-size:13px;">
                ${countryOptions}
              </select>
              <input type="tel" id="phoneInput" placeholder="712345678" style="flex:1; padding:10px; border:1px solid #efe7ea; border-radius:8px; font-size:14px;">
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

          <!-- Forgot Password Section -->
          <div style="margin-bottom:16px; padding:14px; background:#fff; border-radius:8px; border:1px solid #f2f2f2;">
            <h3 style="margin:0 0 10px 0; color:#222; font-size:15px;">Forgot Password</h3>
            <div style="display:flex; gap:10px;">
              <input type="email" id="forgotPasswordEmail" placeholder="Enter your email" style="flex:1; padding:10px; border:1px solid #f0f0f0; border-radius:8px; font-size:14px;">
              <button id="forgotPasswordBtn" style="padding:10px 14px; background:${UI.primaryPink}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Send Reset Link</button>
            </div>
            <p id="forgotPasswordMessage" style="margin:10px 0 0 0; font-size:13px;"></p>
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

  // Event handlers
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

  const forgotPwdBtn = document.getElementById('forgotPasswordBtn');
  if (forgotPwdBtn) {
    forgotPwdBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('forgotPasswordEmail');
      const message = document.getElementById('forgotPasswordMessage');
      if (emailInput) {
        handleForgotPassword(emailInput.value.trim());
      }
    });
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

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

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showMessage(element, text, type = 'info') {
  if (!element) return;
  element.textContent = text;
  element.style.display = 'block';
  element.style.color = type === 'error' ? UI.danger : 
                       type === 'success' ? UI.success : 
                       type === 'warning' ? UI.warning : 
                       UI.primaryPink;
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
  }
  
  messageDiv.textContent = text;
  messageDiv.style.display = 'block';
  
  const colors = {
    error: { bg: '#ffecec', text: UI.danger, border: '#f2a1a1' },
    success: { bg: '#e8f5e9', text: UI.success, border: '#a8e0b5' },
    info: { bg: '#fff4f7', text: UI.primaryPink, border: '#ffd1dc' }
  };
  
  const color = colors[type] || colors.info;
  messageDiv.style.backgroundColor = color.bg;
  messageDiv.style.color = color.text;
  messageDiv.style.border = `1px solid ${color.border}`;
}

// ==========================================
// ADMIN DASHBOARD SUGGESTIONS
// ==========================================

/*
For your admin dashboard tabs, consider these essential e-commerce sections :cite[2]:cite[4]:cite[8]:

1. **Products Management** (your upload product tab)
   - Add/Edit/Delete products
   - Bulk import/export
   - Inventory tracking

2. **Analytics Dashboard** :cite[2]
   - Sales performance metrics
   - Revenue charts
   - Customer acquisition costs
   - Conversion rates

3. **Orders Management**
   - Process orders
   - Update order status
   - Handle returns/refunds

4. **Customer Management**
   - User profiles
   - Order history
   - Customer segmentation

5. **Inventory Management** :cite[8]
   - Stock levels
   - Low stock alerts
   - Supplier management
*/

console.log('🛒 E-commerce Auth System Loaded - Ready for Dashboard Implementation');
