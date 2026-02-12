# ChainPaye API Quick Reference

## Base URL
```
https://your-api-domain.com/api/v1
```

## Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| General API | 100 req | 15 min |
| Create Payment Link | 20 req | 10 min |
| Access Payment | 50 req | 5 min |
| Read Operations | 200 req | 15 min |

**Rate Limit Headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

## Quick Start

### 1. Create Payment Link
```bash
POST /payment-links
{
  "merchantId": "merchant-123",
  "userId": "user-456", 
  "name": "My Business",
  "amount": "100.00",
  "currency": "USD",
  "token": "USDT",
  "selectedCurrency": "USD",
  "paymentType": "card",
  "description": "Payment for services"
}
```

### 2. Access Payment Link
```bash
POST /payment-links/{id}/access
{
  "payerInfo": {
    "payername": "John Doe",
    "payerphone": "+1234567890"
  }
}
```

### 3. Record Transaction
```bash
POST /record-transaction/{transactionId}
{
  "amount": "100.00",
  "currency": "USD", 
  "senderName": "John Doe",
  "senderPhone": "+1234567890",
  "paidAt": "2026-02-04T10:00:00.000Z"
}
```

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Health & System** |
| GET | `/health` | API health check |
| **Payment Links** |
| POST | `/payment-links` | Create payment link |
| GET | `/payment-links/:id` | Get payment link |
| GET | `/payment-links` | List payment links |
| PATCH | `/payment-links/:id/disable` | Disable payment link |
| PATCH | `/payment-links/:id/enable` | Enable payment link |
| GET | `/payment-links/:id/status` | Get payment link status |
| GET | `/payment-links/:id/verify` | Verify payment link |
| POST | `/payment-links/:id/access` | Access payment link |
| POST | `/payment-links/:id` | Access payment link (alt) |
| GET | `/payment-links/:id/transactions` | Get link transactions |
| **Transactions** |
| POST | `/transactions` | Create transaction |
| GET | `/transactions/:id` | Get transaction |
| POST | `/transactions/:id/initialize` | Initialize payment |
| PATCH | `/transactions/:id/state` | Update transaction state |
| GET | `/transactions/:id/state-history` | Get state history |
| POST | `/record-transaction/:id` | Record transaction |
| **Direct Access** |
| GET | `/:id` | ChainPaye direct access |
| POST | `/:id` | ChainPaye direct access |

## Currency Support

| Currency | Code | Payment Types | Card Support |
|----------|------|---------------|--------------|
| Nigerian Naira | NGN | Bank only | ❌ |
| US Dollar | USD | Bank + Card | ✅ |
| British Pound | GBP | Bank + Card | ✅ |
| Euro | EUR | Bank + Card | ✅ |

## Transaction States

```
PENDING → INITIALIZED → PAID → COMPLETED
                           ↓
                    PAYOUT_FAILED
```

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 404 | Not Found |
| 500 | Server Error |

## Response Format
```json
{
  "success": boolean,
  "data": object,
  "message": "string",
  "timestamp": "ISO 8601",
  "correlationId": "string"
}
```

## Pagination Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (max: 100)
- `sortBy`: Sort field
- `sortOrder`: `asc` or `desc`

## Required Fields

### Create Payment Link
- `merchantId`, `userId`, `name`, `amount`, `currency`
- `token`, `selectedCurrency`, `paymentType`

### Record Transaction  
- `amount`, `currency`, `senderName`, `senderPhone`, `paidAt`

## Validation Rules

### Currency + Payment Type
- NGN + card = ❌ Invalid
- NGN + bank = ✅ Valid  
- USD/GBP/EUR + card = ✅ Valid
- USD/GBP/EUR + bank = ✅ Valid

### Amount Format
- Must be string (e.g., `"100.00"`)
- Max 4 decimal places
- Must be positive number

## Example Workflows

### Complete Payment Flow
1. **Create** payment link → Get `linkUrl`
2. **Share** `linkUrl` with customer
3. **Customer accesses** link → Creates transaction
4. **Customer pays** → External payment confirmation
5. **Record** transaction → Updates state to PAID
6. **System processes** → State becomes COMPLETED

### Error Handling
```javascript
try {
  const response = await fetch('/api/v1/payment-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    console.error('Error:', result.message);
    // Handle validation errors
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Testing Endpoints

### Health Check
```bash
curl https://your-api-domain.com/api/v1/health
```

### Create Test Payment Link
```bash
curl -X POST https://your-api-domain.com/api/v1/payment-links \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "test-merchant",
    "userId": "test-user", 
    "name": "Test Business",
    "amount": "10.00",
    "currency": "USD",
    "token": "USDT",
    "selectedCurrency": "USD",
    "paymentType": "card",
    "description": "Test payment"
  }'
```

## Environment Setup

### Required Environment Variables
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb://...
TORONET_API_URL=https://api.toronet.com
TORONET_ADMIN_ADDRESS=0x...
TORONET_ADMIN_PASSWORD=...
```

## Security Notes
- All endpoints currently public (add auth in production)
- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Monitor API usage

## Support
- Full documentation: `API_DOCUMENTATION.md`
- Currency guide: `CURRENCY_SUPPORT.md`
- Deployment guide: `DEPLOYMENT.md`