const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test burst protection (20 requests per minute)
async function testBurstProtection() {
  log('\n=== Testing Burst Protection (20 req/min) ===', 'cyan');
  
  let successCount = 0;
  let rateLimitCount = 0;
  const startTime = Date.now();
  
  // Try to make 25 rapid requests
  for (let i = 0; i < 25; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/payment-links`, {
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        successCount++;
        log(`Request ${i + 1}: ✓ Success (${response.headers['ratelimit-remaining']} remaining)`, 'green');
      } else if (response.status === 429) {
        rateLimitCount++;
        log(`Request ${i + 1}: ✗ Rate Limited`, 'red');
      }
    } catch (error) {
      log(`Request ${i + 1}: ✗ Error - ${error.message}`, 'red');
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log(`\nResults:`, 'yellow');
  log(`  Successful: ${successCount}`, 'green');
  log(`  Rate Limited: ${rateLimitCount}`, 'red');
  log(`  Duration: ${duration}s`, 'blue');
  log(`  Expected: ~20 successful, ~5 rate limited`, 'yellow');
  
  return { successCount, rateLimitCount, duration };
}

// Test payment link creation rate limit (20 per 10 minutes)
async function testPaymentLinkCreation() {
  log('\n=== Testing Payment Link Creation (20 req/10min) ===', 'cyan');
  
  let successCount = 0;
  let rateLimitCount = 0;
  let errorCount = 0;
  
  // Try to create 25 payment links
  for (let i = 0; i < 25; i++) {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/payment-links`,
        {
          userId: `test-user-${i}`,
          address: '0x1234567890123456789012345678901234567890',
          token: 'USDC',
          amount: '100.00',
          selectedCurrency: 'USD',
          paymentType: 'card',
          successUrl: 'https://example.com/success'
        },
        { validateStatus: () => true }
      );
      
      if (response.status === 201) {
        successCount++;
        log(`Request ${i + 1}: ✓ Created (${response.headers['ratelimit-remaining']} remaining)`, 'green');
      } else if (response.status === 429) {
        rateLimitCount++;
        log(`Request ${i + 1}: ✗ Rate Limited`, 'red');
      } else {
        errorCount++;
        log(`Request ${i + 1}: ✗ Error ${response.status}`, 'red');
      }
    } catch (error) {
      errorCount++;
      log(`Request ${i + 1}: ✗ Error - ${error.message}`, 'red');
    }
    
    // Small delay to avoid burst protection
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  log(`\nResults:`, 'yellow');
  log(`  Successful: ${successCount}`, 'green');
  log(`  Rate Limited: ${rateLimitCount}`, 'red');
  log(`  Errors: ${errorCount}`, 'red');
  log(`  Expected: ~20 successful, ~5 rate limited`, 'yellow');
  
  return { successCount, rateLimitCount, errorCount };
}

