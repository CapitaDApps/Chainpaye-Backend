/**
 * Test script for the new state query parameter in GET /payment-links/:linkId/transactions
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function testStateFilter() {
  console.log('🧪 Testing state filter for payment link transactions...\n');

  // You'll need to replace this with an actual payment link ID from your database
  const testPaymentLinkId = 'your-payment-link-id-here';

  const testCases = [
    {
      name: 'Get all transactions (no filter)',
      url: `${BASE_URL}/payment-links/${testPaymentLinkId}/transactions`
    },
    {
      name: 'Filter by PENDING state',
      url: `${BASE_URL}/payment-links/${testPaymentLinkId}/transactions?state=PENDING`
    },
    {
      name: 'Filter by COMPLETED state',
      url: `${BASE_URL}/payment-links/${testPaymentLinkId}/transactions?state=COMPLETED`
    },
    {
      name: 'Filter by PAID state with pagination',
      url: `${BASE_URL}/payment-links/${testPaymentLinkId}/transactions?state=PAID&page=1&limit=5`
    },
    {
      name: 'Filter by INITIALIZED state with sorting',
      url: `${BASE_URL}/payment-links/${testPaymentLinkId}/transactions?state=INITIALIZED&sortBy=createdAt&sortOrder=desc`
    },
    {
      name: 'Invalid state (should return validation error)',
      url: `${BASE_URL}/payment-links/${testPaymentLinkId}/transactions?state=INVALID_STATE`
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
        if (data.data?.transactions?.length > 0) {
          const states = [...new Set(data.data.transactions.map(t => t.state))];
          console.log(`🏷️  States found: ${states.join(', ')}`);
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

// Run the test if this script is executed directly
if (require.main === module) {
  testStateFilter().catch(console.error);
}

module.exports = { testStateFilter };