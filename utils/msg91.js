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
  console.log('📤 [MSG91] sendOTP called for:', fullNumber);
  console.log('📤 [MSG91] MOCK_OTP mode:', IS_MOCK);

  if (IS_MOCK) {
    const otp = generateOTP();
    otpStore[fullNumber] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    console.log('🔑 [MOCK OTP] Generated OTP for', fullNumber, ':', otp);
    console.log('✅ [MOCK] Use this OTP in the app:', otp);
    return { type: 'success', message: 'OTP sent (MOCK)' };
  }

  try {
    const url = 'https://control.msg91.com/api/v5/otp?template_id=' + MSG91_TEMPLATE_ID + '&mobile=' + fullNumber + '&authkey=' + MSG91_AUTH_KEY;
    console.log('📤 [MSG91] Calling MSG91...');
    const response = await axios.post(url);
    console.log('✅ [MSG91] Response:', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error('❌ [MSG91] Error:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw new Error((error.response && error.response.data && error.response.data.message) || 'Failed to send OTP');
  }
};

exports.verifyOTP = async (mobileNumber, countryCode, otp) => {
  const fullNumber = countryCode + mobileNumber;
  console.log('🔍 [MSG91] verifyOTP for:', fullNumber, '| OTP entered:', otp);
  console.log('🔍 [MSG91] MOCK_OTP mode:', IS_MOCK);

  if (IS_MOCK) {
    const stored = otpStore[fullNumber];
    if (!stored) {
      console.log('❌ [MOCK] No OTP found. Request a new one.');
      return { type: 'error', message: 'OTP expired. Please request a new one.' };
    }
    if (Date.now() > stored.expires) {
      delete otpStore[fullNumber];
      console.log('❌ [MOCK] OTP expired.');
      return { type: 'error', message: 'OTP expired. Please request a new one.' };
    }
    if (otp === stored.otp) {
      delete otpStore[fullNumber];
      console.log('✅ [MOCK] OTP verified successfully!');
      return { type: 'success', message: 'OTP verified' };
    } else {
      console.log('❌ [MOCK] Wrong OTP. Expected:', stored.otp, '| Got:', otp);
      return { type: 'error', message: 'Invalid OTP' };
    }
  }

  try {
    const url = 'https://control.msg91.com/api/v5/otp/verify?otp=' + otp + '&mobile=' + fullNumber + '&authkey=' + MSG91_AUTH_KEY;
    console.log('🔍 [MSG91] Calling MSG91 verify...');
    const response = await axios.get(url);
    console.log('✅ [MSG91] Verify Response:', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error('❌ [MSG91] Verify Error:', error.response ? JSON.stringify(error.response.data) : error.message);
    throw new Error((error.response && error.response.data && error.response.data.message) || 'Failed to verify OTP');
  }
};