const axios = require('axios');

const baseURL = 'http://localhost:4000/api/v1';

async function testFriendlyErrorMessages() {
  console.log('Testing friendly error messages for payment links...\n');

  // Test 1: Non-existent payment link ID
  console.log('1. Testing non-existent payment link:');
  try {
    await axios.get(`${baseURL}/payment-links/nonexistent123456789012/verify`);
  } catch (error) {
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error);
    }
  }

  // Test 2: Invalid payment link ID format
  console.log('\n2. Testing invalid payment link ID format:');
  try {
    await axios.get(`${baseURL}/payment-links/invalid-id/verify`);
  } catch (error) {
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error);
    }
  }

  // Test 3: Accessing non-existent payment link
  console.log('\n3. Testing access to non-existent payment link:');
  try {
    await axios.post(`${baseURL}/payment-links/nonexistent123456789012/access`);
  } catch (error) {
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error);
    }
  }

  // Test 4: Create a payment link, then disable it, then try to access
  console.log('\n4. Testing disabled payment link access:');
  try {
    // First create a payment link
    const createResponse = await axios.post(`${baseURL}/payment-links`, {
      merchantId: 'test-merchant',
      userId: 'test-user',
      name: 'Test Business',
      amount: '50.00',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Test payment for error handling'
    });

    const paymentLinkId = createResponse.data.data.id;
    console.log('   Created payment link:', paymentLinkId);

    // Disable the payment link
    await axios.patch(`${baseURL}/payment-links/${paymentLinkId}/disable`, {
      reason: 'Testing error messages'
    });
    console.log('   Payment link disabled');

    // Try to access the disabled payment link
    try {
      await axios.post(`${baseURL}/payment-links/${paymentLinkId}/access`);
    } catch (accessError) {
      if (accessError.response) {
        console.log('   Status:', accessError.response.status);
        console.log('   Error:', accessError.response.data.error);
      }
    }

    // Try to disable it again
    console.log('\n5. Testing double disable:');
    try {
      await axios.patch(`${baseURL}/payment-links/${paymentLinkId}/disable`, {
        reason: 'Testing double disable'
      });
    } catch (disableError) {
      if (disableError.response) {
        console.log('   Status:', disableError.response.status);
        console.log('   Error:', disableError.response.data.error);
      }
    }

    // Enable it back
    await axios.patch(`${baseURL}/payment-links/${paymentLinkId}/enable`);
    console.log('\n   Payment link re-enabled');

    // Try to enable it again
    console.log('\n6. Testing double enable:');
    try {
      await axios.patch(`${baseURL}/payment-links/${paymentLinkId}/enable`);
    } catch (enableError) {
      if (enableError.response) {
        console.log('   Status:', enableError.response.status);
        console.log('   Error:', enableError.response.data.error);
      }
    }

  } catch (error) {
    console.error('   Setup error:', error.response?.data || error.message);
  }

  // Test 7: Missing payment link ID
  console.log('\n7. Testing missing payment link ID:');
  try {
    await axios.get(`${baseURL}/payment-links//verify`);
  } catch (error) {
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error || 'Route not found');
    }
  }

  console.log('\n✅ Friendly error message testing completed!');
  console.log('\nKey improvements:');
  console.log('- Clear, user-friendly language');
  console.log('- Helpful suggestions for next steps');
  console.log('- Context-specific messages');
  console.log('- Professional tone suitable for end users');
}

testFriendlyErrorMessages().catch(console.error);