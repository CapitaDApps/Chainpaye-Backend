const axios = require('axios');

async function testCurrencyComprehensive() {
  try {
    console.log('🔄 Comprehensive currency and payment type testing...\n');
    
    const testCases = [
      // Valid combinations
      { currency: 'NGN', paymentType: 'bank', shouldSucceed: true, description: 'NGN with bank transfer' },
      { currency: 'USD', paymentType: 'card', shouldSucceed: true, description: 'USD with card payment' },
      { currency: 'USD', paymentType: 'bank', shouldSucceed: true, description: 'USD with bank transfer' },
      { currency: 'GBP', paymentType: 'card', shouldSucceed: true, description: 'GBP with card payment' },
      { currency: 'GBP', paymentType: 'bank', shouldSucceed: true, description: 'GBP with bank transfer' },
      { currency: 'EUR', paymentType: 'card', shouldSucceed: true, description: 'EUR with card payment' },
      { currency: 'EUR', paymentType: 'bank', shouldSucceed: true, description: 'EUR with bank transfer' },
      
      // Invalid combinations
      { currency: 'NGN', paymentType: 'card', shouldSucceed: false, description: 'NGN with card payment (should fail)' },
      { currency: 'JPY', paymentType: 'card', shouldSucceed: false, description: 'Unsupported currency JPY (should fail)' },
    ];
    
    const results = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`${i + 1}. Testing: ${testCase.description}`);
      
      try {
        const response = await axios.post('http://localhost:4000/api/v1/payment-links', {
          merchantId: `test-merchant-${i}`,
          userId: `test-user-${i}`,
          name: `Test Business ${i}`,
          amount: '50.00',
          currency: testCase.currency,
          token: testCase.currency === 'NGN' ? 'NGN' : 'USDT',
          selectedCurrency: testCase.currency,
          paymentType: testCase.paymentType,
          description: `Test ${testCase.description}`
        });
        
        if (testCase.shouldSucceed) {
          console.log(`   ✅ SUCCESS: Payment link created (ID: ${response.data.data.id})`);
          results.push({ ...testCase, result: 'PASS', id: response.data.data.id });
        } else {
          console.log(`   ❌ FAIL: Expected failure but succeeded (ID: ${response.data.data.id})`);
          results.push({ ...testCase, result: 'FAIL', error: 'Expected failure but succeeded' });
        }
        
      } catch (error) {
        if (!testCase.shouldSucceed) {
          console.log(`   ✅ SUCCESS: Correctly rejected (${error.response?.data?.message || error.message})`);
          results.push({ ...testCase, result: 'PASS', error: error.response?.data?.message || error.message });
        } else {
          console.log(`   ❌ FAIL: Expected success but failed (${error.response?.data?.message || error.message})`);
          results.push({ ...testCase, result: 'FAIL', error: error.response?.data?.message || error.message });
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Test payment link access for successful creations
    console.log('🔄 Testing payment link access for created links...\n');
    
    const successfulLinks = results.filter(r => r.result === 'PASS' && r.id);
    
    for (const link of successfulLinks.slice(0, 2)) { // Test first 2 successful links
      console.log(`Testing access for ${link.currency} payment link (${link.id})...`);
      
      try {
        const accessResponse = await axios.post(`http://localhost:4000/api/v1/payment-links/${link.id}/access`, {
          payerInfo: {
            payername: 'Test User',
            payeraddress: '123 Test Street',
            payercity: 'Test City',
            payerstate: 'Test State',
            payercountry: 'US',
            payerphone: '1234567890'
          }
        });
        
        console.log(`   ✅ Access successful (Transaction: ${accessResponse.data.data.transactionId})`);
        
      } catch (error) {
        console.log(`   ⚠️  Access failed (expected if Toronet API unavailable): ${error.response?.data?.message || error.message}`);
      }
      
      console.log('');
    }
    
    // Summary
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(60));
    
    const passCount = results.filter(r => r.result === 'PASS').length;
    const failCount = results.filter(r => r.result === 'FAIL').length;
    
    results.forEach((result, index) => {
      const status = result.result === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${result.description}`);
      if (result.error && result.result === 'PASS' && !result.shouldSucceed) {
        console.log(`      Rejection reason: ${result.error}`);
      } else if (result.error && result.result === 'FAIL') {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 Overall Results: ${passCount}/${results.length} tests passed`);
    
    if (failCount === 0) {
      console.log('🎉 All tests passed! Currency support is working correctly.');
      console.log('\n✨ Summary of supported currencies:');
      console.log('   • NGN: Bank transfers only');
      console.log('   • USD: Card payments and bank transfers');
      console.log('   • GBP: Card payments and bank transfers');
      console.log('   • EUR: Card payments and bank transfers');
    } else {
      console.log(`⚠️  ${failCount} test(s) failed. Please review the results above.`);
    }
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
  }
}

testCurrencyComprehensive();