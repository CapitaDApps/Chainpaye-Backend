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

async function testCorsHeaders() {
  log('\n=== Testing CORS Headers ===', 'cyan');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/payment-links`, {
      headers: {
        'Origin': 'https://chainpaye.com'
      }
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials'],
      'Access-Control-Expose-Headers': response.headers['access-control-expose-headers']
    };
    
    log('\nCORS Headers:', 'yellow');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        log(`  ${key}: ${value}`, 'blue');
      }
    });
    
    // Verify required headers
    const hasOrigin = !!corsHeaders['Access-Control-Allow-Origin'];
    const hasCredentials = corsHeaders['Access-Control-Allow-Credentials'] === 'true';
    const hasExposedHeaders = !!corsHeaders['Access-Control-Expose-Headers'];
    
    if (hasOrigin && hasCredentials && hasExposedHeaders) {
      log('\n✓ CORS is properly configured', 'green');
      return true;
    } else {
      log('\n✗ CORS configuration incomplete', 'red');
      if (!hasOrigin) log('  Missing: Access-Control-Allow-Origin', 'red');
      if (!hasCredentials) log('  Missing: Access-Control-Allow-Credentials', 'red');
      if (!hasExposedHeaders) log('  Missing: Access-Control-Expose-Headers', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error testing CORS: ${error.message}`, 'red');
    return false;
  }
}

async function testPreflightRequest() {
  log('\n=== Testing Preflight (OPTIONS) Request ===', 'cyan');
  
  try {
    const response = await axios.options(`${BASE_URL}/api/v1/payment-links`, {
      headers: {
        'Origin': 'https://chainpaye.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-Correlation-Id'
      },
      validateStatus: () => true
    });
    
    log(`\nStatus: ${response.status}`, response.status === 204 ? 'green' : 'yellow');
    
    const allowedMethods = response.headers['access-control-allow-methods'];
    const allowedHeaders = response.headers['access-control-allow-headers'];
    
    log('\nPreflight Response:', 'yellow');
    log(`  Allowed Methods: ${allowedMethods}`, 'blue');
    log(`  Allowed Headers: ${allowedHeaders}`, 'blue');
    
    const hasPost = allowedMethods?.includes('POST');
    const hasContentType = allowedHeaders?.toLowerCase().includes('content-type');
    const hasCorrelationId = allowedHeaders?.toLowerCase().includes('x-correlation-id');
    
    if (hasPost && hasContentType && hasCorrelationId) {
      log('\n✓ Preflight request successful', 'green');
      return true;
    } else {
      log('\n✗ Preflight request incomplete', 'red');
      if (!hasPost) log('  Missing: POST method', 'red');
      if (!hasContentType) log('  Missing: Content-Type header', 'red');
      if (!hasCorrelationId) log('  Missing: X-Correlation-Id header', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error testing preflight: ${error.message}`, 'red');
    return false;
  }
}

async function testRateLimitHeaders() {
  log('\n=== Testing Rate Limit Headers Exposure ===', 'cyan');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/payment-links`, {
      headers: {
        'Origin': 'https://chainpaye.com'
      }
    });
    
    const rateLimitHeaders = {
      'RateLimit-Limit': response.headers['ratelimit-limit'],
      'RateLimit-Remaining': response.headers['ratelimit-remaining'],
      'RateLimit-Reset': response.headers['ratelimit-reset']
    };
    
    log('\nRate Limit Headers:', 'yellow');
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      if (value) {
        log(`  ${key}: ${value}`, 'blue');
      }
    });
    
    const exposedHeaders = response.headers['access-control-expose-headers'];
    log(`\nExposed Headers: ${exposedHeaders}`, 'blue');
    
    const hasRateLimitHeaders = 
      rateLimitHeaders['RateLimit-Limit'] &&
      rateLimitHeaders['RateLimit-Remaining'] &&
      rateLimitHeaders['RateLimit-Reset'];
    
    const areExposed = exposedHeaders?.includes('RateLimit');
    
    if (hasRateLimitHeaders && areExposed) {
      log('\n✓ Rate limit headers are properly exposed', 'green');
      return true;
    } else {
      log('\n✗ Rate limit headers not properly exposed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error testing rate limit headers: ${error.message}`, 'red');
    return false;
  }
}

async function testCrossOriginRequest() {
  log('\n=== Testing Cross-Origin POST Request ===', 'cyan');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/v1/payment-links`,
      {
        userId: 'test-user',
        address: '0x1234567890123456789012345678901234567890',
        token: 'USDC',
        amount: '100.00',
        selectedCurrency: 'USD',
        paymentType: 'card',
        successUrl: 'https://example.com/success'
      },
      {
        headers: {
          'Origin': 'https://chainpaye.com',
          'Content-Type': 'application/json',
          'X-Correlation-Id': 'test-cors-' + Date.now()
        },
        validateStatus: () => true
      }
    );
    
    const corsOrigin = response.headers['access-control-allow-origin'];
    
    if (response.status === 201 && corsOrigin) {
      log(`\n✓ Cross-origin POST request successful`, 'green');
      log(`  Status: ${response.status}`, 'blue');
      log(`  CORS Origin: ${corsOrigin}`, 'blue');
      return true;
    } else {
      log(`\n✗ Cross-origin POST request failed`, 'red');
      log(`  Status: ${response.status}`, 'red');
      log(`  CORS Origin: ${corsOrigin || 'Not set'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error testing cross-origin request: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('╔════════════════════════════════════════════╗', 'cyan');
  log('║        ChainPaye CORS Tests                ║', 'cyan');
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
    corsHeaders: false,
    preflight: false,
    rateLimitHeaders: false,
    crossOriginPost: false
  };
  
  // Run tests
  results.corsHeaders = await testCorsHeaders();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.preflight = await testPreflightRequest();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.rateLimitHeaders = await testRateLimitHeaders();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.crossOriginPost = await testCrossOriginRequest();
  
  // Summary
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║              Test Summary                  ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  log(`\nCORS Headers: ${results.corsHeaders ? '✓ PASS' : '✗ FAIL'}`, 
    results.corsHeaders ? 'green' : 'red');
  log(`Preflight Request: ${results.preflight ? '✓ PASS' : '✗ FAIL'}`, 
    results.preflight ? 'green' : 'red');
  log(`Rate Limit Headers: ${results.rateLimitHeaders ? '✓ PASS' : '✗ FAIL'}`, 
    results.rateLimitHeaders ? 'green' : 'red');
  log(`Cross-Origin POST: ${results.crossOriginPost ? '✓ PASS' : '✗ FAIL'}`, 
    results.crossOriginPost ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    log('\n✓ All CORS tests passed!', 'green');
    log('Your API is properly configured for cross-origin requests.', 'green');
  } else {
    log('\n✗ Some CORS tests failed.', 'red');
    log('Please review the results above and check CORS_CONFIGURATION.md', 'yellow');
  }
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
