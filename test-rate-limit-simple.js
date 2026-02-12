const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function testRateLimitHeaders() {
  console.log('Testing Rate Limit Headers...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/payment-links`);
    
    console.log('✓ Request successful');
    console.log('\nRate Limit Headers:');
    console.log(`  RateLimit-Limit: ${response.headers['ratelimit-limit']}`);
    console.log(`  RateLimit-Remaining: ${response.headers['ratelimit-remaining']}`);
    console.log(`  RateLimit-Reset: ${response.headers['ratelimit-reset']}`);
    
    if (response.headers['ratelimit-limit']) {
      console.log('\n✓ Rate limiting is working!');
      return true;
    } else {
      console.log('\n✗ Rate limit headers not found');
      return false;
    }
  } catch (error) {
    if (error.response) {
      console.log(`✗ Request failed with status ${error.response.status}`);
      console.log(`  Error: ${error.response.data?.message || error.message}`);
    } else {
      console.log(`✗ Request failed: ${error.message}`);
      console.log('  Make sure the server is running at', BASE_URL);
    }
    return false;
  }
}

async function testBurstProtection() {
  console.log('\n\nTesting Burst Protection (20 req/min)...\n');
  
  let successCount = 0;
  let rateLimitCount = 0;
  
  for (let i = 0; i < 25; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/payment-links`, {
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        successCount++;
        if (i < 5 || i >= 20) {
          console.log(`Request ${i + 1}: ✓ Success (${response.headers['ratelimit-remaining']} remaining)`);
        } else if (i === 5) {
          console.log('  ... (requests 6-20) ...');
        }
      } else if (response.status === 429) {
        rateLimitCount++;
        console.log(`Request ${i + 1}: ✗ Rate Limited`);
      }
    } catch (error) {
      console.log(`Request ${i + 1}: ✗ Error`);
    }
  }
  
  console.log(`\nResults:`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Rate Limited: ${rateLimitCount}`);
  console.log(`  Expected: ~20 successful, ~5 rate limited`);
  
  if (rateLimitCount > 0) {
    console.log('\n✓ Burst protection is working!');
    return true;
  } else {
    console.log('\n✗ Burst protection may not be working');
    return false;
  }
}

async function test429Response() {
  console.log('\n\nTesting 429 Response Format...\n');
  
  // Make enough requests to trigger rate limit
  for (let i = 0; i < 25; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/payment-links`, {
        validateStatus: () => true
      });
      
      if (response.status === 429) {
        console.log('✓ Received 429 response\n');
        console.log('Response body:');
        console.log(JSON.stringify(response.data, null, 2));
        
        const data = response.data;
        const hasRequiredFields = 
          data.success === false &&
          data.error &&
          data.message &&
          data.retryAfter &&
          data.timestamp;
        
        if (hasRequiredFields) {
          console.log('\n✓ Response format is correct!');
          return true;
        } else {
          console.log('\n✗ Response format is incorrect');
          return false;
        }
      }
    } catch (error) {
      // Continue trying
    }
  }
  
  console.log('✗ Could not trigger 429 response');
  return false;
}

async function runTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   ChainPaye Rate Limiting Quick Test      ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  const results = {
    headers: false,
    burst: false,
    response429: false
  };
  
  results.headers = await testRateLimitHeaders();
  
  if (results.headers) {
    results.burst = await testBurstProtection();
    
    // Wait a bit before testing 429 response
    console.log('\nWaiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    results.response429 = await test429Response();
  }
  
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║              Test Summary                  ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log(`Rate Limit Headers: ${results.headers ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Burst Protection: ${results.burst ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`429 Response Format: ${results.response429 ? '✓ PASS' : '✗ FAIL'}`);
  
  const allPassed = results.headers && results.burst && results.response429;
  
  if (allPassed) {
    console.log('\n✓ All tests passed! Rate limiting is working correctly.');
  } else {
    console.log('\n✗ Some tests failed. Please review the results above.');
  }
}

runTests().catch(error => {
  console.error('\n✗ Test suite failed:', error.message);
  process.exit(1);
});
