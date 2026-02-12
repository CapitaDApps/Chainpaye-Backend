# ChainPaye Payment Link API - Usage Examples

## Create Payment Link with Business Name

### Request
```bash
POST /api/v1/payment-links
Content-Type: application/json

{
  "merchantId": "merchant-123",
  "userId": "user-456",
  "name": "ChainPaye Solutions Ltd",
  "amount": "250.00",
  "currency": "USD",
  "token": "USDT",
  "selectedCurrency": "USD",
  "paymentType": "card",
  "description": "Professional services payment"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "merchantId": "merchant-123",
    "userId": "user-456",
    "name": "ChainPaye Solutions Ltd",
    "amount": "250.00",
    "currency": "USD",
    "description": "Professional services payment",
    "isActive": true,
    "address": "0101848843_8fea8a2360cc92478a017fdb637ec6d2",
    "token": "USDT",
    "selectedCurrency": "USD",
    "paymentType": "card",
    "successUrl": "https://chainpaye.com/",
    "linkUrl": "https://chainpaye.com/payment/507f1f77bcf86cd799439011",
    "metadata": {},
    "createdAt": "2026-02-01T04:15:00.000Z",
    "updatedAt": "2026-02-01T04:15:00.000Z"
  },
  "message": "Payment link created successfully",
  "timestamp": "2026-02-01T04:15:00.000Z",
  "correlationId": "abc123-def456"
}
```

## Verify Payment Link (includes business name)

### Request
```bash
GET /api/v1/payment-links/507f1f77bcf86cd799439011/verify
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "isActive": true,
    "name": "ChainPaye Solutions Ltd",
    "address": "0101848843_8fea8a2360cc92478a017fdb637ec6d2",
    "token": "USDT",
    "currency": "USD",
    "selectedCurrency": "USD",
    "paymentType": "card",
    "amount": "250.00",
    "description": "Professional services payment",
    "successUrl": "https://chainpaye.com/"
  },
  "correlationId": "xyz789-abc123"
}
```

## Access Payment Link (includes business name in response)

### Request
```bash
POST /api/v1/payment-links/507f1f77bcf86cd799439011/access
Content-Type: application/json

{
  "payerInfo": {
    "payername": "John Smith",
    "payeraddress": "123 Business Street",
    "payercity": "New York",
    "payerstate": "NY",
    "payercountry": "US",
    "payerphone": "1234567890"
  }
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "ChainPaye Solutions Ltd",
    "amount": "250.00",
    "currency": "USD",
    "selectedCurrency": "USD",
    "description": "Professional services payment",
    "address": "0101848843_8fea8a2360cc92478a017fdb637ec6d2",
    "token": "USDT",
    "paymentType": "card",
    "successUrl": "https://chainpaye.com/",
    "linkUrl": "https://chainpaye.com/payment/507f1f77bcf86cd799439011",
    "toronetReference": "toro_ref_123456",
    "transactionId": "trans_789012",
    "paymentInitialization": {
      "id": "init_345678",
      "status": "SUCCESS",
      "toronetResponse": {
        "success": true,
        "txid": "toro_ref_123456"
      }
    }
  },
  "message": "Payment link accessed and initialized successfully",
  "correlationId": "def456-ghi789"
}
```

## Business Name Examples

The `name` field can be used for various types of businesses:

### E-commerce Store
```json
{
  "name": "TechGadgets Online Store",
  "description": "iPhone 15 Pro Max purchase"
}
```

### Professional Services
```json
{
  "name": "Smith & Associates Law Firm",
  "description": "Legal consultation services"
}
```

### Local Business
```json
{
  "name": "Joe's Coffee Shop",
  "description": "Monthly coffee subscription"
}
```

### Freelancer
```json
{
  "name": "Sarah Johnson - Web Designer",
  "description": "Website design project"
}
```

## Validation Rules for Name Field

- **Required**: Yes
- **Type**: String
- **Min Length**: 1 character
- **Max Length**: 100 characters
- **Trimmed**: Yes (leading/trailing spaces removed)

