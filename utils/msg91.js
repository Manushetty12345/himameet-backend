const axios = require('axios');

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

exports.sendOTP = async (mobileNumber, countryCode) => {
  console.log('📤 [MSG91] sendOTP called');
  console.log('📤 [MSG91] Auth Key present:', !!MSG91_AUTH_KEY, '| Starts with:', MSG91_AUTH_KEY ? MSG91_AUTH_KEY.slice(0,6) : 'NULL');
  console.log('📤 [MSG91] Template ID:', MSG91_TEMPLATE_ID);
  console.log('📤 [MSG91] Mobile:', countryCode + mobileNumber);

  if (!MSG91_AUTH_KEY || MSG91_AUTH_KEY === 'YOUR_MSG91_KEY_HERE') {
    console.log('⚠️  [MSG91] No real key — MOCK mode');
    return { type: 'success', message: 'OTP sent successfully (MOCK)' };
  }

  try {
    const url = 'https://control.msg91.com/api/v5/otp?template_id=' + MSG91_TEMPLATE_ID + '&mobile=' + countryCode + mobileNumber + '&authkey=' + MSG91_AUTH_KEY;
    console.log('📤 [MSG91] Calling MSG91...');
    const response = await axios.post(url);
    console.log('✅ [MSG91] Response:', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error('❌ [MSG91] Error Status:', error.response ? error.response.status : 'NO_STATUS');
    console.error('❌ [MSG91] Error Data:', JSON.stringify(error.response ? error.response.data : null));
    console.error('❌ [MSG91] Error Message:', error.message);
    throw new Error((error.response && error.response.data && error.response.data.message) || 'Failed to send OTP');
  }
};

exports.verifyOTP = async (mobileNumber, countryCode, otp) => {
  console.log('🔍 [MSG91] verifyOTP called');
  console.log('🔍 [MSG91] Mobile:', countryCode + mobileNumber, '| OTP:', otp);
  console.log('🔍 [MSG91] Auth Key present:', !!MSG91_AUTH_KEY, '| Starts with:', MSG91_AUTH_KEY ? MSG91_AUTH_KEY.slice(0,6) : 'NULL');

  if (!MSG91_AUTH_KEY || MSG91_AUTH_KEY === 'YOUR_MSG91_KEY_HERE') {
    console.log('⚠️  [MSG91] No real key — MOCK mode');
    if (otp === '123456') {
      return { type: 'success', message: 'OTP verified (MOCK)' };
    } else {
      return { type: 'error', message: 'Invalid OTP' };
    }
  }

  try {
    const url = 'https://control.msg91.com/api/v5/otp/verify?otp=' + otp + '&mobile=' + countryCode + mobileNumber + '&authkey=' + MSG91_AUTH_KEY;
    console.log('🔍 [MSG91] Calling MSG91 verify...');
    const response = await axios.get(url);
    console.log('✅ [MSG91] Verify Response:', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error('❌ [MSG91] Verify Error Status:', error.response ? error.response.status : 'NO_STATUS');
    console.error('❌ [MSG91] Verify Error Data:', JSON.stringify(error.response ? error.response.data : null));
    console.error('❌ [MSG91] Verify Error Message:', error.message);
    throw new Error((error.response && error.response.data && error.response.data.message) || 'Failed to verify OTP');
  }
};

