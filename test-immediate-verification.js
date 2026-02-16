/**
 * Test script for the new immediate + background verification system
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// Admin credentials for verification endpoint
const ADMIN_CREDENTIALS = {
  admin: process.env.TORONET_ADMIN || '',
  adminpwd: process.env.TORONET_ADMIN_PWD || ''
};

async function testImmediateVerification() {
  console.log('🧪 Testing Immediate + Background Verification System...\n');

  try {
    // Step 1: Create a payment link
    console.log('1. Creating test payment link...');
    const paymentLinkResponse = await axios.post(`${BASE_URL}/payment-links`, {
      merchantId: 'test-merchant-immediate',
      userId: 'test-user-immediate',
      name: 'Immediate Verification Test',
      amount: '150.00',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Testing immediate verification system',
      successUrl: 'https://webhook.site/your-webhook-url-here'
    });

    const paymentLink = paymentLinkResponse.data.data;
    console.log(`✅ Payment link created: ${paymentLink.id}`);

    // Step 2: Access the payment link to create a transaction
    console.log('\n2. Accessing payment link to create transaction...');
    const accessResponse = await axios.post(`${BASE_URL}/payment-links/${paymentLink.id}/access`, {
      payerInfo: {
        payername: 'Immediate Test User',
        payerphone: '+1234567890',
        payeremail: 'immediate.test@example.com'
      }
    });

    const transactionId = accessResponse.data.data.transactionId;
    const transactionReference = accessResponse.data.data.transactionId; // This should be the reference
    console.log(`✅ Transaction created: ${transactionId}`);
    console.log(`📋 Transaction reference: ${transactionReference}`);

    // Step 3: Get initial transaction details
    console.log('\n3. Checking initial transaction state...');
    const initialTransactionResponse = await axios.get(`${BASE_URL}/transactions/${transactionId}`);
    const initialTransaction = initialTransactionResponse.data.data;
    
    console.log(`📋 Initial Transaction Details:`);
    console.log(`   ID: ${initialTransaction.id}`);
    console.log(`   Reference: ${initialTransaction.reference}`);
    console.log(`   State: ${initialTransaction.state}`);
    console.log(`   Amount: ${initialTransaction.amount} ${initialTransaction.currency}`);

    // Step 4: Start immediate verification
    console.log('\n4. Starting immediate verification...');
    const verificationData = {
      senderName: 'Immediate Test User',
      senderPhone: '+1234567890',
      senderEmail: 'immediate.test@example.com',
      currency: 'USD',
      txid: `TORO_${Date.now()}_TEST`, // Mock Toronet reference
      paymentType: 'card',
      amount: '150.00',
      successUrl: 'https://webhook.site/your-webhook-url-here',
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

    console.log(`✅ Verification started successfully`);
    console.log(`📧 Email: ${verifyResponse.data.data.email}`);
    console.log(`⏱️  Phase: ${verifyResponse.data.data.verificationPhase}`);
    console.log(`🔄 Interval: ${verifyResponse.data.data.checkInterval}`);
    console.log(`⏰ Duration: ${verifyResponse.data.data.duration}`);

    // Step 5: Monitor transaction state changes
    console.log('\n5. Monitoring transaction state (will check for 2 minutes)...');
    const monitoringDuration = 2 * 60 * 1000; // 2 minutes
    const checkInterval = 10 * 1000; // 10 seconds
    const startTime = Date.now();

    const monitorInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= monitoringDuration) {
        clearInterval(monitorInterval);
        console.log('\n⏱️ Monitoring period ended');
        return;
      }

      try {
        // Test the new status endpoint
        const statusResponse = await axios.get(
          `${BASE_URL}/transactions/${transactionId}/status`,
          {
            headers: {
              'admin': ADMIN_CREDENTIALS.admin,
              'adminpwd': ADMIN_CREDENTIALS.adminpwd
            }
          }
        );
        
        const statusData = statusResponse.data.data;
        console.log(`📊 [${Math.floor(elapsed/1000)}s] Status: ${statusData.state}, Last Check: ${statusData.lastVerificationCheck || 'Never'}`);
        
        if (statusData.state !== 'PENDING') {
          clearInterval(monitorInterval);
          console.log(`\n🎉 Transaction state changed to: ${statusData.state}`);
          
          if (statusData.state === 'PAID') {
            console.log(`✅ Payment confirmed!`);
            console.log(`📧 Confirmation email should be sent to: ${statusData.senderEmail}`);
            console.log(`📤 Webhook should be called to: ${verificationData.successUrl}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error monitoring transaction:`, error.message);
      }
    }, checkInterval);

    // Step 6: Test the status endpoint specifically
    setTimeout(async () => {
      console.log('\n6. Testing status endpoint...');
      
      try {
        const statusResponse = await axios.get(
          `${BASE_URL}/transactions/${transactionId}/status`,
          {
            headers: {
              'admin': ADMIN_CREDENTIALS.admin,
              'adminpwd': ADMIN_CREDENTIALS.adminpwd
            }
          }
        );
        
        console.log(`✅ Status endpoint test successful`);
        console.log(`📋 Transaction Status Details:`);
        const status = statusResponse.data.data;
        console.log(`   Transaction ID: ${status.transactionId}`);
        console.log(`   State: ${status.state}`);
        console.log(`   Amount: ${status.amount} ${status.currency}`);
        console.log(`   Sender: ${status.senderName} (${status.senderEmail})`);
        console.log(`   Toronet Ref: ${status.toronetReference || 'Not set'}`);
        console.log(`   Verification Started: ${status.verificationStartedAt || 'Not started'}`);
        console.log(`   Last Check: ${status.lastVerificationCheck || 'Never'}`);
        console.log(`   Expires: ${status.expiresAt || 'Not set'}`);
        
      } catch (error) {
        console.error(`❌ Status endpoint test failed:`, error.response?.data || error.message);
      }
    }, 20000); // Wait 20 seconds

    // Step 7: Test error cases
    // Step 7: Test error cases
    setTimeout(async () => {
      console.log('\n7. Testing error cases...');
      
      // Test status endpoint with invalid transaction reference
      try {
        await axios.get(
          `${BASE_URL}/transactions/invalid-reference/status`,
          {
            headers: {
              'admin': ADMIN_CREDENTIALS.admin,
              'adminpwd': ADMIN_CREDENTIALS.adminpwd
            }
          }
        );
      } catch (error) {
        console.log(`✅ Status endpoint invalid reference test: ${error.response?.status} - ${error.response?.data?.message}`);
      }

      // Test status endpoint without admin credentials
      try {
        await axios.get(`${BASE_URL}/transactions/${initialTransaction.reference}/status`);
      } catch (error) {
        console.log(`✅ Status endpoint missing credentials test: ${error.response?.status} - ${error.response?.data?.message}`);
      }

      // Test verify endpoint with invalid transaction reference
      try {
        await axios.post(
          `${BASE_URL}/transactions/invalid-transaction-id/verify`,
          verificationData,
          {
            headers: {
              'Content-Type': 'application/json',
              'admin': ADMIN_CREDENTIALS.admin,
              'adminpwd': ADMIN_CREDENTIALS.adminpwd
            }
          }
        );
      } catch (error) {
        console.log(`✅ Verify endpoint invalid ID test: ${error.response?.status} - ${error.response?.data?.message}`);
      }

      // Test verify endpoint without admin credentials
      try {
        await axios.post(
          `${BASE_URL}/transactions/${transactionId}/verify`,
          verificationData
        );
      } catch (error) {
        console.log(`✅ Verify endpoint missing credentials test: ${error.response?.status} - ${error.response?.data?.message}`);
      }

      // Test verify endpoint with invalid admin credentials
      try {
        await axios.post(
          `${BASE_URL}/transactions/${transactionId}/verify`,
          verificationData,
          {
            headers: {
              'Content-Type': 'application/json',
              'admin': 'invalid',
              'adminpwd': 'invalid'
            }
          }
        );
      } catch (error) {
        console.log(`✅ Verify endpoint invalid credentials test: ${error.response?.status} - ${error.response?.data?.message}`);
      }

    }, 35000); // Wait 35 seconds before testing error cases

    console.log('\n📋 Verification System Summary:');
    console.log('🚀 Phase 1: Immediate verification (0-15 min, every 3 seconds)');
    console.log('🔄 Phase 2: Background verification (15 min - 24 hours, every 1 hour)');
    console.log('⏰ Phase 3: Expiration handling (after 24 hours)');
    console.log('📧 Email notifications on confirmation and expiration');
    console.log('📤 Webhook notifications to merchant success URLs');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Function to test background verification monitoring
async function testBackgroundVerificationMonitoring() {
  console.log('👀 Testing Background Verification Monitoring...\n');

  try {
    // Get all pending transactions that should be in background verification
    const response = await axios.get(`${BASE_URL}/transactions?state=PENDING`);
    const pendingTransactions = response.data.data.transactions;

    console.log(`📊 Found ${pendingTransactions.length} PENDING transactions`);

    if (pendingTransactions.length === 0) {
      console.log('✅ No pending transactions to monitor');
      return;
    }

    console.log('\n📋 Pending Transactions Analysis:');
    pendingTransactions.forEach((tx, index) => {
      const now = new Date();
      const created = new Date(tx.createdAt);
      const verificationStarted = tx.verificationStartedAt ? new Date(tx.verificationStartedAt) : null;
      const expires = tx.expiresAt ? new Date(tx.expiresAt) : null;
      const lastCheck = tx.lastVerificationCheck ? new Date(tx.lastVerificationCheck) : null;

      const ageMinutes = Math.floor((now - created) / (1000 * 60));
      const verificationAgeMinutes = verificationStarted ? Math.floor((now - verificationStarted) / (1000 * 60)) : null;
      const hoursUntilExpiry = expires ? Math.floor((expires - now) / (1000 * 60 * 60)) : null;

      console.log(`\n${index + 1}. Transaction ${tx.id}`);
      console.log(`   Reference: ${tx.reference}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Age: ${ageMinutes} minutes`);
      console.log(`   Verification Started: ${verificationStarted ? `${verificationAgeMinutes} minutes ago` : 'Not started'}`);
      console.log(`   Last Check: ${lastCheck ? lastCheck.toLocaleString() : 'Never'}`);
      console.log(`   Expires: ${expires ? `in ${hoursUntilExpiry} hours` : 'Not set'}`);
      console.log(`   Email: ${tx.payerInfo?.email || 'Not provided'}`);
      console.log(`   Toronet Ref: ${tx.toronetReference || 'Not set'}`);
      
      // Determine verification phase
      if (!verificationStarted) {
        console.log(`   Phase: ⏳ Not started`);
      } else if (verificationAgeMinutes < 15) {
        console.log(`   Phase: 🚀 Immediate verification (${15 - verificationAgeMinutes} min remaining)`);
      } else {
        console.log(`   Phase: 🔄 Background verification (hourly checks)`);
      }
    });

    console.log('\n🔍 Verification Process:');
    console.log('- Immediate: Every 3 seconds for 15 minutes after verification starts');
    console.log('- Background: Every 1 hour for transactions past 15-minute mark');
    console.log('- Expiration: After 24 hours, transaction marked as failed');

  } catch (error) {
    console.error('❌ Failed to monitor background verification:', error.response?.data || error.message);
  }
}

// Function to test verification service status
async function testVerificationServiceStatus() {
  console.log('🔧 Testing Verification Service Status...\n');

  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ API Health: ${healthResponse.data.message}`);

    // Get transaction counts by state
    const states = ['PENDING', 'INITIALIZED', 'PAID', 'COMPLETED', 'PAYOUT_FAILED'];
    
    console.log('\n📊 Transaction Counts by State:');
    for (const state of states) {
      try {
        const response = await axios.get(`${BASE_URL}/transactions?state=${state}`);
        console.log(`${state}: ${response.data.data.total} transactions`);
      } catch (error) {
        console.log(`${state}: Error - ${error.message}`);
      }
    }

    console.log('\n🔄 Service Configuration:');
    console.log(`- Immediate verification: 3-second intervals for 15 minutes`);
    console.log(`- Background verification: 1-hour intervals`);
    console.log(`- Transaction expiration: 24 hours`);
    console.log(`- Email service: ${process.env.SMTP_HOST ? 'Configured' : 'Not configured'}`);
    console.log(`- Toronet admin: ${ADMIN_CREDENTIALS.admin ? 'Set' : 'Not set'}`);

  } catch (error) {
    console.error('❌ Service status check failed:', error.response?.data || error.message);
  }
}

// Run tests based on command line argument
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'monitor':
      testBackgroundVerificationMonitoring();
      break;
    case 'status':
      testVerificationServiceStatus();
      break;
    default:
      testImmediateVerification();
      break;
  }
}

module.exports = {
  testImmediateVerification,
  testBackgroundVerificationMonitoring,
  testVerificationServiceStatus
};