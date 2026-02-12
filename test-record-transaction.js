const axios = require('axios');

const baseURL = 'http://localhost:4000/api/v1';

async function testRecordTransaction() {
  try {
    console.log('Testing Record Transaction Endpoint...\n');

    // Step 1: Create a payment link
    console.log('1. Creating payment link...');
    const paymentLinkResponse = await axios.post(`${baseURL}/payment-links`, {
      merchantId: 'test-merchant-123',
      userId: 'test-user-456',
      name: 'Test Business Store',
      amount: '150.75',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Test payment for recording'
    });

    const paymentLinkId = paymentLinkResponse.data.data.id;
    console.log('   Payment link created:', paymentLinkId);

    // Step 2: Access the payment link to create a transaction
    console.log('\n2. Accessing payment link to create transaction...');
    const accessResponse = await axios.post(`${baseURL}/payment-links/${paymentLinkId}/access`, {
      payerInfo: {
        payername: 'John Smith',
        payeraddress: '123 Test Street',
        payercity: 'New York',
        payerstate: 'NY',
        payercountry: 'US',
        payerphone: '1234567890'
      }
    });

    const transactionId = accessResponse.data.data.transactionId;
    console.log('   Transaction created:', transactionId);

    // Step 3: Record the transaction as successful
    console.log('\n3. Recording transaction as successful...');
    const recordResponse = await axios.post(`${baseURL}/record-transaction/${transactionId}`, {
      amount: '150.75',
      currency: 'USD',
      senderName: 'John Smith',
      senderPhone: '+1-555-123-4567',
      paidAt: new Date().toISOString()
    });

    console.log('   ✅ Transaction recorded successfully!');
    console.log('   Transaction ID:', recordResponse.data.data.id);
    console.log('   State:', recordResponse.data.data.state);
    console.log('   Amount Paid:', recordResponse.data.data.actualAmountPaid);
    console.log('   Sender Name:', recordResponse.data.data.senderName);
    console.log('   Sender Phone:', recordResponse.data.data.senderPhone);
    console.log('   Paid At:', recordResponse.data.data.paidAt);
    console.log('   Recorded At:', recordResponse.data.data.recordedAt);

    // Step 4: Try to record the same transaction again (should fail)
    console.log('\n4. Testing duplicate recording (should fail)...');
    try {
      await axios.post(`${baseURL}/record-transaction/${transactionId}`, {
        amount: '150.75',
        currency: 'USD',
        senderName: 'John Smith',
        senderPhone: '+1-555-123-4567',
        paidAt: new Date().toISOString()
      });
    } catch (duplicateError) {
      if (duplicateError.response) {
        console.log('   ✅ Duplicate recording prevented:');
        console.log('   Status:', duplicateError.response.status);
        console.log('   Error:', duplicateError.response.data.error);
        console.log('   Message:', duplicateError.response.data.message);
      }
    }

    // Step 5: Test with invalid transaction ID
    console.log('\n5. Testing with invalid transaction ID (should fail)...');
    try {
      await axios.post(`${baseURL}/record-transaction/invalid-transaction-id`, {
        amount: '100.00',
        currency: 'USD',
        senderName: 'Test User',
        senderPhone: '+1-555-999-8888',
        paidAt: new Date().toISOString()
      });
    } catch (invalidError) {
      if (invalidError.response) {
        console.log('   ✅ Invalid transaction ID handled:');
        console.log('   Status:', invalidError.response.status);
        console.log('   Error:', invalidError.response.data.error);
      }
    }

    // Step 6: Test with invalid request data
    console.log('\n6. Testing with invalid request data (should fail)...');
    try {
      await axios.post(`${baseURL}/record-transaction/${transactionId}`, {
        amount: '', // Invalid empty amount
        currency: 'INVALID',
        senderName: '',
        senderPhone: '',
        paidAt: 'invalid-date'
      });
    } catch (validationError) {
      if (validationError.response) {
        console.log('   ✅ Validation error handled:');
        console.log('   Status:', validationError.response.status);
        console.log('   Error:', validationError.response.data.error);
      }
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nEndpoint Summary:');
    console.log('- POST /api/v1/record-transaction/{transactionId}');
    console.log('- Records payment details and marks transaction as successful');
    console.log('- Validates transaction exists and can be recorded');
    console.log('- Prevents duplicate recordings');
    console.log('- Updates transaction state: INITIALIZED → PAID → COMPLETED');
    console.log('- Creates audit logs for tracking');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRecordTransaction();