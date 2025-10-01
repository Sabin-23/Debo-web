// ==========================================
// SUPABASE AUTHENTICATION WITH USER PROFILE
// Updated: session checks, full country list, pink UI, spacing, OTP flow
// Copy-paste this whole file to replace your old script
// ==========================================

// Supabase Configuration (kept your keys)
const SUPABASE_URL = 'https://hlskxkqwymuxcjgswqnv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsc2t4a3F3eW11eGNqZ3N3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzQ1ODIsImV4cCI6MjA3MzAxMDU4Mn0.NdGjbd7Y1QorTF5BIqAduItcvbh1OdP1Y2qNYf0pILw';

let supabase = null;
let currentUser = null;

// Minimal colors (pink theme + teal avatar)
const UI = {
  pink: '#ff9db1',        // primary pink accents
  pinkSoft: '#fff0f3',    // soft pink backgrounds
  teal: '#0b8f75',        // avatar teal
  danger: '#c62828'
};

// Full (comprehensive) country code list (iso, code, label). Default order puts RW first.
const COUNTRY_LIST = [
  { iso: 'RW', code: '+250', label: 'Rwanda' },
  { iso: 'AF', code: '+93', label: 'Afghanistan' },
  { iso: 'AL', code: '+355', label: 'Albania' },
  { iso: 'DZ', code: '+213', label: 'Algeria' },
  { iso: 'AS', code: '+1-684', label: 'American Samoa' },
  { iso: 'AD', code: '+376', label: 'Andorra' },
  { iso: 'AO', code: '+244', label: 'Angola' },
  { iso: 'AI', code: '+1-264', label: 'Anguilla' },
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
  { iso: 'RW', code: '+250', label: 'Rwanda' },
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
  { iso: 'VI', code: '+1-340', label: 'US Virgin Islands' },
  { iso: 'YE', code: '+967', label: 'Yemen' },
  { iso: 'ZM', code: '+260', label: 'Zambia' },
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

// === PROFILE MODAL ===
function createProfileModal() {
  if (document.getElementById('userProfileModal')) return;

  // Build country select OPTIONS dynamically
  const countryOptions = COUNTRY_LIST.map(c => {
    // Display format: ISO + label + code (no emoji since cross-browser). Keep concise.
    return `<option value="${c.code}" data-iso="${c.iso}">${c.iso} ${c.label} ${c.code}</option>`;
  }).join('\n');

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
              <div id="userAvatar" style="width:64px; height:64px; border-radius:50%; background:${UI.teal}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:26px; font-weight:700; box-shadow:0 6px 18px rgba(11,143,117,0.14);"></div>
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
              <button id="updatePhoneBtn" style="padding:10px 14px; background:${UI.pink}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Update</button>
            </div>
            <p id="phoneMessage" style="margin:10px 0 0 0; font-size:13px;"></p>

            <div id="phoneOtpArea" style="display:none; margin-top:12px;">
              <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" id="phoneOtpInput" placeholder="Enter 6-digit code" style="flex:1; padding:10px; border:1px solid #efe7ea; border-radius:8px; font-size:14px;">
                <button id="verifyPhoneOtpBtn" style="padding:10px 14px; background:#ff5a7a; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Verify</button>
              </div>
              <p id="phoneOtpMessage" style="margin:10px 0 0 0; font-size:13px;"></p>
            </div>
          </div>

          <div style="margin-bottom:16px; padding:14px; background:#fff; border-radius:8px; border:1px solid #f2f2f2;">
            <h3 style="margin:0 0 10px 0; color:#222; font-size:15px;">Change Password</h3>
            <input type="password" id="currentPassword" placeholder="Current Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
            <input type="password" id="newPassword" placeholder="New Password (min 6 characters)" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:8px;">
            <input type="password" id="confirmNewPassword" placeholder="Confirm New Password" style="width:100%; padding:10px; border:1px solid #f0f0f0; border-radius:8px; margin-bottom:10px;">
            <button id="changePasswordBtn" style="width:100%; padding:10px; background:${UI.pink}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Change Password</button>
            <p id="passwordMessage" style="margin:10px 0 0 0; font-size:13px;"></p>
          </div>

          <div style="padding:12px; background:#fff5f5; border-radius:8px; border:1px solid #fee;">
            <h3 style="margin:0 0 6px 0; color:${UI.danger}; font-size:15px;">Danger Zone</h3>
            <p style="margin:0 0 10px 0; color:#666; font-size:13px;">Account deletion requires server-side admin privileges. See console for instructions.</p>
            <button id="deleteAccountBtn" style="padding:10px; background:${UI.danger}; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Delete My Account</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Attach event handlers (safe guard with exists)
  document.getElementById('closeProfileModal').addEventListener('click', closeProfileModal);
  document.getElementById('userProfileModal').addEventListener('click', function(e) {
    if (e.target.id === 'userProfileModal') closeProfileModal();
  });

  document.getElementById('updatePhoneBtn').addEventListener('click', handleUpdatePhone);
  document.getElementById('verifyPhoneOtpBtn').addEventListener('click', handleVerifyPhoneOtp);
  document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
  document.getElementById('deleteAccountBtn').addEventListener('click', handleDeleteAccount);

  // Ensure RW is selected by default (first in list already)
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
  const otpInput = document.getElementById('phoneOtpInput'); if (otpInput) otpInput.value = '';
  const pm = document.getElementById('phoneMessage'); if (pm) pm.textContent = '';
  const pom = document.getElementById('phoneOtpMessage'); if (pom) pom.textContent = '';
  const pwd = document.getElementById('passwordMessage'); if (pwd) pwd.textContent = '';
  const otpArea = document.getElementById('phoneOtpArea'); if (otpArea) otpArea.style.display = 'none';
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

  const phoneField = currentUser.phone || currentUser.user_metadata?.phone || '';
  const phoneInput = document.getElementById('phoneInput');
  const countrySelect = document.getElementById('countryCodeSelect');
  if (phoneField && phoneInput) {
    // try to split +country + rest
    const m = phoneField.match(/^\+(\d{1,3})(.*)$/);
    if (m && countrySelect) {
      const code = '+' + m[1];
      const opt = Array.from(countrySelect.options).find(o => o.value === code);
      if (opt) countrySelect.value = code;
      // local part
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

// Helper: check there is an active session & user
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
    // set currentUser from session
    currentUser = data.session.user;
    return true;
  } catch (err) {
    console.error('Error checking session:', err);
    if (targetMessageEl) { targetMessageEl.style.color = UI.danger; targetMessageEl.textContent = 'Session check failed. Re-login required.'; }
    return false;
  }
}

// Update phone - robust checks
async function handleUpdatePhone() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneRaw = document.getElementById('phoneInput').value.trim();
  const message = document.getElementById('phoneMessage');
  const otpArea = document.getElementById('phoneOtpArea');
  const phoneOtpMessage = document.getElementById('phoneOtpMessage');

  if (!phoneRaw) {
    message.style.color = UI.danger;
    message.textContent = 'Please enter a phone number.';
    return;
  }

  // ensure session present before update
  const ok = await _ensureSessionOrShowError(message);
  if (!ok) return;

  // normalize: remove spaces/dashes
  let normalized = phoneRaw.replace(/\s|-/g, '');
  if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');

  const country = countrySelect ? countrySelect.value : '+250';
  if (!/^\+/.test(normalized)) normalized = country + normalized;

  // basic format check for RW
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
    message.style.color = '#1565c0';
    message.textContent = 'Updating phone... an SMS will be sent to confirm.';

    // IMPORTANT: call updateUser with top-level phone (not user_metadata)
    const { data, error } = await supabase.auth.updateUser({ phone: normalized });

    if (error) {
      // sometimes Supabase returns confusing backend errors if session invalid or provider misconfigured
      console.error('updateUser error:', error);
      // if the backend claims sub missing, show a friendly actionable message
      if (error.message && error.message.includes('sub')) {
        message.style.color = UI.danger;
        message.textContent = 'Session invalid or expired. Please sign out and sign in again, then retry.';
      } else {
        message.style.color = UI.danger;
        message.textContent = error.message || 'Failed to update phone.';
      }
      return;
    }

    // Show OTP area for verification (phone_change OTP)
    if (otpArea) otpArea.style.display = 'block';
    if (phoneOtpMessage) { phoneOtpMessage.style.color = '#1565c0'; phoneOtpMessage.textContent = 'SMS sent — enter the 6-digit code you received.'; }

    // Keep local currentUser up-to-date (data.user returned sometimes)
    if (data && data.user) currentUser = data.user;

  } catch (error) {
    console.error('Unexpected updatePhone error:', error);
    message.style.color = UI.danger;
    message.textContent = error.message || 'Unexpected error updating phone.';
  }
}

