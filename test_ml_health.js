const axios = require('axios');
axios.get('http://127.0.0.1:8000/health')
  .then(r => console.log('✓ ML Service is UP and HEALTHY! Response:', r.data))
  .catch(err => console.log('✗ ML Service Health Check Failed! Message:', err.message));
