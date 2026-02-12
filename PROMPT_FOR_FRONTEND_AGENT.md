# Prompt for Frontend Agent: Record Transaction After Payment

## Task
Implement the transaction recording functionality that calls the backend API after a payment is successfully completed.

---

## Context

The payment flow works in 3 steps:

1. **User opens payment link** → Backend creates transaction with state "PENDING"
2. **User completes payment** → Payment provider processes the payment
3. **Frontend records transaction** → Call API to mark transaction as "COMPLETED"

You need to implement step 3.

---

## API Endpoint

**POST** `/api/v1/record-transaction/{transactionId}`

### Request Body
```json
{
  "amount": "100.00",
  "currency": "USD",
  "senderName": "John Doe",
  "senderPhone": "+1-555-0123",
  "paidAt": "2026-02-07T12:00:00.000Z"
}
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "transaction-id",
    "state": "COMPLETED",
    "recordedAt": "2026-02-07T12:00:00.000Z"
  },
  "message": "Transaction recorded successfully"
}
```

---

## Implementation Requirements

### 1. Store Transaction ID
When the user accesses the payment link, the backend returns a `transactionId`. Store this ID:

```javascript
// When payment link is accessed
const response = await fetch('/payment/abc123');
const data = await response.json();

// Store for later use
localStorage.setItem('transactionId', data.data.transactionId);
localStorage.setItem('paymentAmount', data.data.amount);
localStorage.setItem('paymentCurrency', data.data.currency);
localStorage.setItem('successUrl', data.data.successUrl);
```

### 2. Record Transaction After Payment Success
After your payment provider confirms payment, call the record transaction endpoint:

```javascript
async function recordTransaction(paymentProviderResponse) {
  const transactionId = localStorage.getItem('transactionId');
  
  const response = await fetch(
    `/api/v1/record-transaction/${transactionId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: paymentProviderResponse.amount.toString(),
        currency: paymentProviderResponse.currency,
        senderName: paymentProviderResponse.payer.name,
        senderPhone: paymentProviderResponse.payer.phone,
        paidAt: new Date().toISOString()
      })
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    // Redirect to success URL
    window.location.href = localStorage.getItem('successUrl');
  }
}
```

### 3. Handle Errors

```javascript
if (!response.ok) {
  const error = await response.json();
  
  // Already recorded? That's OK, proceed anyway
  if (response.status === 400 && error.message.includes('already')) {
    window.location.href = localStorage.getItem('successUrl');
    return;
  }
  
  // Show error to user
  showError(error.message);
}
```

---

## Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| amount | string | Yes | Positive number, max 4 decimals (e.g., "100.00") |
| currency | string | Yes | Must match transaction currency (USD, NGN, GBP, EUR) |
| senderName | string | Yes | 1-100 characters |
| senderPhone | string | Yes | 1-20 characters |
| paidAt | string | Yes | ISO 8601 date format |

---

## Error Handling

| Status | Error | Action |
|--------|-------|--------|
| 400 | "Transaction already processed" | Treat as success, redirect to success URL |
| 400 | "Currency mismatch" | Show error, don't retry |
| 400 | Validation error | Show specific error message |
| 404 | "Transaction not found" | Show error, payment link invalid |
| 429 | Rate limit exceeded | Wait and retry (max 3 times) |
| 500 | Server error | Retry with exponential backoff |

---

## Complete Example (React)

```typescript
import { useState, useEffect } from 'react';

interface PaymentSuccessProps {
  paymentProviderResponse: {
    amount: number;
    currency: string;
    payer: {
      name: string;
      phone: string;
    };
  };
}

export function PaymentSuccess({ paymentProviderResponse }: PaymentSuccessProps) {
  const [status, setStatus] = useState<'recording' | 'success' | 'error'>('recording');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    recordTransaction();
  }, []);

  const recordTransaction = async () => {
    try {
      const transactionId = localStorage.getItem('transactionId');
      
      if (!transactionId) {
        throw new Error('Transaction ID not found');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/v1/record-transaction/${transactionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: paymentProviderResponse.amount.toString(),
            currency: paymentProviderResponse.currency,
            senderName: paymentProviderResponse.payer.name,
            senderPhone: paymentProviderResponse.payer.phone,
            paidAt: new Date().toISOString()
          })
        }
      );

      const result = await response.json();

      if (response.ok || (response.status === 400 && result.message.includes('already'))) {
        setStatus('success');
        
        // Clean up
        localStorage.removeItem('transactionId');
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = localStorage.getItem('successUrl') || '/';
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to record transaction');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  return (
    <div>
      {status === 'recording' && (
        <div>
          <h2>Processing your payment...</h2>
          <p>Please wait while we confirm your transaction.</p>
        </div>
      )}
      
      {status === 'success' && (
        <div>
          <h2>✓ Payment Successful!</h2>
          <p>Your transaction has been recorded. Redirecting...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div>
          <h2>Error Recording Transaction</h2>
          <p>{errorMessage}</p>
          <button onClick={recordTransaction}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Transaction ID is stored when payment link is accessed
- [ ] Record transaction is called after payment success
- [ ] All required fields are included in request
- [ ] Success case redirects to success URL
- [ ] "Already recorded" error is handled as success
- [ ] Other errors show user-friendly messages
- [ ] Loading state is shown during API call
- [ ] Retry logic works for network errors

---

## Rate Limiting

- **Limit:** 30 requests per 5 minutes per IP
- **Headers:** Check `RateLimit-Remaining` to avoid hitting limits
- **Retry:** Use exponential backoff (1s, 2s, 4s)

---

## Quick Start

1. **Install dependencies** (if using axios):
   ```bash
   npm install axios
   ```

2. **Set environment variable**:
   ```
   REACT_APP_API_URL=https://your-api-domain.com
   ```

3. **Implement the hook/component** using the example above

4. **Test the flow**:
   - Open payment link
   - Complete payment
   - Verify transaction is recorded
   - Check redirect to success URL

---

## Support Files

- Full documentation: `FRONTEND_INTEGRATION_GUIDE.md`
- API details: `API_DOCUMENTATION.md`
- Endpoint specifics: `RECORD_TRANSACTION_API.md`
- Test script: `test-record-transaction.js`