// Verify OTP for phone change
async function handleVerifyPhoneOtp() {
  const countrySelect = document.getElementById('countryCodeSelect');
  const phoneRaw = document.getElementById('phoneInput').value.trim();
  const otp = document.getElementById('phoneOtpInput').value.trim();
  const phoneOtpMessage = document.getElementById('phoneOtpMessage');
  const phoneMessage = document.getElementById('phoneMessage');

  if (!otp) {
    phoneOtpMessage.style.color = UI.danger;
    phoneOtpMessage.textContent = 'Please enter the 6-digit code.';
    return;
  }

  // ensure session present
  const ok = await _ensureSessionOrShowError(phoneOtpMessage);
  if (!ok) return;

  let normalized = phoneRaw.replace(/\s|-/g, '');
  if (/^0/.test(normalized)) normalized = normalized.replace(/^0+/, '');
  if (!/^\+/.test(normalized)) normalized = (countrySelect ? countrySelect.value : '+250') + normalized;

  try {
    phoneOtpMessage.style.color = '#1565c0';
    phoneOtpMessage.textContent = 'Verifying...';

    // verifyOtp with type 'phone_change'
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: 'phone_change'
    });

    if (error) {
      console.error('verifyOtp error:', error);
      if (error.message && error.message.includes('sub')) {
        phoneOtpMessage.style.color = UI.danger;
        phoneOtpMessage.textContent = 'Verification failed due to session issues. Please sign out and sign in again.';
      } else {
        phoneOtpMessage.style.color = UI.danger;
        phoneOtpMessage.textContent = error.message || 'Verification failed.';
      }
      return;
    }

    phoneOtpMessage.style.color = '#2e7d32';
    phoneOtpMessage.textContent = 'Phone verified and updated successfully!';
    if (phoneMessage) { phoneMessage.style.color = '#2e7d32'; phoneMessage.textContent = 'Phone updated in your account.'; }

    // refresh session / user
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData && sessionData.session && sessionData.session.user) {
      currentUser = sessionData.session.user;
      updateUIForLoggedInUser(currentUser);
    }

    // hide OTP area
    const otpArea = document.getElementById('phoneOtpArea');
    if (otpArea) otpArea.style.display = 'none';

  } catch (error) {
    console.error('Unexpected verifyOtp error:', error);
    phoneOtpMessage.style.color = UI.danger;
    phoneOtpMessage.textContent = error.message || 'Unexpected verification error.';
  }
}

