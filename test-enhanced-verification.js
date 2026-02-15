/**
 * Comprehensive Test Suite for Enhanced Background Verification System v2.0.0
 * 
 * This script tests all aspects of the enhanced verification system:
 * - Health check endpoints
 * - Service statistics
 * - Database performance
 * - System monitoring
 * - Error handling
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Test health check endpoints
 */
async function testHealthEndpoints() {
  console.log('🏥 Testing Health Check Endpoints...\n');

  const healthEndpoints = [
    {
      name: 'Basic Health Check',
      url: `${BASE_URL}/health`,
      expectedStatus: 200
    },
    {
      name: 'Verification Service Health',
      url: `${BASE_URL}/health/verification`,
      expectedStatus: 200
    },
    {
      name: 'Database Health Check',
      url: `${BASE_URL}/health/database`,
      expectedStatus: 200
    },
    {
      name: 'System Health Check',
      url: `${BASE_URL}/health/system`,
      expectedStatus: 200
    },
    {
      name: 'Transaction Statistics',
      url: `${BASE_URL}/health/transactions`,
      expectedStatus: 200
    }
  ];

  for (const endpoint of healthEndpoints) {
    console.log(`📋 Testing: ${endpoint.name}`);
    console.log(`🔗 URL: ${endpoint.url}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.url);
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      if (response.status === endpoint.expectedStatus) {
        console.log(`✅ Status: ${response.status} (${responseTime}ms)`);
        
        // Log key information based on endpoint
        if (endpoint.url.includes('/verification')) {
          console.log(`📊 Service Status: ${data.status}`);
          console.log(`⏱️ Uptime: ${data.uptime}`);
          console.log(`📈 Total Runs: ${data.statistics?.totalRuns || 0}`);
          console.log(`🎯 Success Rate: ${data.statistics?.successRate || 'N/A'}`);
        } else if (endpoint.url.includes('/database')) {
          console.log(`💾 Database: ${data.database} (${data.connectivity})`);
          console.log(`⚡ Query Time: ${data.queryTime}`);
          console.log(`📊 Total Transactions: ${data.statistics?.totalTransactions || 0}`);
        } else if (endpoint.url.includes('/system')) {
          console.log(`🖥️ Overall Status: ${data.status}`);
          console.log(`⏱️ Uptime: ${data.uptime}`);
          console.log(`💾 Memory: ${data.components?.memory?.heapUsed || 'N/A'}`);
        } else if (endpoint.url.includes('/transactions')) {
          console.log(`📊 Total Transactions: ${data.totals?.all || 0}`);
          console.log(`⏳ Pending: ${data.totals?.pending || 0}`);
          console.log(`✅ Completed: ${data.totals?.completed || 0}`);
          console.log(`📈 Completion Rate: ${data.percentages?.completionRate || 'N/A'}`);
        } else {
          console.log(`📋 Message: ${data.message}`);
          console.log(`🔢 Version: ${data.version}`);
        }
      } else {
        console.log(`❌ Status: ${response.status} (Expected: ${endpoint.expectedStatus})`);
        console.log(`💬 Error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.log(`💥 Request failed: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

/**
 * Test verification service statistics and monitoring
 */
async function testVerificationMonitoring() {
  console.log('📊 Testing Verification Service Monitoring...\n');

  try {
    const response = await fetch(`${BASE_URL}/health/verification`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Verification Service Monitoring Data:');
      console.log('=====================================');
      console.log(`Service Status: ${data.status}`);
      console.log(`Is Running: ${data.isRunning}`);
      console.log(`Uptime: ${data.uptime}`);
      console.log(`Last Run: ${data.lastRun || 'Never'}`);
      console.log(`Last Run Duration: ${data.lastRunDuration || 0}ms`);
      console.log('');
      
      console.log('📈 Statistics:');
      console.log(`  Total Runs: ${data.statistics?.totalRuns || 0}`);
      console.log(`  Transactions Processed: ${data.statistics?.totalTransactionsProcessed || 0}`);
      console.log(`  Total Errors: ${data.statistics?.totalErrors || 0}`);
      console.log(`  Error Rate: ${data.statistics?.errorRate || '0%'}`);
      console.log(`  Success Rate: ${data.statistics?.successRate || '100%'}`);
      console.log('');
      
      console.log('⚡ Performance:');
      console.log(`  Memory Usage: ${data.performance?.memoryUsage || 'N/A'}`);
      console.log(`  Avg Processing Time: ${data.performance?.avgProcessingTime || 0}ms`);
      console.log('');
      
      console.log('⚙️ Configuration:');
      console.log(`  Batch Size: ${data.configuration?.batchSize || 'N/A'}`);
      console.log(`  Cron Interval: ${data.configuration?.cronInterval || 'N/A'}`);
      console.log(`  API Delay: ${data.configuration?.apiDelay || 'N/A'}`);
      console.log(`  Max Retries: ${data.configuration?.maxRetries || 'N/A'}`);
      
    } else {
      console.log(`❌ Failed to get monitoring data: ${data.error || data.message}`);
    }
  } catch (error) {
    console.log(`💥 Monitoring test failed: ${error.message}`);
  }
  
  console.log('');
}

/**
 * Test system performance and resource usage
 */
async function testSystemPerformance() {
  console.log('🖥️ Testing System Performance...\n');

  const performanceTests = [
    {
      name: 'Database Query Performance',
      test: async () => {
        const startTime = Date.now();
        const response = await fetch(`${BASE_URL}/health/database`);
        const data = await response.json();
        const totalTime = Date.now() - startTime;
        
        return {
          success: response.ok,
          queryTime: data.queryTime,
          totalTime: totalTime + 'ms',
          transactions: data.statistics?.totalTransactions || 0
        };
      }
    },
    {
      name: 'Memory Usage Check',
      test: async () => {
        const response = await fetch(`${BASE_URL}/health/system`);
        const data = await response.json();
        
        const memoryStatus = data.components?.memory?.status;
        const heapUsed = data.components?.memory?.heapUsed;
        
        return {
          success: response.ok && memoryStatus === 'healthy',
          status: memoryStatus,
          heapUsed: heapUsed,
          healthy: memoryStatus === 'healthy'
        };
      }
    },
    {
      name: 'Service Response Time',
      test: async () => {
        const tests = [];
        
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();
          const response = await fetch(`${BASE_URL}/health`);
          const responseTime = Date.now() - startTime;
          tests.push(responseTime);
        }
        
        const avgResponseTime = tests.reduce((a, b) => a + b, 0) / tests.length;
        const maxResponseTime = Math.max(...tests);
        const minResponseTime = Math.min(...tests);
        
        return {
          success: avgResponseTime < 1000, // Less than 1 second average
          avgResponseTime: Math.round(avgResponseTime) + 'ms',
          maxResponseTime: maxResponseTime + 'ms',
          minResponseTime: minResponseTime + 'ms',
          tests: tests.length
        };
      }
    }
  ];

  for (const perfTest of performanceTests) {
    console.log(`⚡ Testing: ${perfTest.name}`);
    
    try {
      const result = await perfTest.test();
      
      if (result.success) {
        console.log(`✅ Test passed`);
      } else {
        console.log(`⚠️ Test completed with warnings`);
      }
      
      // Log specific results
      Object.keys(result).forEach(key => {
        if (key !== 'success') {
          console.log(`   ${key}: ${result[key]}`);
        }
      });
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * Test error handling and edge cases
 */
async function testErrorHandling() {
  console.log('🚨 Testing Error Handling...\n');

  const errorTests = [
    {
      name: 'Invalid Health Endpoint',
      url: `${BASE_URL}/health/invalid`,
      expectedStatus: 404
    },
    {
      name: 'Malformed Request',
      url: `${BASE_URL}/health/verification?invalid=param`,
      expectedStatus: 200 // Should still work with extra params
    }
  ];

  for (const errorTest of errorTests) {
    console.log(`🧪 Testing: ${errorTest.name}`);
    console.log(`🔗 URL: ${errorTest.url}`);
    
    try {
      const response = await fetch(errorTest.url);
      const data = await response.json();
      
      if (response.status === errorTest.expectedStatus) {
        console.log(`✅ Expected status: ${response.status}`);
      } else {
        console.log(`⚠️ Unexpected status: ${response.status} (Expected: ${errorTest.expectedStatus})`);
      }
      
      if (data.error) {
        console.log(`📋 Error message: ${data.error}`);
      }
      
    } catch (error) {
      console.log(`💥 Request failed: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * Generate load test for verification system
 */
async function testLoadHandling() {
  console.log('🔥 Testing Load Handling...\n');

  const concurrentRequests = 10;
  const requests = [];
  
  console.log(`🚀 Sending ${concurrentRequests} concurrent requests to health endpoint...`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      fetch(`${BASE_URL}/health/verification`)
        .then(response => ({
          status: response.status,
          ok: response.ok,
          time: Date.now() - startTime
        }))
        .catch(error => ({
          status: 'error',
          ok: false,
          error: error.message,
          time: Date.now() - startTime
        }))
    );
  }
  
  try {
    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    const avgTime = results.reduce((sum, r) => sum + (r.time || 0), 0) / results.length;
    
    console.log(`📊 Load Test Results:`);
    console.log(`   Total Requests: ${concurrentRequests}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${Math.round((successful / concurrentRequests) * 100)}%`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Average Response Time: ${Math.round(avgTime)}ms`);
    
    if (successful === concurrentRequests) {
      console.log(`✅ Load test passed - all requests successful`);
    } else {
      console.log(`⚠️ Load test completed with ${failed} failures`);
    }
    
  } catch (error) {
    console.log(`❌ Load test failed: ${error.message}`);
  }
  
  console.log('');
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 Enhanced Background Verification System Test Suite v2.0.0');
  console.log('================================================================\n');
  
  const startTime = Date.now();
  
  try {
    await testHealthEndpoints();
    await testVerificationMonitoring();
    await testSystemPerformance();
    await testErrorHandling();
    await testLoadHandling();
    
    const totalTime = Date.now() - startTime;
    
    console.log('🎉 Test Suite Completed Successfully!');
    console.log(`⏱️ Total execution time: ${totalTime}ms`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
}

// Export functions for individual testing
module.exports = {
  testHealthEndpoints,
  testVerificationMonitoring,
  testSystemPerformance,
  testErrorHandling,
  testLoadHandling,
  runAllTests
};

// Run all tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}