# Frontend Integration Guide - Record Transaction After Payment

## Overview
This guide provides instructions for frontend developers to integrate the transaction recording functionality after a payment is completed.

## Payment Flow Summary

1. **User opens payment link** → `GET/POST /payment/:id`
   - Backend initializes payment with Toronet
   - Returns `transactionId` and payment details
   
2. **User completes payment** → Payment provider processes payment
   - User enters payment details and confirms
   - Payment provider (Stripe, PayPal, etc.) processes the payment
   
3. **Frontend records transaction** → `POST /api/v1/record-transaction/:transactionId`
   - After payment confirmation, call this endpoint
   - Updates transaction status to COMPLETED

---

## Prompt for Frontend Agent

```
Implement transaction recording functionality after payment completion.

CONTEXT:
When a user opens a payment link at https://chainpaye.com/payment/{id}, the backend:
1. Verifies the payment link is active
2. Initializes payment with Toronet API
3. Creates a transaction record with state "PENDING"
4. Returns a response containing the transactionId

After the user completes payment through the payment provider (Stripe, PayPal, etc.), 
you need to call the record transaction endpoint to mark the transaction as complete.

ENDPOINT:
POST /api/v1/record-transaction/{transactionId}

WHEN TO CALL:
- After receiving payment confirmation from your payment provider
- In the payment success callback/webhook handler
- When the payment provider confirms the payment was successful

REQUEST FORMAT:
{
  "amount": "100.00",              // String: Actual amount paid (must match transaction)
  "currency": "USD",               // String: Currency code (must match transaction)
  "senderName": "John Doe",        // String: Name of person who paid (1-100 chars)
  "senderPhone": "+1-555-0123",   // String: Phone number of sender (1-20 chars)
  "paidAt": "2026-02-07T12:00:00.000Z"  // ISO date string: When payment completed
}

IMPLEMENTATION REQUIREMENTS:

1. STORE TRANSACTION ID:
   - When user accesses payment link, save the transactionId from the response
   - Store it in component state, context, or local storage
   - You'll need this ID to record the transaction later

2. PAYMENT PROVIDER INTEGRATION:
   - After payment provider confirms success, extract payment details
   - Get: amount, currency, payer name, payer phone, payment timestamp
   - These details come from your payment provider's response

3. CALL RECORD TRANSACTION ENDPOINT:
   - Make POST request to /api/v1/record-transaction/{transactionId}
   - Include all required fields in request body
   - Handle success and error responses appropriately

4. ERROR HANDLING:
   - 400: Validation error or already recorded - show user-friendly message
   - 404: Transaction not found - payment link may be invalid
   - 500: Server error - implement retry logic

5. USER FEEDBACK:
   - Show loading state while recording transaction
   - Display success message when transaction is recorded
   - Redirect to success URL from payment link data
   - Handle errors gracefully with clear messages

EXAMPLE IMPLEMENTATION (React/TypeScript):

```typescript
import { useState } from 'react';
import axios from 'axios';

interface PaymentDetails {
  amount: string;
  currency: string;
  senderName: string;
  senderPhone: string;
}

interface RecordTransactionResponse {
  success: boolean;
  data: {
    id: string;
    state: string;
    recordedAt: string;
  };
  message: string;
}

const useRecordTransaction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordTransaction = async (
    transactionId: string,
    paymentDetails: PaymentDetails
  ): Promise<RecordTransactionResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<RecordTransactionResponse>(
        `${process.env.REACT_APP_API_URL}/api/v1/record-transaction/${transactionId}`,
        {
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          senderName: paymentDetails.senderName,
          senderPhone: paymentDetails.senderPhone,
          paidAt: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': crypto.randomUUID() // Optional: for tracking
          }
        }
      );

      setLoading(false);
      return response.data;
    } catch (err: any) {
      setLoading(false);
      
      if (err.response) {
        // Server responded with error
        const errorMessage = err.response.data.message || 'Failed to record transaction';
        setError(errorMessage);
        
        // Handle specific error cases
        if (err.response.status === 400 && errorMessage.includes('already')) {
          console.warn('Transaction already recorded');
          // Still consider this a success case
          return err.response.data;
        }
      } else {
        // Network error or no response
        setError('Network error. Please check your connection.');
      }
      
      return null;
    }
  };

  return { recordTransaction, loading, error };
};

