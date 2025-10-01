// ==========================================
// SUPABASE AUTHENTICATION WITH USER PROFILE
// Updated: REMOVED verification/OTP, avatars pink, phone saved to user_metadata
// Delete-account flow: uses Supabase Edge Function (invoke) with fetch fallback
// Copy-paste this whole file to replace your old script
// ==========================================

// Supabase Configuration (replace if needed)
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;

// UI colors — avatar is now pink to match your site
const UI = {
  primaryPink: '#ff9db1',     // primary pink accents (buttons)
  pinkSoft: '#fff0f3',       // soft pink backgrounds
  avatarPink: '#ff7da7',     // avatar background (pink)
  dropdownBg: '#ffffff',
  subtleGray: '#f6f3f4',
  danger: '#c62828'
};

// Full country list, Rwanda first
const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'AF', code: '+93', label: 'Afghanistan' },
  { iso: 'AL', code: '+355', label: 'Albania' },
  { iso: 'DZ', code: '+213', label: 'Algeria' },
  { iso: 'AS', code: '+1-684', label: 'American Samoa' },
  { iso: 'AD', code: '+376', label: 'Andorra' },
  { iso: 'AO', code: '+244', label: 'Angola' },
  { iso: 'AI', code: '+1-264', label: 'Anguilla' },
  { iso: 'AQ', code: '+672', label: 'Antarctica' },
  { iso: 'AG', code: '+1-268', label: 'Antigua & Barbuda' },
  { iso: 'AR', code: '+54', label: 'Argentina' },
  { iso: 'AM', code: '+374', label: 'Armenia' },
  { iso: 'AW', code: '+297', label: 'Aruba' },
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
  { iso: 'BM', code: '+1-441', label: 'Bermuda' },
  { iso: 'BT', code: '+975', label: 'Bhutan' },
  { iso: 'BO', code: '+591', label: 'Bolivia' },
  { iso: 'BA', code: '+387', label: 'Bosnia & Herzegovina' },
  { iso: 'BW', code: '+267', label: 'Botswana' },
  { iso: 'BR', code: '+55', label: 'Brazil' },
  { iso: 'IO', code: '+246', label: 'British Indian Ocean' },
  { iso: 'VG', code: '+1-284', label: 'British Virgin Islands' },
  { iso: 'BN', code: '+673', label: 'Brunei' },
  { iso: 'BG', code: '+359', label: 'Bulgaria' },
  { iso: 'BF', code: '+226', label: 'Burkina Faso' },
  { iso: 'BI', code: '+257', label: 'Burundi' },
  { iso: 'KH', code: '+855', label: 'Cambodia' },
  { iso: 'CM', code: '+237', label: 'Cameroon' },
  { iso: 'CA', code: '+1', label: 'Canada' },
  { iso: 'CV', code: '+238', label: 'Cape Verde' },
  { iso: 'KY', code: '+1-345', label: 'Cayman Islands' },
  { iso: 'CF', code: '+236', label: 'Central African Republic' },
  { iso: 'TD', code: '+235', label: 'Chad' },
  { iso: 'CL', code: '+56', label: 'Chile' },
  { iso: 'CN', code: '+86', label: 'China' },
  { iso: 'CX', code: '+61', label: 'Christmas Island' },
  { iso: 'CO', code: '+57', label: 'Colombia' },
  { iso: 'KM', code: '+269', label: 'Comoros' },
  { iso: 'CD', code: '+243', label: 'Congo (DRC)' },
  { iso: 'CG', code: '+242', label: 'Congo (Rep)' },
  { iso: 'CK', code: '+682', label: 'Cook Islands' },
  { iso: 'CR', code: '+506', label: 'Costa Rica' },
  { iso: 'CI', code: '+225', label: 'Côte d’Ivoire' },
  { iso: 'HR', code: '+385', label: 'Croatia' },
  { iso: 'CU', code: '+53', label: 'Cuba' },
  { iso: 'CW', code: '+599', label: 'Curaçao' },
  { iso: 'CY', code: '+357', label: 'Cyprus' },
  { iso: 'CZ', code: '+420', label: 'Czechia' },
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
  { iso: 'ET', code: '+251', label: 'Ethiopia' },
  { iso: 'FK', code: '+500', label: 'Falkland Islands' },
  { iso: 'FO', code: '+298', label: 'Faroe Islands' },
  { iso: 'FJ', code: '+679', label: 'Fiji' },
  { iso: 'FI', code: '+358', label: 'Finland' },
  { iso: 'FR', code: '+33', label: 'France' },
  { iso: 'PF', code: '+689', label: 'French Polynesia' },
  { iso: 'GA', code: '+241', label: 'Gabon' },
  { iso: 'GM', code: '+220', label: 'Gambia' },
  { iso: 'GE', code: '+995', label: 'Georgia' },
  { iso: 'DE', code: '+49', label: 'Germany' },
  { iso: 'GH', code: '+233', label: 'Ghana' },
  { iso: 'GI', code: '+350', label: 'Gibraltar' },
  { iso: 'GR', code: '+30', label: 'Greece' },
  { iso: 'GL', code: '+299', label: 'Greenland' },
  { iso: 'GD', code: '+1-473', label: 'Grenada' },
  { iso: 'GU', code: '+1-671', label: 'Guam' },
  { iso: 'GT', code: '+502', label: 'Guatemala' },
  { iso: 'GN', code: '+224', label: 'Guinea' },
  { iso: 'GW', code: '+245', label: 'Guinea-Bissau' },
  { iso: 'GY', code: '+592', label: 'Guyana' },
  { iso: 'HT', code: '+509', label: 'Haiti' },
  { iso: 'HN', code: '+504', label: 'Honduras' },
  { iso: 'HK', code: '+852', label: 'Hong Kong' },
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
  { iso: 'KP', code: '+850', label: 'North Korea' },
  { iso: 'KR', code: '+82', label: 'South Korea' },
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
  { iso: 'MO', code: '+853', label: 'Macao' },
  { iso: 'MK', code: '+389', label: 'North Macedonia' },
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
  { iso: 'NC', code: '+687', label: 'New Caledonia' },
  { iso: 'NZ', code: '+64', label: 'New Zealand' },
  { iso: 'NI', code: '+505', label: 'Nicaragua' },
  { iso: 'NE', code: '+227', label: 'Niger' },
  { iso: 'NG', code: '+234', label: 'Nigeria' },
  { iso: 'NU', code: '+683', label: 'Niue' },
  { iso: 'NF', code: '+672', label: 'Norfolk Island' },
  { iso: 'MP', code: '+1-670', label: 'Northern Mariana Islands' },
  { iso: 'NO', code: '+47', label: 'Norway' },
  { iso: 'OM', code: '+968', label: 'Oman' },
  { iso: 'PK', code: '+92', label: 'Pakistan' },
  { iso: 'PW', code: '+680', label: 'Palau' },
  { iso: 'PA', code: '+507', label: 'Panama' },
  { iso: 'PG', code: '+675', label: 'Papua New Guinea' },
  { iso: 'PY', code: '+595', label: 'Paraguay' },
  { iso: 'PE', code: '+51', label: 'Peru' },
  { iso: 'PH', code: '+63', label: 'Philippines' },
  { iso: 'PL', code: '+48', label: 'Poland' },
  { iso: 'PT', code: '+351', label: 'Portugal' },
  { iso: 'PR', code: '+1-787', label: 'Puerto Rico' },
  { iso: 'QA', code: '+974', label: 'Qatar' },
  { iso: 'RO', code: '+40', label: 'Romania' },
  { iso: 'RU', code: '+7', label: 'Russia' },
  { iso: 'WS', code: '+685', label: 'Samoa' },
  { iso: 'SM', code: '+378', label: 'San Marino' },
  { iso: 'ST', code: '+239', label: 'Sao Tome & Principe' },
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
  { iso: 'ES', code: '+34', label: 'Spain' },
  { iso: 'LK', code: '+94', label: 'Sri Lanka' },
  { iso: 'KN', code: '+1-869', label: 'St Kitts & Nevis' },
  { iso: 'LC', code: '+1-758', label: 'St Lucia' },
  { iso: 'VC', code: '+1-784', label: 'St Vincent' },
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
  { iso: 'TT', code: '+1-868', label: 'Trinidad & Tobago' },
  { iso: 'TN', code: '+216', label: 'Tunisia' },
  { iso: 'TR', code: '+90', label: 'Turkey' },
  { iso: 'TM', code: '+993', label: 'Turkmenistan' },
  { iso: 'TC', code: '+1-649', label: 'Turks & Caicos' },
  { iso: 'TV', code: '+688', label: 'Tuvalu' },
  { iso: 'UG', code: '+256', label: 'Uganda' },
  { iso: 'UA', code: '+380', label: 'Ukraine' },
  { iso: 'AE', code: '+971', label: 'United Arab Emirates' },
  { iso: 'GB', code: '+44', label: 'United Kingdom' },
  { iso: 'US', code: '+1', label: 'United States' },
  { iso: 'UY', code: '+598', label: 'Uruguay' },
  { iso: 'UZ', code: '+998', label: 'Uzbekistan' },
  { iso: 'VU', code: '+678', label: 'Vanuatu' },
  { iso: 'VE', code: '+58', label: 'Venezuela' },
  { iso: 'VN', code: '+84', label: 'Vietnam' },
  { iso: 'YE', code: '+967', label: 'Yemen' },
  { iso: 'ZM', code: '+260', label: 'Zambia' },
  { iso: 'ZW', code: '+263', label: 'Zimbabwe' }
];

