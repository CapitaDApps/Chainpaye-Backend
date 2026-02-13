/**
 * Test script for the new GET /transactions endpoint with state filtering
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function testTransactionsByState() {
  console.log('🧪 Testing GET /transactions endpoint with state filtering...\n');

  const testCases = [
    {
      name: 'Get all transactions (no filter)',
      url: `${BASE_URL}/transactions`
    },
    {
      name: 'Filter by PENDING state',
      url: `${BASE_URL}/transactions?state=PENDING`
    },
    {
      name: 'Filter by COMPLETED state',
      url: `${BASE_URL}/transactions?state=COMPLETED`
    },
    {
      name: 'Filter by PAID state',
      url: `${BASE_URL}/transactions?state=PAID`
    },
    {
      name: 'Filter by INITIALIZED state',
      url: `${BASE_URL}/transactions?state=INITIALIZED`
    },
    {
      name: 'Filter by PAYOUT_FAILED state',
      url: `${BASE_URL}/transactions?state=PAYOUT_FAILED`
    },
    {
      name: 'Filter by currency (USD)',
      url: `${BASE_URL}/transactions?currency=USD`
    },
    {
      name: 'Filter by currency (NGN)',
      url: `${BASE_URL}/transactions?currency=NGN`
    },
    {
      name: 'Combine state and currency filters',
      url: `${BASE_URL}/transactions?state=COMPLETED&currency=USD`
    },
    {
      name: 'Filter by payment link ID',
      url: `${BASE_URL}/transactions?paymentLinkId=your-payment-link-id-here`
    },
    {
      name: 'With pagination',
      url: `${BASE_URL}/transactions?state=COMPLETED&page=1&limit=5`
    },
    {
      name: 'With sorting by creation date (desc)',
      url: `${BASE_URL}/transactions?sortBy=createdAt&sortOrder=desc`
    },
    {
      name: 'With sorting by paid date (desc)',
      url: `${BASE_URL}/transactions?state=PAID&sortBy=paidAt&sortOrder=desc`
    },
    {
      name: 'Complex query with multiple filters',
      url: `${BASE_URL}/transactions?state=COMPLETED&currency=USD&sortBy=updatedAt&sortOrder=desc&page=1&limit=10`
    },
    {
      name: 'Invalid state (should ignore invalid filter)',
      url: `${BASE_URL}/transactions?state=INVALID_STATE`
    },
    {
      name: 'Invalid currency (should ignore invalid filter)',
      url: `${BASE_URL}/transactions?currency=INVALID_CURRENCY`
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log(`🔗 ${testCase.url}`);
    
    try {
      const response = await fetch(testCase.url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Results: ${data.data?.transactions?.length || 0} transactions`);
        console.log(`📄 Total: ${data.data?.total || 0}, Page: ${data.data?.page || 1}, Limit: ${data.data?.limit || 20}`);
        
        if (data.data?.transactions?.length > 0) {
          const states = [...new Set(data.data.transactions.map(t => t.state))];
          const currencies = [...new Set(data.data.transactions.map(t => t.currency))];
          console.log(`🏷️  States found: ${states.join(', ')}`);
          console.log(`💰 Currencies found: ${currencies.join(', ')}`);
          
          // Show first transaction as sample
          const firstTx = data.data.transactions[0];
          console.log(`📝 Sample transaction: ${firstTx.id} - ${firstTx.state} - ${firstTx.amount} ${firstTx.currency}`);
        }
      } else {
        console.log(`❌ Status: ${response.status}`);
        console.log(`💬 Error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.log(`💥 Request failed: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

// Function to test specific state counts
async function testStateCounts() {
  console.log('📊 Testing transaction counts by state...\n');
  
  const states = ['PENDING', 'INITIALIZED', 'PAID', 'COMPLETED', 'PAYOUT_FAILED'];
  
  for (const state of states) {
    try {
      const response = await fetch(`${BASE_URL}/transactions?state=${state}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`${state}: ${data.data?.total || 0} transactions`);
      } else {
        console.log(`${state}: Error - ${data.error || data.message}`);
      }
    } catch (error) {
      console.log(`${state}: Request failed - ${error.message}`);
    }
  }
  
  console.log('');
}

// Function to test currency distribution
async function testCurrencyDistribution() {
  console.log('💰 Testing transaction distribution by currency...\n');
  
  const currencies = ['NGN', 'USD', 'GBP', 'EUR'];
  
  for (const currency of currencies) {
    try {
      const response = await fetch(`${BASE_URL}/transactions?currency=${currency}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`${currency}: ${data.data?.total || 0} transactions`);
      } else {
        console.log(`${currency}: Error - ${data.error || data.message}`);
      }
    } catch (error) {
      console.log(`${currency}: Request failed - ${error.message}`);
    }
  }
  
  console.log('');
}

// Run all tests if this script is executed directly
if (require.main === module) {
  (async () => {
    try {
      await testTransactionsByState();
      await testStateCounts();
      await testCurrencyDistribution();
      
      console.log('🎉 All tests completed!');
      console.log('\n📚 Endpoint Summary:');
      console.log('- GET /transactions - Fetch all transactions with optional filtering');
      console.log('- Supports filtering by: state, currency, paymentLinkId');
      console.log('- Supports pagination: page, limit');
      console.log('- Supports sorting: sortBy, sortOrder');
      console.log('- Available states: PENDING, INITIALIZED, PAID, COMPLETED, PAYOUT_FAILED');
      console.log('- Available currencies: NGN, USD, GBP, EUR');
    } catch (error) {
      console.error('Test execution failed:', error);
    }
  })();
}

module.exports = { 
  testTransactionsByState, 
  testStateCounts, 
  testCurrencyDistribution 
};