// Usage in Payment Success Component
const PaymentSuccessHandler = () => {
  const { recordTransaction, loading, error } = useRecordTransaction();
  const [recorded, setRecorded] = useState(false);

  const handlePaymentSuccess = async (paymentProviderResponse: any) => {
    // Extract transaction ID (saved when payment link was accessed)
    const transactionId = localStorage.getItem('currentTransactionId');
    
    if (!transactionId) {
      console.error('Transaction ID not found');
      return;
    }

    // Extract payment details from payment provider response
    const paymentDetails: PaymentDetails = {
      amount: paymentProviderResponse.amount.toString(),
      currency: paymentProviderResponse.currency,
      senderName: paymentProviderResponse.payer.name,
      senderPhone: paymentProviderResponse.payer.phone
    };

    // Record the transaction
    const result = await recordTransaction(transactionId, paymentDetails);

    if (result?.success) {
      setRecorded(true);
      
      // Clean up stored transaction ID
      localStorage.removeItem('currentTransactionId');
      
      // Redirect to success URL
      const successUrl = localStorage.getItem('paymentSuccessUrl');
      if (successUrl) {
        window.location.href = successUrl;
      }
    }
  };

  return (
    <div>
      {loading && <p>Recording transaction...</p>}
      {error && <p className="error">{error}</p>}
      {recorded && <p className="success">Payment recorded successfully!</p>}
    </div>
  );
};

export default PaymentSuccessHandler;
```

VALIDATION RULES TO IMPLEMENT:
- Amount must be a positive number string (e.g., "100.00", "99.99")
- Currency must match the original transaction currency (USD, NGN, GBP, or EUR)
- Sender name: 1-100 characters, required
- Sender phone: 1-20 characters, required
- PaidAt must be valid ISO 8601 date string

SUCCESS RESPONSE:
{
  "success": true,
  "data": {
    "id": "transaction-id",
    "state": "COMPLETED",
    "recordedAt": "2026-02-07T12:00:00.000Z",
    ...
  },
  "message": "Transaction recorded successfully"
}

ERROR RESPONSES TO HANDLE:
1. Already recorded (400): "Transaction already processed"
   - Action: Treat as success, proceed to success page
   
2. Currency mismatch (400): "Currency mismatch. Expected: USD, Received: EUR"
   - Action: Show error, don't retry
   
3. Transaction not found (404): "Transaction not found"
   - Action: Show error, payment link may be invalid
   
4. Validation error (400): Field-specific validation messages
   - Action: Show error details to user
   
5. Server error (500): "Failed to record transaction"
   - Action: Implement retry logic (max 3 attempts)

TESTING CHECKLIST:
□ Transaction ID is properly stored when payment link is accessed
□ Payment details are correctly extracted from payment provider
□ API call is made with correct format
□ Success case redirects to success URL
□ Already recorded case is handled gracefully
□ Network errors show appropriate message
□ Loading states are displayed during API call
□ Error messages are user-friendly

RATE LIMITING:
- Endpoint has rate limit: 30 requests per 5 minutes per IP
- Implement exponential backoff for retries
- Check RateLimit-Remaining header to avoid hitting limits

SECURITY CONSIDERATIONS:
- Never expose transaction IDs in URLs or logs
- Validate all payment provider data before sending
- Use HTTPS for all API calls
- Include correlation IDs for debugging
- Clear sensitive data from storage after use

ADDITIONAL NOTES:
- The endpoint is idempotent - calling it multiple times with same data won't create duplicates
- Transaction state transitions: PENDING → PAID → COMPLETED
- All timestamps should be in ISO 8601 format
- API base URL should be configurable via environment variables
```

