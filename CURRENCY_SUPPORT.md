# Currency Support

## Supported Currencies

The ChainPaye Payment Link API now supports four currencies:

| Currency | Code | Name | Payment Methods | Status |
|----------|------|------|-----------------|--------|
| 🇳🇬 Nigerian Naira | `NGN` | Nigerian Naira | Bank transfer only | ✅ Active |
| 🇺🇸 US Dollar | `USD` | United States Dollar | Card payments, Bank transfer | ✅ Active |
| 🇬🇧 British Pound | `GBP` | British Pound Sterling | Card payments, Bank transfer | ✅ Active |
| 🇪🇺 Euro | `EUR` | Euro | Card payments, Bank transfer | ✅ Active |

## Payment Method Rules

### NGN (Nigerian Naira)
- **Supported Payment Types**: `bank` only
- **Restriction**: Card payments are not supported for NGN
- **Reason**: Local banking regulations and infrastructure

```json
{
  "currency": "NGN",
  "paymentType": "bank"  // ✅ Valid
}
```

```json
{
  "currency": "NGN",
  "paymentType": "card"  // ❌ Invalid - will return validation error
}
```

### USD, GBP, EUR (International Currencies)
- **Supported Payment Types**: `card` (recommended), `bank`
- **Card Payments**: Credit/debit cards supported
- **Bank Transfers**: Also available as alternative

```json
{
  "currency": "USD",
  "paymentType": "card"  // ✅ Valid (recommended)
}
```

```json
{
  "currency": "GBP",
  "paymentType": "bank"  // ✅ Valid (alternative)
}
```

## API Examples

### Create NGN Payment Link
```bash
POST /api/v1/payment-links
{
  "merchantId": "merchant-ng-123",
  "userId": "user-ng-456",
  "name": "Lagos Tech Hub",
  "amount": "50000.00",
  "currency": "NGN",
  "token": "NGN",
  "selectedCurrency": "NGN",
  "paymentType": "bank",
  "description": "Nigerian local payment"
}
```

### Create GBP Payment Link
```bash
POST /api/v1/payment-links
{
  "merchantId": "merchant-uk-123",
  "userId": "user-uk-456",
  "name": "London Services Ltd",
  "amount": "150.00",
  "currency": "GBP",
  "token": "USDT",
  "selectedCurrency": "GBP",
  "paymentType": "card",
  "description": "UK consulting services"
}
```

### Create EUR Payment Link
```bash
POST /api/v1/payment-links
{
  "merchantId": "merchant-eu-123",
  "userId": "user-eu-456",
  "name": "Berlin Digital GmbH",
  "amount": "200.00",
  "currency": "EUR",
  "token": "USDT",
  "selectedCurrency": "EUR",
  "paymentType": "card",
  "description": "European digital services"
}
```

## Validation Rules

### Currency Validation
- Must be one of: `NGN`, `USD`, `GBP`, `EUR`
- Case-sensitive (must be uppercase)
- Invalid currencies will return HTTP 400 with validation error

### Payment Type Validation
- NGN + card = ❌ Invalid
- NGN + bank = ✅ Valid
- USD/GBP/EUR + card = ✅ Valid
- USD/GBP/EUR + bank = ✅ Valid

### Error Responses

#### Invalid Currency
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Body: Currency must be one of: NGN, USD, GBP, EUR",
  "timestamp": "2026-02-04T02:15:00.000Z"
}
```

#### Invalid Payment Type Combination
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Card payments are supported for USD, GBP, EUR. NGN must use bank transfer.",
  "timestamp": "2026-02-04T02:15:00.000Z"
}
```

## Implementation Notes

### Database Schema
All currency fields in the database support the four currencies:
- PaymentLink model
- Transaction model
- FiatVerification model
- Payout model

### Type Safety
TypeScript interfaces ensure type safety:
```typescript
type SupportedCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR';
```

### Backward Compatibility
- Existing NGN and USD payment links continue to work
- No breaking changes to existing API endpoints
- All existing functionality preserved

## Regional Considerations

### NGN (Nigeria)
- Optimized for Nigerian banking system
- Supports local bank transfers
- Compliant with CBN regulations

### USD (United States)
- Global standard currency
- Wide card payment acceptance
- International transactions supported

### GBP (United Kingdom)
- UK and Commonwealth markets
- FCA compliant payment processing
- Sterling-based transactions

### EUR (European Union)
- EU/EEA market coverage
- SEPA payment support
- PSD2 compliant processing

## Testing

Use the provided test scripts to verify currency support:

```bash
# Test all currencies
node test-new-currencies.js

# Comprehensive testing
node test-currency-comprehensive.js
```

## Future Enhancements

Potential future currency additions:
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- JPY (Japanese Yen)
- CHF (Swiss Franc)

Contact the development team to request additional currency support.