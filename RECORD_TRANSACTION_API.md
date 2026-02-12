# Record Transaction API Documentation

## Overview
The Record Transaction endpoint allows you to mark a transaction as successfully paid and record the payment details including sender information and payment timestamp.

## Endpoint
```
POST /api/v1/record-transaction/{transactionId}
```

## Request Parameters

### Path Parameters
- `transactionId` (string, required): The ID of the transaction to record as successful

### Request Body
```json
{
  "amount": "150.75",
  "currency": "USD",
  "senderName": "John Smith",
  "senderPhone": "+1-555-123-4567",
  "paidAt": "2026-02-01T10:30:00.000Z"
}
```

#### Request Body Fields
- `amount` (string, required): The actual amount paid (must be a valid number string)
- `currency` (string, required): The currency of the payment (must match transaction currency)
- `senderName` (string, required): Name of the person who sent the payment (1-100 characters)
- `senderPhone` (string, required): Phone number of the sender (1-20 characters)
- `paidAt` (string, required): ISO date string of when the payment was completed

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "paymentLinkId": "507f1f77bcf86cd799439012",
    "reference": "TXN_1738387800000_A1B2C3D4",
    "state": "COMPLETED",
    "amount": "150.75",
    "currency": "USD",
    "actualAmountPaid": "150.75",
    "senderName": "John Smith",
    "senderPhone": "+1-555-123-4567",
    "paidAt": "2026-02-01T10:30:00.000Z",
    "recordedAt": "2026-02-01T10:35:00.000Z",
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-01T10:35:00.000Z"
  },
  "message": "Transaction recorded successfully",
  "timestamp": "2026-02-01T10:35:00.000Z",
  "correlationId": "abc123-def456-ghi789"
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Amount must be a positive number string with at most 4 decimal places",
  "timestamp": "2026-02-01T10:35:00.000Z",
  "correlationId": "abc123-def456-ghi789"
}
```

#### 400 Bad Request - Already Processed
```json
{
  "success": false,
  "error": "Transaction already processed",
  "message": "Transaction is already completed: 507f1f77bcf86cd799439011",
  "timestamp": "2026-02-01T10:35:00.000Z",
  "correlationId": "abc123-def456-ghi789"
}
```

#### 400 Bad Request - Currency Mismatch
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Currency mismatch. Expected: USD, Received: EUR",
  "timestamp": "2026-02-01T10:35:00.000Z",
  "correlationId": "abc123-def456-ghi789"
}
```

#### 404 Not Found - Transaction Not Found
```json
{
  "success": false,
  "error": "Transaction not found",
  "message": "Transaction not found: invalid-transaction-id",
  "timestamp": "2026-02-01T10:35:00.000Z",
  "correlationId": "abc123-def456-ghi789"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to record transaction",
  "timestamp": "2026-02-01T10:35:00.000Z",
  "correlationId": "abc123-def456-ghi789"
}
```

## Business Logic

### Transaction State Flow
1. **Find Transaction**: Locates the transaction by ID
2. **Validate State**: Ensures transaction can be recorded (not already completed/paid)
3. **Validate Data**: Checks currency matches and date format is valid
4. **Record Payment**: Updates transaction with payment details
5. **State Transition**: Moves transaction from INITIALIZED → PAID → COMPLETED
6. **Audit Logging**: Creates audit trail for the recording

### Validation Rules
- Transaction must exist and be in a recordable state
- Currency must match the original transaction currency
- Amount must be a valid positive number string
- Sender name must be 1-100 characters
- Sender phone must be 1-20 characters
- Payment date must be a valid ISO date string
- Duplicate recordings are prevented

### State Transitions
- **PENDING/INITIALIZED** → **PAID** → **COMPLETED**
- Once a transaction is **COMPLETED**, it cannot be recorded again
- If already **PAID**, duplicate recording is prevented

## Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const recordTransaction = async (transactionId, paymentDetails) => {
  try {
    const response = await axios.post(
      `http://localhost:4000/api/v1/record-transaction/${transactionId}`,
      {
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        senderName: paymentDetails.senderName,
        senderPhone: paymentDetails.senderPhone,
        paidAt: new Date().toISOString()
      }
    );
    
    console.log('Transaction recorded:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to record transaction:', error.response.data);
    throw error;
  }
};

// Usage
recordTransaction('507f1f77bcf86cd799439011', {
  amount: '150.75',
  currency: 'USD',
  senderName: 'John Smith',
  senderPhone: '+1-555-123-4567'
});
```

### cURL
```bash
curl -X POST http://localhost:4000/api/v1/record-transaction/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "150.75",
    "currency": "USD",
    "senderName": "John Smith",
    "senderPhone": "+1-555-123-4567",
    "paidAt": "2026-02-01T10:30:00.000Z"
  }'
```

## Security Considerations
- Validate all input data thoroughly
- Prevent duplicate recordings to avoid double-counting
- Log all recording attempts for audit purposes
- Ensure proper error handling to prevent information leakage

## Integration Notes
- This endpoint should be called after payment is confirmed through your payment processor
- The `paidAt` timestamp should reflect the actual payment completion time
- Consider implementing idempotency keys for additional duplicate protection
- Monitor for failed recordings and implement retry mechanisms if needed

## Testing
Run the test script to verify the endpoint functionality:
```bash
node test-record-transaction.js
```

This will test:
- Successful transaction recording
- Duplicate recording prevention
- Invalid transaction ID handling
- Validation error handling