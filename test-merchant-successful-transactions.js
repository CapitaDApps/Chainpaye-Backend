/**
 * Test script for the new merchant successful transactions endpoint
 * GET /payment-links/merchant/:merchantId/successful-transactions
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function testMerchantSuccessfulTransactions() {
  console.log('🧪 Testing merchant successful transactions endpoint...\n');

  // You'll need to replace this with an actual merchant ID from your database
  const testMerchantId = 'your-merchant-id-here';

  const testCases = [
    {
      name: 'Get all successful transactions (default pagination)',
      url: `${BASE_URL}/payment-links/merchant/${testMerchantId}/successful-transactions`
    },
    {
      name: 'Get successful transactions with pagination',
      url: `${BASE_URL}/payment-links/merchant/${testMerchantId}/successful-transactions?page=1&limit=5`
    },
    {
      name: 'Get successful transactions sorted by payment date (newest first)',
      url: `${BASE_URL}/payment-links/merchant/${testMerchantId}/successful-transactions?sortBy=paidAt&sortOrder=desc`
    },
    {
      name: 'Get successful transactions sorted by recorded date (oldest first)',
      url: `${BASE_URL}/payment-links/merchant/${testMerchantId}/successful-transactions?sortBy=recordedAt&sortOrder=asc`
    },
    {
      name: 'Get successful transactions sorted by amount',
      url: `${BASE_URL}/payment-links/merchant/${testMerchantId}/successful-transactions?sortBy=amount&sortOrder=desc`
    },
    {
      name: 'Invalid merchant ID (should return empty results)',
      url: `${BASE_URL}/payment-links/merchant/invalid-merchant-id/successful-transactions`
    },
    {
      name: 'Missing merchant ID (should return validation error)',
      url: `${BASE_URL}/payment-links/merchant//successful-transactions`
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
        console.log(`📈 Total: ${data.data?.total || 0}`);
        console.log(`📄 Page: ${data.data?.page || 1} of ${Math.ceil((data.data?.total || 0) / (data.data?.limit || 20))}`);
        
        if (data.data?.transactions?.length > 0) {
          const transaction = data.data.transactions[0];
          console.log(`💰 Sample transaction: ${transaction.reference} - ${transaction.currency} ${transaction.actualAmountPaid || transaction.amount}`);
          console.log(`🏷️  State: ${transaction.state}`);
          console.log(`👤 Sender: ${transaction.senderName || 'N/A'}`);
          console.log(`📅 Paid At: ${transaction.paidAt || 'N/A'}`);
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

  // Additional test with sample data structure
  console.log('📋 Expected Response Structure:');
  console.log(`{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "trans_id",
        "paymentLinkId": "link_id", 
        "reference": "TXN_REF_123",
        "state": "COMPLETED" | "PAID",
        "amount": "100.00",
        "currency": "USD",
        "actualAmountPaid": "100.00",
        "senderName": "John Doe",
        "senderPhone": "+1234567890",
        "payerInfo": {
          "email": "john@example.com",
          "name": "John Doe",
          "phone": "+1234567890"
        },
        "paidAt": "2026-02-04T10:00:00.000Z",
        "recordedAt": "2026-02-04T10:01:00.000Z",
        "createdAt": "2026-02-04T09:30:00.000Z",
        "updatedAt": "2026-02-04T10:01:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  },
  "message": "Successful transactions retrieved successfully"
}`);
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMerchantSuccessfulTransactions().catch(console.error);
}

module.exports = { testMerchantSuccessfulTransactions };