## Use Cases

1. **Brand Recognition**: Display your business name to customers
2. **Trust Building**: Show professional business identity
3. **Invoice Clarity**: Clear identification of payment recipient
4. **Customer Experience**: Personalized payment experience
5. **Record Keeping**: Better transaction tracking and reporting

The name field will be displayed to customers when they access the payment link, helping them identify who they're paying and building trust in the transaction.

## Create Payment Link with GBP Currency

### Request
```bash
POST /api/v1/payment-links
Content-Type: application/json

{
  "merchantId": "merchant-uk-123",
  "userId": "user-uk-456",
  "name": "London Tech Services",
  "amount": "150.00",
  "currency": "GBP",
  "token": "USDT",
  "selectedCurrency": "GBP",
  "paymentType": "card",
  "description": "UK consulting services"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439022",
    "merchantId": "merchant-uk-123",
    "userId": "user-uk-456",
    "name": "London Tech Services",
    "amount": "150.00",
    "currency": "GBP",
    "description": "UK consulting services",
    "isActive": true,
    "address": "0x3c45e44daae997b3ac8644ff3fdd13c120634f10",
    "token": "USDT",
    "selectedCurrency": "GBP",
    "paymentType": "card",
    "successUrl": "https://chainpaye.com/",
    "linkUrl": "https://chainpaye.com/payment/507f1f77bcf86cd799439022",
    "metadata": {},
    "createdAt": "2026-02-04T02:15:00.000Z",
    "updatedAt": "2026-02-04T02:15:00.000Z"
  },
  "message": "Payment link created successfully",
  "timestamp": "2026-02-04T02:15:00.000Z",
  "correlationId": "gbp123-def456"
}
```

## Create Payment Link with EUR Currency

### Request
```bash
POST /api/v1/payment-links
Content-Type: application/json

{
  "merchantId": "merchant-eu-123",
  "userId": "user-eu-456",
  "name": "Berlin Digital Agency",
  "amount": "200.00",
  "currency": "EUR",
  "token": "USDT",
  "selectedCurrency": "EUR",
  "paymentType": "card",
  "description": "European digital marketing services"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439033",
    "merchantId": "merchant-eu-123",
    "userId": "user-eu-456",
    "name": "Berlin Digital Agency",
    "amount": "200.00",
    "currency": "EUR",
    "description": "European digital marketing services",
    "isActive": true,
    "address": "0x3c45e44daae997b3ac8644ff3fdd13c120634f10",
    "token": "USDT",
    "selectedCurrency": "EUR",
    "paymentType": "card",
    "successUrl": "https://chainpaye.com/",
    "linkUrl": "https://chainpaye.com/payment/507f1f77bcf86cd799439033",
    "metadata": {},
    "createdAt": "2026-02-04T02:15:00.000Z",
    "updatedAt": "2026-02-04T02:15:00.000Z"
  },
  "message": "Payment link created successfully",
  "timestamp": "2026-02-04T02:15:00.000Z",
  "correlationId": "eur123-def456"
}
```

## Supported Currencies and Payment Types

| Currency | Code | Payment Types | Notes |
|----------|------|---------------|-------|
| Nigerian Naira | NGN | Bank transfer only | Local bank transfers |
| US Dollar | USD | Card payments | Credit/debit cards supported |
| British Pound | GBP | Card payments | Credit/debit cards supported |
| Euro | EUR | Card payments | Credit/debit cards supported |

### Payment Type Rules
- **NGN**: Must use `"paymentType": "bank"` (card payments not supported)
- **USD, GBP, EUR**: Can use `"paymentType": "card"` (recommended) or `"paymentType": "bank"`
- Invalid combinations will return a validation error

### Example Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Card payments are supported for USD, GBP, EUR. NGN must use bank transfer.",
  "timestamp": "2026-02-04T02:15:00.000Z",
  "correlationId": "error123-def456"
}
```