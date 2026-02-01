const axios = require('axios');

const baseURL = 'http://localhost:4000/api/v1';

async function createPaymentLink() {
  try {
    console.log('Creating payment link...');
    const response = await axios.post(`${baseURL}/payment-links`, {
      merchantId: 'test-merchant-123',
      userId: 'test-user-456',
      amount: '100.50',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Test payment link'
    });
    
    console.log('Payment link created successfully:');
    console.log('ID:', response.data.data.id);
    console.log('Link URL:', response.data.data.linkUrl);
    console.log('Amount:', response.data.data.amount);
    console.log('Currency:', response.data.data.currency);
    
    return response.data.data.id;
  } catch (error) {
    console.error('Error creating payment link:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function accessPaymentLink(id) {
  try {
    console.log(`\nAccessing payment link ${id}...`);
    const response = await axios.post(`${baseURL}/payment-links/${id}/access`, {
      payerInfo: {
        payername: 'John Doe',
        payeraddress: '123 Test Street',
        payercity: 'Test City',
        payerstate: 'Test State',
        payercountry: 'US',
        payerphone: '1234567890'
      }
    });
    
    console.log('Payment link accessed successfully:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error accessing payment link:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function main() {
  // First create a payment link
  const paymentLinkId = await createPaymentLink();
  
  if (paymentLinkId) {
    // Then try to access it
    await accessPaymentLink(paymentLinkId);
  }
  
  // Also try to access the specific ID you mentioned
  console.log('\n--- Testing specific ID ---');
  await accessPaymentLink('697ecadd88e5e54e39285e80');
}

main().catch(console.error);