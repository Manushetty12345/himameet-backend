const axios = require('axios');
async function test() {
  try {
    await axios.post('https://himameet-backend.onrender.com/api/auth/send-otp', {
      mobile_number: '9110413284',
      country_code: '+91'
    });
    // Assuming backend returns OTP in dev mode, wait, bhashsms doesn't.
    // I can just query the database to see the user's status!
  } catch(e) {}
}
