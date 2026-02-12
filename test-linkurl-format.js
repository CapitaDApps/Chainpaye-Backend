const axios = require('axios');

async function testLinkUrlFormat() {
  try {
    console.log('Testing payment link URL format...');
    
    const response = await axios.post('http://localhost:4000/api/v1/payment-links', {
      merchantId: 'test-merchant-url',
      userId: 'test-user-url',
      name: 'Test Link URL Format',
      amount: '50.00',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Testing URL format'
    });
    
    const paymentLink = response.data.data;
    console.log('✅ Payment link created successfully');
    console.log('ID:', paymentLink.id);
    console.log('Link URL:', paymentLink.linkUrl);
    console.log('Success URL:', paymentLink.successUrl);
    
    // Verify the URL format
    const expectedLinkUrl = `https://chainpaye.com/payment/${paymentLink.id}`;
    const expectedSuccessUrl = 'https://chainpaye.com/';
    
    if (paymentLink.linkUrl === expectedLinkUrl) {
      console.log('✅ Link URL format is correct');
    } else {
      console.log('❌ Link URL format is incorrect');
      console.log('Expected:', expectedLinkUrl);
      console.log('Actual:', paymentLink.linkUrl);
    }
    
    if (paymentLink.successUrl === expectedSuccessUrl) {
      console.log('✅ Success URL format is correct');
    } else {
      console.log('❌ Success URL format is incorrect');
      console.log('Expected:', expectedSuccessUrl);
      console.log('Actual:', paymentLink.successUrl);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLinkUrlFormat();