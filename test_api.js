fetch('https://himameet-backend.onrender.com/api/delete-temp-user/9110413284')
  .then(res => res.text())
  .then(text => console.log('Response:', text))
  .catch(err => console.error('Error:', err));
