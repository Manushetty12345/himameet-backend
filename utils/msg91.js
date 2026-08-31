const axios = require('axios');

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

/**
 * Sends an OTP to the given mobile number.
 * @param {string} mobileNumber - 10 digit number
 * @param {string} countryCode - e.g., '91' (without +)
 */
exports.sendOTP = async (mobileNumber, countryCode) => {
  try {
    const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${countryCode}${mobileNumber}&authkey=${MSG91_AUTH_KEY}`;
    
    // FOR DEVELOPMENT: if key is missing, mock it
    if (MSG91_AUTH_KEY === 'YOUR_MSG91_KEY_HERE') {
      console.log(`[MOCK MSG91] OTP sent to ${countryCode}${mobileNumber}`);
      return { type: 'success', message: 'OTP sent successfully (MOCK)' };
    }

    const response = await axios.post(url);
    return response.data;
  } catch (error) {
    console.error('MSG91 Send Error:', error.response?.data || error.message);
    throw new Error('Failed to send OTP');
  }
};

/**
 * Verifies the OTP for the given mobile number.
 * @param {string} mobileNumber - 10 digit number
 * @param {string} countryCode - e.g., '91' (without +)
 * @param {string} otp - The 6 digit OTP
 */
exports.verifyOTP = async (mobileNumber, countryCode, otp) => {
  try {
    const url = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${countryCode}${mobileNumber}&authkey=${MSG91_AUTH_KEY}`;
    
    // FOR DEVELOPMENT: if key is missing, mock it (e.g., 123456 always works)
    if (MSG91_AUTH_KEY === 'YOUR_MSG91_KEY_HERE') {
      if (otp === '123456') {
        console.log(`[MOCK MSG91] OTP Verified for ${countryCode}${mobileNumber}`);
        return { type: 'success', message: 'OTP verified successfully (MOCK)' };
      } else {
        return { type: 'error', message: 'Invalid OTP' };
      }
    }

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('MSG91 Verify Error:', error.response?.data || error.message);
    throw new Error('Failed to verify OTP');
  }
};