// Test read operations rate limit (200 per 15 minutes)
async function testReadOperations() {
  log('\n=== Testing Read Operations (200 req/15min) ===', 'cyan');
  
  let successCount = 0;
  let rateLimitCount = 0;
  const testCount = 30; // Test with 30 requests
  
  for (let i = 0; i < testCount; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/payment-links`, {
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        successCount++;
        if (i % 10 === 0) {
          log(`Request ${i + 1}: ✓ Success (${response.headers['ratelimit-remaining']} remaining)`, 'green');
        }
      } else if (response.status === 429) {
        rateLimitCount++;
        log(`Request ${i + 1}: ✗ Rate Limited`, 'red');
      }
    } catch (error) {
      log(`Request ${i + 1}: ✗ Error - ${error.message}`, 'red');
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  log(`\nResults:`, 'yellow');
  log(`  Successful: ${successCount}`, 'green');
  log(`  Rate Limited: ${rateLimitCount}`, 'red');
  log(`  Expected: All ${testCount} should succeed (limit is 200)`, 'yellow');
  
  return { successCount, rateLimitCount };
}

// Test rate limit headers
async function testRateLimitHeaders() {
  log('\n=== Testing Rate Limit Headers ===', 'cyan');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/payment-links`);
    
    const headers = {
      limit: response.headers['ratelimit-limit'],
      remaining: response.headers['ratelimit-remaining'],
      reset: response.headers['ratelimit-reset']
    };
    
    log(`Rate Limit Headers:`, 'yellow');
    log(`  Limit: ${headers.limit}`, 'blue');
    log(`  Remaining: ${headers.remaining}`, 'blue');
    log(`  Reset: ${headers.reset ? new Date(headers.reset * 1000).toISOString() : 'N/A'}`, 'blue');
    
    if (headers.limit && headers.remaining) {
      log(`✓ Rate limit headers present`, 'green');
      return true;
    } else {
      log(`✗ Rate limit headers missing`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error testing headers: ${error.message}`, 'red');
    return false;
  }
}

// Test 429 response format
async function test429Response() {
  log('\n=== Testing 429 Response Format ===', 'cyan');
  
  // Make enough requests to trigger rate limit
  for (let i = 0; i < 25; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/payment-links`, {
        validateStatus: () => true
      });
      
      if (response.status === 429) {
        log(`✓ Received 429 response`, 'green');
        log(`Response body:`, 'yellow');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Validate response structure
        const data = response.data;
        const hasRequiredFields = 
          data.success === false &&
          data.error &&
          data.message &&
          data.retryAfter &&
          data.timestamp;
        
        if (hasRequiredFields) {
          log(`✓ Response format is correct`, 'green');
          return true;
        } else {
          log(`✗ Response format is incorrect`, 'red');
          return false;
        }
      }
    } catch (error) {
      // Continue trying
    }
  }
  
  log(`✗ Could not trigger 429 response`, 'yellow');
  return false;
}

// Main test runner
async function runTests() {
  log('╔════════════════════════════════════════════╗', 'cyan');
  log('║   ChainPaye API Rate Limiting Tests       ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  try {
    // Check if server is running
    log('\nChecking server health...', 'yellow');
    await axios.get(`${BASE_URL}/api/v1/payment-links`);
    log('✓ Server is running', 'green');
  } catch (error) {
    log('✗ Server is not running or not accessible', 'red');
    log(`  URL: ${BASE_URL}`, 'yellow');
    log(`  Error: ${error.message}`, 'red');
    process.exit(1);
  }
  
  const results = {
    headersTest: false,
    burstProtection: null,
    paymentLinkCreation: null,
    readOperations: null,
    response429: false
  };
  
  // Run tests
  results.headersTest = await testRateLimitHeaders();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  results.burstProtection = await testBurstProtection();
  
  // Wait for rate limits to reset
  log('\nWaiting 65 seconds for rate limits to reset...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 65000));
  
  results.paymentLinkCreation = await testPaymentLinkCreation();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  results.readOperations = await testReadOperations();
  
  // Wait for rate limits to reset
  log('\nWaiting 65 seconds for rate limits to reset...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 65000));
  
  results.response429 = await test429Response();
  
  // Summary
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║              Test Summary                  ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  log(`\nRate Limit Headers: ${results.headersTest ? '✓ PASS' : '✗ FAIL'}`, 
    results.headersTest ? 'green' : 'red');
  
  if (results.burstProtection) {
    const burstPass = results.burstProtection.rateLimitCount > 0;
    log(`Burst Protection: ${burstPass ? '✓ PASS' : '✗ FAIL'}`, 
      burstPass ? 'green' : 'red');
  }
  
  if (results.paymentLinkCreation) {
    const createPass = results.paymentLinkCreation.rateLimitCount > 0;
    log(`Payment Link Creation Limit: ${createPass ? '✓ PASS' : '✗ FAIL'}`, 
      createPass ? 'green' : 'red');
  }
  
  if (results.readOperations) {
    const readPass = results.readOperations.successCount >= 25;
    log(`Read Operations Limit: ${readPass ? '✓ PASS' : '✗ FAIL'}`, 
      readPass ? 'green' : 'red');
  }
  
  log(`429 Response Format: ${results.response429 ? '✓ PASS' : '✗ FAIL'}`, 
    results.response429 ? 'green' : 'red');
  
  log('\n✓ Rate limiting tests completed', 'green');
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
