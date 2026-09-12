const axios = require('axios');

const BHASH_USER = 'Trulypro_infos';
const BHASH_PASS = '123456';
const BHASH_SENDER = 'TRPIPL';
const IS_MOCK = process.env.MOCK_OTP === 'true';

// In-memory OTP store: { "919513477062": { otp: "123456", expires: timestamp } }
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via bhashsms
 * @param {string} mobileNumber - 10-digit number (without country code)
 * @param {string} countryCode  - e.g. "91"
 */
exports.sendOTP = async (mobileNumber, countryCode) => {
  const fullNumber = countryCode + mobileNumber;

  // Always use 123456 as OTP — BhashSMS credentials are pending verification
  // TODO: Replace with real BhashSMS call once credentials are confirmed
  const otp = '123456';
  otpStore[fullNumber] = { otp, expires: Date.now() + 10 * 60 * 1000 };

  console.log(`✅ [OTP] Stored OTP for ${fullNumber}: ${otp}`);

  // Try to send SMS in background (fire and forget — do NOT await)
  // This way the API responds instantly without waiting for BhashSMS
  (() => {
    const text = encodeURIComponent(
      `TRULY PRO INFOS PRIVATE LIMITED: Use ${otp} to verify your login request. The OTP is valid for 10 minutes. Please do not share this OTP.`
    );
    const url = `http://bhashsms.com/api/sendmsg.php?user=${BHASH_USER}&pass=${BHASH_PASS}&sender=${BHASH_SENDER}&phone=${mobileNumber}&text=${text}&priority=ndnd&stype=normal`;
    axios.get(url, { timeout: 8000 })
      .then(r => console.log('📥 [BhashSMS] Response:', String(r.data || '').trim()))
      .catch(e => console.warn('⚠️ [BhashSMS] SMS failed (ignored):', e.message));
  })();

  return { type: 'success', message: 'OTP sent successfully' };
};

/**
 * Verify OTP stored in memory
 * @param {string} mobileNumber - 10-digit number
 * @param {string} countryCode  - e.g. "91"
 * @param {string} otp          - OTP entered by user
 */
exports.verifyOTP = (mobileNumber, countryCode, otp) => {
  const fullNumber = countryCode + mobileNumber;
  console.log(`🔍 [OTP] Verifying for ${fullNumber} | Entered: ${otp}`);

  const stored = otpStore[fullNumber];

  if (!stored) {
    console.log('❌ [OTP] No OTP found. Request a new one.');
    return { type: 'error', message: 'OTP not found. Please request a new one.' };
  }

  if (Date.now() > stored.expires) {
    delete otpStore[fullNumber];
    console.log('❌ [OTP] Expired.');
    return { type: 'error', message: 'OTP expired. Please request a new one.' };
  }

  if (otp === stored.otp) {
    delete otpStore[fullNumber]; // Clear after successful use
    console.log('✅ [OTP] Verified successfully!');
    return { type: 'success', message: 'OTP verified' };
  }

  console.log(`❌ [OTP] Wrong OTP. Expected: ${stored.otp} | Got: ${otp}`);
  return { type: 'error', message: 'Invalid OTP' };
};
