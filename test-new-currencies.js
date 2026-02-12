const axios = require('axios');

async function testNewCurrencies() {
  try {
    console.log('🔄 Testing new currencies (GBP and EUR)...\n');
    
    const currencies = [
      { code: 'GBP', name: 'British Pound', paymentType: 'card' },
      { code: 'EUR', name: 'Euro', paymentType: 'card' },
      { code: 'USD', name: 'US Dollar', paymentType: 'card' },
      { code: 'NGN', name: 'Nigerian Naira', paymentType: 'bank' }
    ];
    
    const results = [];
    
    for (const currency of currencies) {
      console.log(`Testing ${currency.name} (${currency.code})...`);
      
      try {
        const response = await axios.post('http://localhost:4000/api/v1/payment-links', {
          merchantId: `test-merchant-${currency.code.toLowerCase()}`,
          userId: `test-user-${currency.code.toLowerCase()}`,
          name: `Test ${currency.name} Payment`,
          amount: '100.00',
          currency: currency.code,
          token: currency.code === 'NGN' ? 'NGN' : 'USDT',
          selectedCurrency: currency.code,
          paymentType: currency.paymentType,
          description: `Test payment in ${currency.name}`
        });
        
        const paymentLink = response.data.data;
        console.log(`✅ ${currency.code} payment link created successfully`);
        console.log(`   ID: ${paymentLink.id}`);
        console.log(`   Amount: ${paymentLink.amount} ${paymentLink.currency}`);
        console.log(`   Payment Type: ${paymentLink.paymentType}`);
        console.log(`   Link URL: ${paymentLink.linkUrl}`);
        
        results.push({
          currency: currency.code,
          success: true,
          id: paymentLink.id,
          amount: paymentLink.amount,
          paymentType: paymentLink.paymentType
        });
        
      } catch (error) {
        console.log(`❌ ${currency.code} payment link creation failed`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Error: ${error.response.data.message || error.response.data.error}`);
        } else {
          console.log(`   Error: ${error.message}`);
        }
        
        results.push({
          currency: currency.code,
          success: false,
          error: error.response?.data?.message || error.message
        });
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Test invalid currency
    console.log('Testing invalid currency (JPY)...');
    try {
      await axios.post('http://localhost:4000/api/v1/payment-links', {
        merchantId: 'test-merchant-invalid',
        userId: 'test-user-invalid',
        name: 'Test Invalid Currency',
        amount: '100.00',
        currency: 'JPY', // Invalid currency
        token: 'USDT',
        selectedCurrency: 'JPY',
        paymentType: 'card',
        description: 'Test invalid currency'
      });
      
      console.log('❌ Invalid currency test failed - should have been rejected');
      
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Invalid currency correctly rejected');
        console.log(`   Error: ${error.response.data.message || error.response.data.error}`);
      } else {
        console.log('❌ Unexpected error for invalid currency test');
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.currency}: Payment link created (${result.paymentType} payment)`);
      } else {
        console.log(`❌ ${result.currency}: Failed - ${result.error}`);
      }
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎯 Results: ${successCount}/${results.length} currencies working correctly`);
    
    if (successCount === results.length) {
      console.log('🎉 All supported currencies are working correctly!');
      console.log('\n💡 Supported currencies:');
      console.log('   • NGN (Nigerian Naira) - Bank transfer only');
      console.log('   • USD (US Dollar) - Card payments supported');
      console.log('   • GBP (British Pound) - Card payments supported');
      console.log('   • EUR (Euro) - Card payments supported');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewCurrencies();