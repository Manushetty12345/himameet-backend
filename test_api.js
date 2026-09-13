const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('https://himameet-backend.onrender.com/api/auth/verify-otp', {
      mobile_number: '9110413284',
      country_code: '+91',
      otp: '123456'
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.log(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
}
test();
