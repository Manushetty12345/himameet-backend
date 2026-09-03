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
  const otp = generateOTP();

  // Store OTP with 10-minute expiry
  otpStore[fullNumber] = { otp, expires: Date.now() + 10 * 60 * 1000 };
  console.log(`🔑 [OTP] Generated for ${fullNumber}: ${otp}`);

  if (IS_MOCK) {
    console.log(`✅ [MOCK] OTP for testing: ${otp}`);
    return { type: 'success', message: 'OTP sent (MOCK mode)' };
  }

  try {
    const text = encodeURIComponent(
      `TRULY PRO INFOS PRIVATE LIMITED: Use ${otp} to verify your login request. The OTP is valid for 10 minutes. Please do not share this OTP.`
    );
    const url = `http://bhashsms.com/api/sendmsg.php?user=${BHASH_USER}&pass=${BHASH_PASS}&sender=${BHASH_SENDER}&phone=${mobileNumber}&text=${text}&priority=ndnd&stype=normal`;

    console.log('📤 [BhashSMS] Sending OTP to:', mobileNumber);
    const response = await axios.get(url, { timeout: 10000 });
    const resData = String(response.data || '').trim();

    console.log('📥 [BhashSMS] Raw response:', JSON.stringify(resData));

    // BhashSMS returns numeric message ID on success (e.g. "12345678")
    // Treat any non-empty response that doesn't explicitly say "error" as success
    if (!resData) {
      console.error('❌ [BhashSMS] Empty response from API');
      throw new Error('BhashSMS returned empty response');
    }

    if (resData.toLowerCase().startsWith('error') || resData.toLowerCase().includes('invalid')) {
      console.error('❌ [BhashSMS] API Error:', resData);
      throw new Error(`BhashSMS Error: ${resData}`);
    }

    console.log('✅ [BhashSMS] OTP sent successfully. Response:', resData);
    return { type: 'success', message: 'OTP sent successfully' };

  } catch (error) {
    console.error('❌ [BhashSMS] Error:', error.message);
    throw new Error('Failed to send OTP via BhashSMS');
  }
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