---

## Quick Integration Steps

### Step 1: Access Payment Link
```javascript
// When user opens payment link
const response = await axios.post(`/payment/${paymentLinkId}`);

// Save transaction ID for later
localStorage.setItem('currentTransactionId', response.data.transactionId);
localStorage.setItem('paymentAmount', response.data.amount);
localStorage.setItem('paymentCurrency', response.data.currency);
localStorage.setItem('paymentSuccessUrl', response.data.successUrl);
```

### Step 2: Process Payment
```javascript
// User completes payment through payment provider
// Payment provider returns success response
const paymentResult = await processPaymentWithProvider({
  amount: localStorage.getItem('paymentAmount'),
  currency: localStorage.getItem('paymentCurrency')
});
```

### Step 3: Record Transaction
```javascript
// After payment success
const transactionId = localStorage.getItem('currentTransactionId');

const recordResult = await axios.post(
  `/api/v1/record-transaction/${transactionId}`,
  {
    amount: paymentResult.amount,
    currency: paymentResult.currency,
    senderName: paymentResult.payer.name,
    senderPhone: paymentResult.payer.phone,
    paidAt: new Date().toISOString()
  }
);

if (recordResult.data.success) {
  // Redirect to success URL
  window.location.href = localStorage.getItem('paymentSuccessUrl');
}
```

---

## Testing the Integration

Use this test script to verify your implementation:

```javascript
// test-frontend-integration.js
const axios = require('axios');

async function testFullFlow() {
  const API_URL = 'http://localhost:4000';
  
  // Step 1: Create payment link
  const createResponse = await axios.post(`${API_URL}/api/v1/payment-links`, {
    userId: 'test-user',
    address: '0x1234567890123456789012345678901234567890',
    token: 'USDC',
    amount: '100.00',
    selectedCurrency: 'USD',
    paymentType: 'card',
    successUrl: 'https://example.com/success'
  });
  
  const paymentLinkId = createResponse.data.data.id;
  console.log('✓ Payment link created:', paymentLinkId);
  
  // Step 2: Access payment link (simulates user opening link)
  const accessResponse = await axios.post(`${API_URL}/payment/${paymentLinkId}`);
  const transactionId = accessResponse.data.data.transactionId;
  console.log('✓ Payment initialized, transaction ID:', transactionId);
  
  // Step 3: Simulate payment completion and record transaction
  const recordResponse = await axios.post(
    `${API_URL}/api/v1/record-transaction/${transactionId}`,
    {
      amount: '100.00',
      currency: 'USD',
      senderName: 'John Doe',
      senderPhone: '+1-555-0123',
      paidAt: new Date().toISOString()
    }
  );
  
  console.log('✓ Transaction recorded:', recordResponse.data.data.state);
  console.log('\n✓ Full flow completed successfully!');
}

testFullFlow().catch(console.error);
```

---

## Common Issues and Solutions

### Issue 1: Transaction ID Not Found
**Problem:** 404 error when recording transaction
**Solution:** Ensure you're storing the transaction ID from the payment link access response

### Issue 2: Currency Mismatch
**Problem:** 400 error about currency mismatch
**Solution:** Use the same currency from the payment link, don't convert or change it

### Issue 3: Already Recorded
**Problem:** 400 error saying transaction already recorded
**Solution:** This is actually OK - treat it as success and proceed to success page

### Issue 4: Rate Limit Exceeded
**Problem:** 429 error when recording
**Solution:** Implement exponential backoff, check RateLimit-Remaining header

---

## Support

For questions or issues:
- Review API_DOCUMENTATION.md for full API details
- Check RECORD_TRANSACTION_API.md for endpoint specifics
- Run test-record-transaction.js to verify backend is working
- Check correlation IDs in error responses for debugging
