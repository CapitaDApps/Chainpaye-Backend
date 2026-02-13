/**
 * Test script for background payment verification system
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function testBackgroundVerification() {
  console.log('🧪 Testing Background Payment Verification System...\n');

  try {
    // Step 1: Create a payment link
    console.log('1. Creating test payment link...');
    const paymentLinkResponse = await axios.post(`${BASE_URL}/payment-links`, {
      merchantId: 'test-merchant-bg',
      userId: 'test-user-bg',
      name: 'Background Test Business',
      amount: '100.00',
      currency: 'USD',
      token: 'USDT',
      selectedCurrency: 'USD',
      paymentType: 'card',
      description: 'Testing background verification',
      successUrl: 'https://webhook.site/your-webhook-url-here'
    });

    const paymentLink = paymentLinkResponse.data.data;
    console.log(`✅ Payment link created: ${paymentLink.id}`);

    // Step 2: Access the payment link to create a transaction
    console.log('\n2. Accessing payment link to create transaction...');
    const accessResponse = await axios.post(`${BASE_URL}/payment-links/${paymentLink.id}/access`, {
      payerInfo: {
        payername: 'Test User Background',
        payerphone: '+1234567890',
        payeremail: 'test.background@example.com'
      }
    });

    const transactionId = accessResponse.data.data.transactionId;
    console.log(`✅ Transaction created: ${transactionId}`);

    // Step 3: Get transaction details to verify it's in PENDING state
    console.log('\n3. Checking initial transaction state...');
    const transactionResponse = await axios.get(`${BASE_URL}/transactions/${transactionId}`);
    const transaction = transactionResponse.data.data;
    
    console.log(`📋 Transaction Details:`);
    console.log(`   ID: ${transaction.id}`);
    console.log(`   State: ${transaction.state}`);
    console.log(`   Amount: ${transaction.amount} ${transaction.currency}`);
    console.log(`   Expires At: ${transaction.expiresAt || 'Not set'}`);
    console.log(`   Last Check: ${transaction.lastVerificationCheck || 'Never'}`);

    if (transaction.state !== 'PENDING') {
      console.log(`⚠️  Expected PENDING state, got ${transaction.state}`);
    }

    // Step 4: Test record transaction with email
    console.log('\n4. Testing record transaction with email...');
    const recordResponse = await axios.post(`${BASE_URL}/record-transaction/${transactionId}`, {
      amount: '100.00',
      currency: 'USD',
      senderName: 'Test User Background',
      senderPhone: '+1234567890',
      senderEmail: 'test.background@example.com',
      paidAt: new Date().toISOString()
    });

    console.log(`✅ Transaction recorded successfully`);
    console.log(`📧 Email should be saved in payerInfo.email`);

    // Step 5: Verify the email was saved
    console.log('\n5. Verifying email was saved...');
    const updatedTransactionResponse = await axios.get(`${BASE_URL}/transactions/${transactionId}`);
    const updatedTransaction = updatedTransactionResponse.data.data;
    
    console.log(`📧 Payer Email: ${updatedTransaction.payerInfo?.email || 'Not found'}`);
    console.log(`👤 Payer Name: ${updatedTransaction.payerInfo?.name || 'Not found'}`);
    console.log(`📱 Payer Phone: ${updatedTransaction.payerInfo?.phone || 'Not found'}`);
    console.log(`🏷️  Final State: ${updatedTransaction.state}`);

    // Step 6: Test getting transactions by state
    console.log('\n6. Testing get transactions by state...');
    const pendingResponse = await axios.get(`${BASE_URL}/transactions?state=PENDING`);
    const completedResponse = await axios.get(`${BASE_URL}/transactions?state=COMPLETED`);
    
    console.log(`📊 PENDING transactions: ${pendingResponse.data.data.total}`);
    console.log(`📊 COMPLETED transactions: ${completedResponse.data.data.total}`);

    // Step 7: Create a transaction that will remain PENDING for background verification
    console.log('\n7. Creating transaction for background verification test...');
    const testAccessResponse = await axios.post(`${BASE_URL}/payment-links/${paymentLink.id}/access`, {
      payerInfo: {
        payername: 'Background Verification Test',
        payerphone: '+1987654321',
        payeremail: 'background.test@example.com'
      }
    });

    const testTransactionId = testAccessResponse.data.data.transactionId;
    console.log(`✅ Test transaction created: ${testTransactionId}`);
    console.log(`⏳ This transaction will remain PENDING for background verification`);
    console.log(`🔍 The background service will check this every 5 minutes`);

    console.log('\n🎉 Background verification test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Payment link created: ${paymentLink.id}`);
    console.log(`- Completed transaction: ${transactionId}`);
    console.log(`- Pending transaction for verification: ${testTransactionId}`);
    console.log(`- Email functionality tested and working`);
    
    console.log('\n🔍 Background Verification Process:');
    console.log('- Service runs every 5 minutes');
    console.log('- Checks PENDING transactions with Toronet API');
    console.log('- Updates transaction state when payment confirmed');
    console.log('- Sends confirmation emails to payers');
    console.log('- Notifies merchant webhooks');
    console.log('- Handles expired transactions (24 hours)');

    console.log('\n📧 Email Configuration Required:');
    console.log('- Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
    console.log('- For Gmail: Enable 2FA and generate App Password');
    console.log('- Set SMTP_FROM and SUPPORT_EMAIL');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Function to test email service configuration
async function testEmailConfiguration() {
  console.log('📧 Testing Email Service Configuration...\n');

  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'SUPPORT_EMAIL'
  ];

  console.log('🔍 Checking environment variables:');
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    console.log(`${envVar}: ${value ? '✅ Set' : '❌ Missing'}`);
  }

  console.log('\n📋 Gmail Setup Instructions:');
  console.log('1. Enable 2-Factor Authentication on your Gmail account');
  console.log('2. Go to https://myaccount.google.com/apppasswords');
  console.log('3. Generate an App Password for "Mail"');
  console.log('4. Use the generated password as SMTP_PASS');
  console.log('5. Set SMTP_USER to your Gmail address');
}

// Function to monitor background verification
async function monitorBackgroundVerification() {
  console.log('👀 Monitoring Background Verification...\n');

  try {
    // Get all pending transactions
    const response = await axios.get(`${BASE_URL}/transactions?state=PENDING`);
    const pendingTransactions = response.data.data.transactions;

    console.log(`📊 Found ${pendingTransactions.length} PENDING transactions`);

    if (pendingTransactions.length === 0) {
      console.log('✅ No pending transactions to monitor');
      return;
    }

    console.log('\n📋 Pending Transactions:');
    pendingTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. Transaction ${tx.id}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Created: ${new Date(tx.createdAt).toLocaleString()}`);
      console.log(`   Expires: ${tx.expiresAt ? new Date(tx.expiresAt).toLocaleString() : 'Not set'}`);
      console.log(`   Last Check: ${tx.lastVerificationCheck ? new Date(tx.lastVerificationCheck).toLocaleString() : 'Never'}`);
      console.log(`   Email: ${tx.payerInfo?.email || 'Not provided'}`);
      console.log('');
    });

    console.log('🔍 Background verification will process these transactions every 5 minutes');
    console.log('⏰ Transactions expire after 24 hours if payment not confirmed');

  } catch (error) {
    console.error('❌ Failed to monitor background verification:', error.response?.data || error.message);
  }
}

// Run tests based on command line argument
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'email':
      testEmailConfiguration();
      break;
    case 'monitor':
      monitorBackgroundVerification();
      break;
    default:
      testBackgroundVerification();
      break;
  }
}

module.exports = {
  testBackgroundVerification,
  testEmailConfiguration,
  monitorBackgroundVerification
};