// Change password (same flow as before)
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

// Delete account (client cannot delete user; show clear guidance)
async function handleDeleteAccount() {
  const confirmed = confirm('Are you absolutely sure you want to delete your account? This action cannot be undone!');
  if (!confirmed) return;
  const doubleConfirm = confirm('This is your last chance. Delete account permanently?');
  if (!doubleConfirm) return;

  // explain clearly: deletion requires server
  alert(
    'Important: Deleting a user needs server-side admin privileges. You must either:\n\n' +
    '1) Create a secure server / Edge Function that calls Supabase admin API: supabase.auth.admin.updateUserById or delete the user using the service_role key.\n' +
    '2) Or contact the project admin.\n\n' +
    'For now we will sign you out locally.'
  );

  try {
    await supabase.auth.signOut();
    closeProfileModal();
    window.location.reload();
  } catch (err) {
    console.error('Sign out on delete flow error:', err);
    alert('Error signing out: ' + (err.message || err));
  }
}

// === AUTH HANDLERS (signin/register/logout) ===

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

  openModalBtn.outerHTML = `
    <div id="userMenuContainer" style="position:relative; display:flex; align-items:center; gap:12px;">
      <button id="userAvatarBtn" aria-label="Open user menu" style="width:44px; height:44px; border-radius:50%; background:${UI.teal}; color:#fff; border:none; cursor:pointer; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 20px rgba(11,143,117,0.16);">${initial}</button>
      <div id="userDropdown" style="display:none; position:absolute; top:56px; right:0; background:#fff; border-radius:10px; box-shadow:0 12px 36px rgba(0,0,0,0.14); min-width:220px; z-index:1000; overflow:hidden;">
        <div style="padding:12px 14px; border-bottom:1px solid #f6f6f6;">
          <p style="margin:0; font-weight:700; color:#222; font-size:14px;">${displayName}</p>
          <p style="margin:6px 0 0 0; font-size:12px; color:#666;">${user.email || ''}</p>
        </div>
        <button id="viewProfileBtn" style="width:100%; padding:12px 14px; background:none; border:none; text-align:left; cursor:pointer; font-size:13px; color:#333; border-bottom:1px solid #fafafa;">👤 View Profile</button>
        <button id="logoutBtn" style="width:100%; padding:12px 14px; background:none; border:none; text-align:left; cursor:pointer; font-size:13px; color:${UI.danger};">🚪 Logout</button>
      </div>
    </div>
  `;

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
  if (viewProfileBtn) viewProfileBtn.addEventListener('click', function() { if (dropdown) dropdown.style.display = 'none'; openProfileModal(); });
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  document.addEventListener('click', function() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.style.display = 'none';
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