// If you prefer a shorter list for performance, remove items you don't need.

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

  // Toggle
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

// === PROFILE MODAL (NO OTP AREA) ===
function createProfileModal() {
  if (document.getElementById('userProfileModal')) return;

  // Build country select options (small sample here; expand as needed)
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

          <div style="padding:12px; background:#fff5f5; border-radius:8px; border:1px solid #fee;">
            <h3 style="margin:0 0 6px 0; color:${UI.danger}; font-size:15px;">Danger Zone</h3>
            <p style="margin:0 0 10px 0; color:#666; font-size:13px;">Deleting your account is permanent. This will remove your auth account. Confirm below to proceed.</p>
            <button id="deleteAccountBtn" style="padding:10px; background:${UI.danger}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Delete My Account</button>
            <p id="deleteAccountMessage" style="margin:8px 0 0 0; font-size:13px;"></p>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Attach event handlers (safe guard with exists)
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
  const deleteBtn = document.getElementById('deleteAccountBtn');
  if (deleteBtn) deleteBtn.addEventListener('click', handleDeleteAccount);

  // Default RW if present
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
  // clear inputs
  const phoneInput = document.getElementById('phoneInput'); if (phoneInput) phoneInput.value = '';
  const pm = document.getElementById('phoneMessage'); if (pm) pm.textContent = '';
  const pwd = document.getElementById('passwordMessage'); if (pwd) pwd.textContent = '';
  const dam = document.getElementById('deleteAccountMessage'); if (dam) dam.textContent = '';
}

