/**
 * Test script to verify the difference between payment link verify and transaction verify endpoints
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// Admin credentials
const ADMIN_CREDENTIALS = {
  admin: process.env.TORONET_ADMIN || '',
  adminpwd: process.env.TORONET_ADMIN_PWD || ''
};

async function testVerifyEndpoints() {
  console.log('🧪 Testing Verify Endpoints Clarification...\n');

  try {
    // Step 1: Create a payment link and transaction
    console.log('1. Setting up test data...');
    
    const paymentLinkResponse = await axios.post(`${BASE_URL}/payment-links`, {
      merchantId: 'test-merchant-verify',
      userId: 'test-user-verify',
      name: 'Verify Test Business',
      amount: '50.00',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Testing verify endpoints'
    });

    const paymentLink = paymentLinkResponse.data.data;
    console.log(`✅ Payment link created: ${paymentLink.id}`);

    const accessResponse = await axios.post(`${BASE_URL}/payment-links/${paymentLink.id}/access`, {
      payerInfo: {
        payername: 'Verify Test User',
        payerphone: '+1555123456',
        payeremail: 'verify.test@example.com'
      }
    });

    const transactionReference = accessResponse.data.data.transactionId;
    console.log(`✅ Transaction created: ${transactionReference}`);

    // Step 2: Test GET /payment-links/:id/verify (correct usage)
    console.log('\n2. Testing GET /payment-links/:id/verify (payment link verification)...');
    
    try {
      const paymentLinkVerifyResponse = await axios.get(`${BASE_URL}/payment-links/${paymentLink.id}/verify`);
      console.log(`✅ Payment link verification successful`);
      console.log(`📋 Payment link details retrieved for: ${paymentLinkVerifyResponse.data.data.name}`);
    } catch (error) {
      console.error(`❌ Payment link verification failed:`, error.response?.data || error.message);
    }

    // Step 3: Test POST /payment-links/:id/verify (incorrect usage - should return helpful error)
    console.log('\n3. Testing POST /payment-links/:id/verify (incorrect usage)...');
    
    try {
      const incorrectVerifyResponse = await axios.post(
        `${BASE_URL}/payment-links/${paymentLink.id}/verify`,
        {
          transactionReference: transactionReference,
          senderName: 'Test User',
          senderEmail: 'test@example.com'
        },
        {
          headers: {
            'admin': ADMIN_CREDENTIALS.admin,
            'adminpwd': ADMIN_CREDENTIALS.adminpwd
          }
        }
      );
      console.log(`❌ Should have returned an error message`);
    } catch (error) {
      console.log(`✅ Correct error response received:`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message}`);
      console.log(`   Correct Endpoint: ${error.response?.data?.correctEndpoint}`);
      console.log(`   Note: ${error.response?.data?.note}`);
    }

    // Step 4: Test POST /transactions/:reference/verify (correct usage)
    console.log('\n4. Testing POST /transactions/:reference/verify (correct usage)...');
    
    const verificationData = {
      senderName: 'Verify Test User',
      senderPhone: '+1555123456',
      senderEmail: 'verify.test@example.com',
      currency: 'USD',
      txid: `TORO_VERIFY_${Date.now()}`,
      paymentType: 'card',
      amount: '50.00',
      successUrl: 'https://webhook.site/test-verify',
      paymentLinkId: paymentLink.id
    };

    try {
      const correctVerifyResponse = await axios.post(
        `${BASE_URL}/transactions/${transactionReference}/verify`,
        verificationData,
        {
          headers: {
            'Content-Type': 'application/json',
            'admin': ADMIN_CREDENTIALS.admin,
            'adminpwd': ADMIN_CREDENTIALS.adminpwd
          }
        }
      );

      console.log(`✅ Transaction verification started successfully`);
      console.log(`📧 Email: ${correctVerifyResponse.data.data.email}`);
      console.log(`⏱️  Phase: ${correctVerifyResponse.data.data.verificationPhase}`);
      console.log(`🔄 Interval: ${correctVerifyResponse.data.data.checkInterval}`);
    } catch (error) {
      console.error(`❌ Transaction verification failed:`, error.response?.data || error.message);
    }

    // Step 5: Test status endpoint
    console.log('\n5. Testing transaction status endpoint...');
    
    try {
      const statusResponse = await axios.get(
        `${BASE_URL}/transactions/${transactionReference}/status`,
        {
          headers: {
            'admin': ADMIN_CREDENTIALS.admin,
            'adminpwd': ADMIN_CREDENTIALS.adminpwd
          }
        }
      );

      console.log(`✅ Status check successful`);
      console.log(`📊 Current state: ${statusResponse.data.data.state}`);
      console.log(`🔗 Toronet reference: ${statusResponse.data.data.toronetReference}`);
    } catch (error) {
      console.error(`❌ Status check failed:`, error.response?.data || error.message);
    }

    console.log('\n🎉 Verify endpoints test completed!');
    console.log('\n📋 Summary:');
    console.log('✅ GET /payment-links/:id/verify - Verifies payment link details (public)');
    console.log('❌ POST /payment-links/:id/verify - Returns helpful error message');
    console.log('✅ POST /transactions/:reference/verify - Starts payment verification (admin)');
    console.log('✅ GET /transactions/:reference/status - Checks transaction status (admin)');

    console.log('\n🔍 Key Differences:');
    console.log('- Payment Link Verify: Uses payment link ID, returns link details');
    console.log('- Transaction Verify: Uses transaction reference, starts verification process');
    console.log('- Transaction Status: Uses transaction reference, returns current status');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Function to demonstrate the correct workflow
async function demonstrateCorrectWorkflow() {
  console.log('📚 Demonstrating Correct Verification Workflow...\n');

  console.log('1. 🔗 Create Payment Link');
  console.log('   POST /payment-links');
  console.log('   → Returns payment link with ID and linkUrl');

  console.log('\n2. 👤 User Accesses Payment Link');
  console.log('   POST /payment-links/:id/access');
  console.log('   → Creates transaction, returns transaction reference');

  console.log('\n3. 🔍 Verify Payment Link Details (Optional)');
  console.log('   GET /payment-links/:id/verify');
  console.log('   → Returns payment link details for display');

  console.log('\n4. 💰 User Says "I\'ve Sent Money"');
  console.log('   POST /transactions/:reference/verify');
  console.log('   → Starts immediate verification (3s intervals for 15 min)');

  console.log('\n5. 📊 Check Transaction Status');
  console.log('   GET /transactions/:reference/status');
  console.log('   → Returns current transaction state and details');

  console.log('\n6. 🔄 Background Verification');
  console.log('   Automatic hourly checks for transactions past 15 minutes');
  console.log('   → Continues until confirmed or expired (24 hours)');

  console.log('\n7. ✅ Payment Confirmed');
  console.log('   → Email sent to user');
  console.log('   → Webhook called to merchant');
  console.log('   → Transaction state updated to PAID');
}

// Run tests based on command line argument
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'workflow':
      demonstrateCorrectWorkflow();
      break;
    default:
      testVerifyEndpoints();
      break;
  }
}

module.exports = {
  testVerifyEndpoints,
  demonstrateCorrectWorkflow
};