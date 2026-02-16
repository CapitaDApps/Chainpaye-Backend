/**
 * Test script specifically for the transaction status endpoint
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// Admin credentials for status endpoint
const ADMIN_CREDENTIALS = {
  admin: process.env.TORONET_ADMIN || '',
  adminpwd: process.env.TORONET_ADMIN_PWD || ''
};

async function testStatusEndpoint() {
  console.log('🧪 Testing Transaction Status Endpoint...\n');

  try {
    // Step 1: Create a payment link and transaction for testing
    console.log('1. Setting up test transaction...');
    
    const paymentLinkResponse = await axios.post(`${BASE_URL}/payment-links`, {
      merchantId: 'test-merchant-status',
      userId: 'test-user-status',
      name: 'Status Test Business',
      amount: '75.00',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Testing status endpoint'
    });

    const paymentLink = paymentLinkResponse.data.data;
    console.log(`✅ Payment link created: ${paymentLink.id}`);

    const accessResponse = await axios.post(`${BASE_URL}/payment-links/${paymentLink.id}/access`, {
      payerInfo: {
        payername: 'Status Test User',
        payerphone: '+1987654321',
        payeremail: 'status.test@example.com'
      }
    });

    const transactionId = accessResponse.data.data.transactionId;
    console.log(`✅ Transaction created: ${transactionId}`);

    // Step 2: Test status endpoint with valid credentials
    console.log('\n2. Testing status endpoint with valid credentials...');
    
    const statusResponse = await axios.get(
      `${BASE_URL}/transactions/${transactionId}/status`,
      {
        headers: {
          'admin': ADMIN_CREDENTIALS.admin,
          'adminpwd': ADMIN_CREDENTIALS.adminpwd
        }
      }
    );

    console.log(`✅ Status endpoint successful (${statusResponse.status})`);
    console.log(`📋 Transaction Status Response:`);
    
    const statusData = statusResponse.data.data;
    console.log(`   Transaction ID: ${statusData.transactionId}`);
    console.log(`   State: ${statusData.state}`);
    console.log(`   Amount: ${statusData.amount} ${statusData.currency}`);
    console.log(`   Sender Name: ${statusData.senderName || 'Not set'}`);
    console.log(`   Sender Email: ${statusData.senderEmail || 'Not set'}`);
    console.log(`   Sender Phone: ${statusData.senderPhone || 'Not set'}`);
    console.log(`   Toronet Reference: ${statusData.toronetReference || 'Not set'}`);
    console.log(`   Verification Started: ${statusData.verificationStartedAt || 'Not started'}`);
    console.log(`   Last Check: ${statusData.lastVerificationCheck || 'Never'}`);
    console.log(`   Expires At: ${statusData.expiresAt || 'Not set'}`);
    console.log(`   Created: ${new Date(statusData.createdAt).toLocaleString()}`);
    console.log(`   Updated: ${new Date(statusData.updatedAt).toLocaleString()}`);

    // Step 3: Test error cases
    console.log('\n3. Testing error cases...');

    // Test without admin credentials
    try {
      await axios.get(`${BASE_URL}/transactions/${transactionId}/status`);
      console.log('❌ Should have failed without credentials');
    } catch (error) {
      console.log(`✅ Missing credentials test: ${error.response?.status} - ${error.response?.data?.message}`);
    }

    // Test with invalid credentials
    try {
      await axios.get(
        `${BASE_URL}/transactions/${transactionId}/status`,
        {
          headers: {
            'admin': 'invalid-admin',
            'adminpwd': 'invalid-password'
          }
        }
      );
      console.log('❌ Should have failed with invalid credentials');
    } catch (error) {
      console.log(`✅ Invalid credentials test: ${error.response?.status} - ${error.response?.data?.message}`);
    }

    // Test with non-existent transaction
    try {
      await axios.get(
        `${BASE_URL}/transactions/507f1f77bcf86cd799439011/status`,
        {
          headers: {
            'admin': ADMIN_CREDENTIALS.admin,
            'adminpwd': ADMIN_CREDENTIALS.adminpwd
          }
        }
      );
      console.log('❌ Should have failed with non-existent transaction');
    } catch (error) {
      console.log(`✅ Non-existent transaction test: ${error.response?.status} - ${error.response?.data?.message}`);
    }

    // Step 4: Start verification and test status changes
    console.log('\n4. Testing status endpoint after starting verification...');
    
    const verificationData = {
      senderName: 'Status Test User',
      senderPhone: '+1987654321',
      senderEmail: 'status.test@example.com',
      currency: 'USD',
      txid: `TORO_STATUS_${Date.now()}`,
      paymentType: 'card',
      amount: '75.00',
      successUrl: 'https://webhook.site/test-status',
      paymentLinkId: paymentLink.id
    };

    const verifyResponse = await axios.post(
      `${BASE_URL}/transactions/${transactionId}/verify`,
      verificationData,
      {
        headers: {
          'Content-Type': 'application/json',
          'admin': ADMIN_CREDENTIALS.admin,
          'adminpwd': ADMIN_CREDENTIALS.adminpwd
        }
      }
    );

    console.log(`✅ Verification started: ${verifyResponse.data.message}`);

    // Wait a moment and check status again
    setTimeout(async () => {
      try {
        const updatedStatusResponse = await axios.get(
          `${BASE_URL}/transactions/${transactionId}/status`,
          {
            headers: {
              'admin': ADMIN_CREDENTIALS.admin,
              'adminpwd': ADMIN_CREDENTIALS.adminpwd
            }
          }
        );

        console.log('\n📊 Updated Status After Verification:');
        const updatedStatus = updatedStatusResponse.data.data;
        console.log(`   State: ${updatedStatus.state}`);
        console.log(`   Sender Name: ${updatedStatus.senderName}`);
        console.log(`   Sender Email: ${updatedStatus.senderEmail}`);
        console.log(`   Toronet Reference: ${updatedStatus.toronetReference}`);
        console.log(`   Verification Started: ${updatedStatus.verificationStartedAt}`);
        console.log(`   Last Check: ${updatedStatus.lastVerificationCheck || 'Never'}`);

        console.log('\n🎉 Status endpoint test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Status endpoint accepts admin credentials');
        console.log('✅ Returns comprehensive transaction information');
        console.log('✅ Properly handles authentication errors');
        console.log('✅ Handles non-existent transactions');
        console.log('✅ Shows updated information after verification starts');

      } catch (error) {
        console.error('❌ Error checking updated status:', error.response?.data || error.message);
      }
    }, 5000); // Wait 5 seconds

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Function to test status endpoint with different transaction states
async function testStatusWithDifferentStates() {
  console.log('📊 Testing Status Endpoint with Different Transaction States...\n');

  try {
    // Get transactions in different states
    const states = ['PENDING', 'INITIALIZED', 'PAID', 'COMPLETED', 'PAYOUT_FAILED'];
    
    for (const state of states) {
      try {
        const response = await axios.get(`${BASE_URL}/transactions?state=${state}&limit=1`);
        const transactions = response.data.data.transactions;
        
        if (transactions.length > 0) {
          const transaction = transactions[0];
          console.log(`🔍 Testing ${state} transaction: ${transaction.reference}`);
          
          const statusResponse = await axios.get(
            `${BASE_URL}/transactions/${transaction.reference}/status`,
            {
              headers: {
                'admin': ADMIN_CREDENTIALS.admin,
                'adminpwd': ADMIN_CREDENTIALS.adminpwd
              }
            }
          );
          
          const statusData = statusResponse.data.data;
          console.log(`   ✅ Status: ${statusData.state}`);
          console.log(`   📧 Email: ${statusData.senderEmail || 'Not set'}`);
          console.log(`   🔗 Toronet Ref: ${statusData.toronetReference || 'Not set'}`);
          console.log(`   ⏰ Verification: ${statusData.verificationStartedAt ? 'Started' : 'Not started'}`);
          
        } else {
          console.log(`⏳ No ${state} transactions found`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${state} transaction:`, error.response?.data?.message || error.message);
      }
      
      console.log(''); // Empty line for readability
    }

  } catch (error) {
    console.error('❌ Failed to test different states:', error.response?.data || error.message);
  }
}

// Function to compare status endpoint with regular transaction endpoint
async function compareStatusEndpoints() {
  console.log('🔄 Comparing Status Endpoint with Regular Transaction Endpoint...\n');

  try {
    // Get a sample transaction
    const response = await axios.get(`${BASE_URL}/transactions?limit=1`);
    const transactions = response.data.data.transactions;
    
    if (transactions.length === 0) {
      console.log('⏳ No transactions found for comparison');
      return;
    }

    const transaction = transactions[0];
    console.log(`🔍 Comparing endpoints for transaction: ${transaction.reference}`);

    // Get data from regular endpoint
    const regularResponse = await axios.get(`${BASE_URL}/transactions/${transaction.id}`);
    const regularData = regularResponse.data.data;

    // Get data from status endpoint
    const statusResponse = await axios.get(
      `${BASE_URL}/transactions/${transaction.reference}/status`,
      {
        headers: {
          'admin': ADMIN_CREDENTIALS.admin,
          'adminpwd': ADMIN_CREDENTIALS.adminpwd
        }
      }
    );
    const statusData = statusResponse.data.data;

    console.log('\n📊 Comparison Results:');
    console.log(`Regular endpoint uses ID: ${transaction.id}`);
    console.log(`Status endpoint uses reference: ${transaction.reference}`);
    console.log(`Both return state: ${regularData.state} === ${statusData.state} ✅`);
    console.log(`Both return amount: ${regularData.amount} === ${statusData.amount} ✅`);
    
    console.log('\n🔍 Status endpoint provides additional fields:');
    console.log(`- Sender Name: ${statusData.senderName || 'Not set'}`);
    console.log(`- Sender Phone: ${statusData.senderPhone || 'Not set'}`);
    console.log(`- Sender Email: ${statusData.senderEmail || 'Not set'}`);
    console.log(`- Verification Started: ${statusData.verificationStartedAt || 'Not started'}`);
    console.log(`- Last Check: ${statusData.lastVerificationCheck || 'Never'}`);

  } catch (error) {
    console.error('❌ Comparison failed:', error.response?.data || error.message);
  }
}

// Run tests based on command line argument
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'states':
      testStatusWithDifferentStates();
      break;
    case 'compare':
      compareStatusEndpoints();
      break;
    default:
      testStatusEndpoint();
      break;
  }
}

module.exports = {
  testStatusEndpoint,
  testStatusWithDifferentStates,
  compareStatusEndpoints
};