async function loadUserProfile() {
  if (!currentUser) {
    console.warn('No current user in loadUserProfile');
    return;
  }
  const nameSource = currentUser.user_metadata?.full_name || currentUser.email || 'User';
  const initial = nameSource.charAt(0).toUpperCase();
  const avatar = document.getElementById('userAvatar'); if (avatar) avatar.textContent = initial;
  const nameEl = document.getElementById('userName'); if (nameEl) nameEl.textContent = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
  const emailEl = document.getElementById('userEmail'); if (emailEl) emailEl.textContent = currentUser.email || '';

  // Show phone from metadata (no verification)
  const phoneField = currentUser.user_metadata?.phone || currentUser.phone || '';
  const phoneInput = document.getElementById('phoneInput');
  const countrySelect = document.getElementById('countryCodeSelect');
  if (phoneField && phoneInput) {
    // try split +country + rest
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

// Simple session check helper
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

// ====== MAIN CHANGE: handleUpdatePhone (NO verification) ======
async function handleUpdatePhone() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneRaw = document.getElementById('phoneInput').value.trim();
  const message = document.getElementById('phoneMessage');

  if (!phoneRaw) {
    message.style.color = UI.danger;
    message.textContent = 'Please enter a phone number.';
    return;
  }

  // ensure session present before update
  const ok = await _ensureSessionOrShowError(message);
  if (!ok) return;

  // normalize
  let normalized = phoneRaw.replace(/\s|-/g, '');
  if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
  const country = countrySelect ? countrySelect.value : '+250';
  if (!/^\+/.test(normalized)) normalized = country + normalized;

  // Basic check for Rwanda
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
    // Save phone into user_metadata (no SMS verification)
    const { data, error } = await supabase.auth.updateUser({
      data: { phone: normalized }
    });

    if (error) {
      console.error('Error saving phone to user_metadata:', error);
      message.style.color = UI.danger;
      message.textContent = error.message || 'Failed to save phone.';
      return;
    }

    // Update local user object
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

// === DELETE ACCOUNT (NEW: invoke with fetch fallback) ===
async function handleDeleteAccount() {
  const confirmed = confirm('This will permanently delete your account and cannot be undone. Are you sure?');
  if (!confirmed) return;

  // optional: second-level confirm typing
  const typed = prompt('Type DELETE to confirm permanent account deletion:');
  if (!typed || typed.toUpperCase() !== 'DELETE') {
    alert('Deletion cancelled — you did not type DELETE.');
    return;
  }

  const messageEl = document.getElementById('deleteAccountMessage');
  if (messageEl) { messageEl.style.color = '#b23b5a'; messageEl.textContent = 'Deleting account...'; }

  // ensure session exists
  const ok = await _ensureSessionOrShowError(messageEl);
  if (!ok) return;

  // 1) Preferred: use supabase.functions.invoke (auto attaches token)
  try {
    if (supabase && typeof supabase.functions !== 'undefined' && typeof supabase.functions.invoke === 'function') {
      const invokeResult = await supabase.functions.invoke('delete-user', { method: 'POST' });

      // check for SDK-level error
      if (invokeResult.error) {
        console.warn('functions.invoke returned error:', invokeResult.error);
        // fallthrough to fallback below
      } else {
        const data = invokeResult.data;
        if (data && data.success) {
          if (messageEl) { messageEl.style.color = '#2e7d32'; messageEl.textContent = 'Account deleted. Signing out...'; }
          await supabase.auth.signOut();
          setTimeout(() => window.location.reload(), 900);
          return;
        } else {
          console.warn('functions.invoke unexpected response:', data);
          // fallthrough to fallback below
        }
      }
    }
  } catch (err) {
    console.warn('functions.invoke threw:', err);
    // we'll try fallback fetch method
  }

  // 2) Fallback: call Functions endpoint directly using fetch, adding Authorization header
  try {
    // get access token
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token || sessionData?.session?.accessToken || null;

    if (!accessToken) {
      if (messageEl) { messageEl.style.color = UI.danger; messageEl.textContent = 'No access token found; please log in again.'; }
      return;
    }

    const res = await fetch('/functions/v1/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify({}) // body not required by function — it reads token
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('Function returned non-OK:', res.status, json);
      if (messageEl) { messageEl.style.color = UI.danger; messageEl.textContent = json?.error || 'Failed to delete account'; }
      return;
    }

    if (json && json.success) {
      if (messageEl) { messageEl.style.color = '#2e7d32'; messageEl.textContent = 'Account deleted. Signing out...'; }
      await supabase.auth.signOut();
      setTimeout(() => window.location.reload(), 900);
      return;
    } else {
      console.error('Unexpected function response:', json);
      if (messageEl) { messageEl.style.color = UI.danger; messageEl.textContent = json?.error || 'Account deletion failed'; }
      return;
    }

  } catch (err) {
    console.error('Delete fallback fetch failed:', err);
    if (messageEl) { messageEl.style.color = UI.danger; messageEl.textContent = err.message || 'Unexpected error deleting account'; }
    return;
  }
}

// === AUTH HANDLERS ===
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

  // Construct a nicer dropdown matching the pink theme and spacing
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

  // Attach handlers after replacing button
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('userDropdown');
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      // Toggle with fade-like effect (inline)
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
      if (dropdown) {
        dropdown.style.display = 'none';
      }
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
    // if click target is outside the dropdown and avatar
    if (event.target !== dd && !dd.contains(event.target) && event.target !== av && !av.contains(event.target)) {
      // hide with transition
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










