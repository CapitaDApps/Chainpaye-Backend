const mongoose = require('mongoose');
require('dotenv').config();

// Import the actual models and services
const PaymentLink = require('./dist/models/PaymentLink').default;
const { PaymentLinkRepository } = require('./dist/repositories/PaymentLinkRepository');
const { PaymentLinkManager } = require('./dist/services/PaymentLinkManager');

async function debugPaymentLink() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');
    
    const testId = '697ecadd88e5e54e39285e80';
    console.log(`\nTesting payment link ID: ${testId}`);
    
    // Test 1: Direct model query
    console.log('\n1. Direct model query:');
    const directResult = await PaymentLink.findById(testId);
    console.log('Direct result:', directResult ? {
      id: directResult._id.toString(),
      merchantId: directResult.merchantId,
      amount: directResult.amount,
      currency: directResult.currency,
      isActive: directResult.isActive
    } : 'Not found');
    
    // Test 2: Repository query
    console.log('\n2. Repository query:');
    const repository = new PaymentLinkRepository();
    const repoResult = await repository.findById(testId);
    console.log('Repository result:', repoResult ? {
      id: repoResult._id.toString(),
      merchantId: repoResult.merchantId,
      amount: repoResult.amount,
      currency: repoResult.currency,
      isActive: repoResult.isActive
    } : 'Not found');
    
    // Test 3: Service query
    console.log('\n3. Service query:');
    const manager = new PaymentLinkManager();
    const serviceResult = await manager.getPaymentLink(testId);
    console.log('Service result:', serviceResult);
    
    // Test 4: Check if ID is valid ObjectId
    console.log('\n4. ID validation:');
    console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(testId));
    console.log('ID length:', testId.length);
    console.log('ID format:', /^[0-9a-fA-F]{24}$/.test(testId));
    
    await mongoose.connection.close();
    console.log('\n✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugPaymentLink();