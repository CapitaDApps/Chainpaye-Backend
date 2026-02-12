const axios = require('axios');

const baseURL = 'http://localhost:4000/api/v1';

async function testNameField() {
  try {
    console.log('Testing payment link with name field...');
    
    // Create a payment link with a business name
    const response = await axios.post(`${baseURL}/payment-links`, {
      merchantId: 'merchant-123',
      userId: 'user-456',
      name: 'ChainPaye Solutions Ltd', // Business name
      amount: '250.00',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Professional services payment'
    });
    
    console.log('✅ Payment link created successfully:');
    console.log('ID:', response.data.data.id);
    console.log('Name:', response.data.data.name);
    console.log('Amount:', response.data.data.amount);
    console.log('Currency:', response.data.data.currency);
    
    const paymentLinkId = response.data.data.id;
    
    // Test verification endpoint to see if name is included
    console.log('\n--- Testing verification endpoint ---');
    const verifyResponse = await axios.get(`${baseURL}/payment-links/${paymentLinkId}/verify`);
    console.log('✅ Verification response:');
    console.log('Name:', verifyResponse.data.data.name);
    console.log('Is Active:', verifyResponse.data.data.isActive);
    
    // Test access endpoint to see if name is included
    console.log('\n--- Testing access endpoint ---');
    const accessResponse = await axios.post(`${baseURL}/payment-links/${paymentLinkId}/access`, {
      payerInfo: {
        payername: 'John Smith',
        payeraddress: '123 Business Street',
        payercity: 'New York',
        payerstate: 'NY',
        payercountry: 'US',
        payerphone: '1234567890'
      }
    });
    console.log('✅ Access response:');
    console.log('Name:', accessResponse.data.data.name);
    console.log('Transaction ID:', accessResponse.data.data.transactionId);
    
    // Test with different business names
    console.log('\n--- Testing with different business names ---');
    
    const businessNames = [
      'Tech Startup Inc',
      'Local Coffee Shop',
      'John Doe Consulting',
      'E-commerce Store'
    ];
    
    for (const businessName of businessNames) {
      const testResponse = await axios.post(`${baseURL}/payment-links`, {
        merchantId: 'test-merchant',
        userId: 'test-user',
        name: businessName,
        amount: '100.00',
        currency: 'NGN',
        token: 'USDT',
        selectedCurrency: 'NGN',
        paymentType: 'bank',
        description: `Payment for ${businessName}`
      });
      
      console.log(`✅ Created link for "${businessName}": ${testResponse.data.data.id}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testNameField();