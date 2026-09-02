const axios = require('axios');

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const IS_MOCK = process.env.MOCK_OTP === 'true';

// In-memory OTP store (for dev/testing)
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.sendOTP = async (mobileNumber, countryCode) => {
  const fullNumber = countryCode + mobileNumber;
  console.log('📤 [BhashSMS] sendOTP called for:', fullNumber);
  
  // 1. Generate and Store OTP
  const otp = generateOTP();
  otpStore[fullNumber] = { otp, expires: Date.now() + 10 * 60 * 1000 };
  console.log('🔑 [OTP STORE] Generated OTP for', fullNumber, ':', otp);

  if (IS_MOCK) {
    console.log('✅ [MOCK] Use this OTP in the app:', otp);
    return { type: 'success', message: 'OTP sent (MOCK)' };
  }

  // 2. Call BhashSMS API
  try {
    const text = encodeURIComponent(`TRULY PRO INFOS PRIVATE LIMITED: Use ${otp} to verify your login request. The OTP is valid for 10 minutes. Please do not share this OTP.`);
    // Using GET request as per BhashSMS standard, though POST with form-data is also fine.
    // Axios will safely fetch the URL
    const url = `http://bhashsms.com/api/sendmsg.php?user=Trulypro_infos&pass=123456&sender=TRPIPL&phone=${mobileNumber}&text=${text}&priority=ndnd&stype=normal`;
    
    console.log('📤 [BhashSMS] Calling API...');
    const response = await axios.get(url);
    
    // BhashSMS usually returns plain text starting with S.xxxx on success
    if (response.data && response.data.includes('S.')) {
      console.log('✅ [BhashSMS] Response:', response.data);
      return { type: 'success', message: 'OTP sent successfully' };
    } else {
      console.error('❌ [BhashSMS] API rejected:', response.data);
      throw new Error('BhashSMS failed to send');
    }
  } catch (error) {
    console.error('❌ [BhashSMS] Error:', error.message);
    throw new Error('Failed to send OTP via BhashSMS');
  }
};

exports.verifyOTP = async (mobileNumber, countryCode, otp) => {
  const fullNumber = countryCode + mobileNumber;
  console.log('🔍 [BhashSMS] verifyOTP for:', fullNumber, '| OTP entered:', otp);

  const stored = otpStore[fullNumber];
  if (!stored) {
    console.log('❌ [Verify] No OTP found. Request a new one.');
    return { type: 'error', message: 'OTP expired. Please request a new one.' };
  }
  
  if (Date.now() > stored.expires) {
    delete otpStore[fullNumber];
    console.log('❌ [Verify] OTP expired.');
    return { type: 'error', message: 'OTP expired. Please request a new one.' };
  }
  
  if (otp === stored.otp) {
    delete otpStore[fullNumber];
    console.log('✅ [Verify] OTP verified successfully!');
    return { type: 'success', message: 'OTP verified' };
  } else {
    console.log('❌ [Verify] Wrong OTP. Expected:', stored.otp, '| Got:', otp);
    return { type: 'error', message: 'Invalid OTP' };
  }
};