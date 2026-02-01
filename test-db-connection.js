const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set (hidden)' : 'Not set');
    
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB connected successfully');
    console.log('📍 Database:', mongoose.connection.name);
    
    // Test basic operations
    console.log('\nTesting basic operations...');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections:', collections.map(c => c.name));
    
    // Test a simple query
    const PaymentLink = mongoose.model('PaymentLink', new mongoose.Schema({}, { strict: false }));
    const count = await PaymentLink.countDocuments();
    console.log('📊 Payment links count:', count);
    
    // Try to find the specific payment link
    const specificLink = await PaymentLink.findById('697ecadd88e5e54e39285e80');
    console.log('🔍 Specific payment link found:', !!specificLink);
    
    if (specificLink) {
      console.log('Payment link details:', {
        id: specificLink._id,
        merchantId: specificLink.merchantId,
        amount: specificLink.amount,
        currency: specificLink.currency,
        isActive: specificLink.isActive
      });
    }
    
    await mongoose.connection.close();
    console.log('✅ Connection test completed successfully');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  }
}

testConnection();