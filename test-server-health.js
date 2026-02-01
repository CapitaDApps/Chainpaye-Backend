const axios = require('axios');

async function testServerHealth() {
  try {
    console.log('Testing server health...');
    
    // Test basic health endpoint
    const healthResponse = await axios.get('http://localhost:4000/api/v1/health');
    console.log('Health check:', healthResponse.data);
    
    // Test if we can create a payment link (this will test database connectivity)
    console.log('\nTesting payment link creation...');
    try {
      const createResponse = await axios.post('http://localhost:4000/api/v1/payment-links', {
        merchantId: 'debug-merchant',
        userId: 'debug-user',
        amount: '10.00',
        currency: 'USD',
        token: 'USDT',
        selectedCurrency: 'USD',
        paymentType: 'card',
        description: 'Debug test'
      });
      console.log('✅ Payment link created:', createResponse.data.data.id);
      
      // Now test accessing the newly created link
      const newId = createResponse.data.data.id;
      console.log(`\nTesting access to newly created link: ${newId}`);
      
      const accessResponse = await axios.post(`http://localhost:4000/api/v1/payment-links/${newId}/access`);
      console.log('✅ New link access successful');
      
    } catch (createError) {
      console.error('❌ Payment link creation failed:');
      if (createError.response) {
        console.error('Status:', createError.response.status);
        console.error('Data:', createError.response.data);
      } else {
        console.error('Error:', createError.message);
      }
    }
    
    // Test the specific problematic ID
    console.log('\nTesting problematic ID: 697ecadd88e5e54e39285e80');
    try {
      const specificResponse = await axios.post('http://localhost:4000/api/v1/payment-links/697ecadd88e5e54e39285e80/access');
      console.log('✅ Specific ID access successful:', specificResponse.data);
    } catch (specificError) {
      console.error('❌ Specific ID access failed:');
      if (specificError.response) {
        console.error('Status:', specificError.response.status);
        console.error('Data:', specificError.response.data);
      } else {
        console.error('Error:', specificError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Server health test failed:', error.message);
  }
}

testServerHealth();