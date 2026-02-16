# Two-Phase Payment Verification System

## Overview

The Two-Phase Payment Verification System provides fast user feedback through immediate verification (3-second checks for 15 minutes) followed by background verification (hourly checks for up to 24 hours). This approach ensures most payments are confirmed within seconds while handling edge cases where bank processing takes hours.

## Features

- ✅ **Immediate Verification**: 3-second checks for 15 minutes after user confirmation
- ✅ **Background Verification**: Hourly checks for delayed payments
- ✅ **Email Notifications**: Confirmation and expiration emails with HTML templates
- ✅ **Webhook Integration**: Real-time merchant notifications
- ✅ **24-Hour Timeout**: Automatic expiration handling
- ✅ **Atomic Updates**: Race condition prevention between verification phases
- ✅ **Comprehensive Logging**: Full audit trail of all verification activities

## Verification Strategy

### Phase 1: Immediate Verification (0-15 minutes)
- **Trigger**: User clicks "I've sent the money" via `/verify` endpoint
- **Frequency**: Every 3 seconds
- **Duration**: 15 minutes maximum
- **Purpose**: Fast feedback for payments that confirm quickly (majority of cases)

### Phase 2: Background Verification (15 min - 24 hours)
- **Trigger**: Automatic cron job
- **Frequency**: Every 1 hour
- **Duration**: Until confirmed or 24 hours expire
- **Purpose**: Handle delayed bank confirmations and edge cases

### Phase 3: Expiration (After 24 hours)
- **Action**: Mark transaction as PAYOUT_FAILED
- **Notification**: Send expiration email to user
- **Fallback**: User can contact support with proof of payment

## Architecture

### Components

1. **Verification Service** (`src/services/verification.service.ts`)
   - Shared verification logic for both immediate and background phases
   - Toronet API integration with proper error handling
   - Atomic transaction updates to prevent race conditions

2. **Immediate Verification** (`src/routes/transactions.ts`)
   - `/verify` endpoint that starts 3-second verification checks
   - Runs for 15 minutes maximum per transaction
   - Stops automatically when payment confirmed or time expires

3. **Background Verification Service** (`src/services/verify-pending-transactions.ts`)
   - Hourly cron job for transactions past immediate verification phase
   - Handles expired transactions and cleanup
   - Continues until payment confirmed or 24-hour timeout

4. **EmailService** (`src/services/email.service.ts`)
   - Sends confirmation and expiration emails using Nodemailer
   - Professional HTML templates with ChainPaye branding

5. **Transaction Model Updates** (`src/models/Transaction.ts`)
   - Added `verificationStartedAt` field to track verification phase
   - Enhanced `lastVerificationCheck` and `expiresAt` fields

## Database Schema Changes

### Transaction Model

```typescript
// New fields added to Transaction schema
verificationStartedAt: {
  type: Date,
  index: true,
}
lastVerificationCheck: {
  type: Date,
  index: true,
}
expiresAt: {
  type: Date,
  index: true,
  default: function() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from creation
  }
}
```

## API Changes

### New Verification Endpoint

**Endpoint**: `POST /api/v1/transactions/:reference/verify`

**Headers**:
```
admin: your_admin_address
adminpwd: your_admin_password
```

**Request Body**:
```json
{
  "senderName": "John Doe",
  "senderPhone": "+1234567890",
  "senderEmail": "john.doe@example.com",
  "currency": "USD",
  "txid": "toro_ref_123456",
  "paymentType": "card",
  "amount": "250.00",
  "successUrl": "https://merchant.com/webhook",
  "paymentLinkId": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification started. You will receive an email confirmation when payment is confirmed.",
  "data": {
    "transactionId": "TXN_REF_123",
    "email": "john.doe@example.com",
    "verificationPhase": "immediate",
    "checkInterval": "3 seconds",
    "duration": "15 minutes"
  }
}
```

## Two-Phase Verification Process

### 1. Transaction Lifecycle

```
PENDING → (User clicks "I've sent money") → /verify endpoint called
   ↓
Phase 1: Immediate Verification (0-15 min, every 3 seconds)
   ↓
Phase 2: Background Verification (15 min - 24 hours, every 1 hour)
   ↓
PAID → COMPLETED (or PAYOUT_FAILED after 24 hours)
```

### 2. Immediate Verification Flow (Phase 1)

1. **User Action**: Clicks "I've sent the money" button
2. **API Call**: Frontend calls `POST /transactions/:reference/verify`
3. **Verification Start**: 
   - Saves payment details and Toronet reference
   - Sets `verificationStartedAt` timestamp
   - Starts 3-second interval checks
4. **Checking Process**:
   - Calls Toronet API every 3 seconds
   - Continues for maximum 15 minutes
   - Stops when payment confirmed or time expires
5. **On Confirmation**: Updates transaction, sends email, calls webhook

### 3. Background Verification Flow (Phase 2)

1. **Cron Job**: Runs every 1 hour
2. **Transaction Selection**: 
   - Finds PENDING transactions with `verificationStartedAt` > 15 minutes ago
   - Excludes expired transactions (> 24 hours)
3. **Verification Process**:
   - Calls Toronet API for each transaction
   - Updates `lastVerificationCheck` timestamp
   - Handles confirmations and expirations
4. **Continuation**: Repeats until payment confirmed or expired

### 4. Expiration Handling (Phase 3)

1. **Detection**: Transactions with `expiresAt` < current time
2. **State Update**: Changes state to PAYOUT_FAILED
3. **Notification**: Sends expiration email to user
4. **Audit**: Logs expiration event for tracking

### 3. Toronet API Integration

**Endpoint**: `POST https://www.toronet.org/api/payment/toro/`

**Request**:
```json
{
  "op": "recordfiattransaction",
  "params": ["USD", "transaction_reference", "card"]
}
```

**Headers**:
```
admin: your_admin_address
adminpwd: your_admin_password
```

## Email Notifications

### Confirmation Email

**Trigger**: When payment is confirmed via background verification
**Recipient**: `transaction.payerInfo.email`
**Subject**: "Payment Confirmed - Transaction #{transactionId}"

**Content**:
- ✅ Success icon and confirmation message
- Transaction details table (ID, amount, merchant, reference, confirmed time)
- Thank you message and support contact
- ChainPaye branding

### Expiration Email

**Trigger**: When transaction expires after 24 hours
**Recipient**: `transaction.payerInfo.email`
**Subject**: "Payment Verification Pending - Action Required"

**Content**:
- ⏰ Warning icon and timeout message
- Transaction details and next steps
- Contact support button
- ChainPaye branding

## Webhook Integration

### Merchant Notification

When a payment is confirmed, the system sends a POST request to the payment link's `successUrl`:

**Webhook Payload**:
```json
{
  "event": "payment.confirmed",
  "transaction": {
    "id": "trans_123",
    "reference": "TXN_REF_123",
    "amount": "250.00",
    "currency": "USD",
    "state": "PAID",
    "paidAt": "2026-02-04T09:35:00.000Z",
    "payerInfo": {
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1234567890"
    }
  },
  "paymentLink": {
    "id": "link_123",
    "merchantId": "merchant_123",
    "name": "My Business"
  },
  "timestamp": "2026-02-04T09:35:00.000Z"
}
```

**Headers**:
```
Content-Type: application/json
User-Agent: ChainPaye-Webhook/1.0
```

## Environment Configuration

### Required Environment Variables

```env
# Existing Toronet Configuration
TORONET_ADMIN=your_admin_address
TORONET_ADMIN_PWD=your_admin_password

# Nodemailer SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@chainpaye.com

# Support Configuration
SUPPORT_EMAIL=support@chainpaye.com
```

### Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Copy the generated 16-character password
3. **Configure Environment**:
   - Set `SMTP_USER` to your Gmail address
   - Set `SMTP_PASS` to the generated app password

## Service Management

### Starting the Service

The background verification service starts automatically when the server starts:

```typescript
// In src/server.ts
import { startPaymentVerification } from "./services/verify-pending-transactions";

// After database connection
startPaymentVerification();
```

### Stopping the Service

The service stops gracefully during server shutdown:

```typescript
// In src/server.ts
import { stopPaymentVerification } from "./services/verify-pending-transactions";

// During graceful shutdown
stopPaymentVerification();
```

### Service Status

Check if the service is running:

```typescript
import { paymentVerificationService } from "./services/verify-pending-transactions";

const status = paymentVerificationService.getStatus();
console.log('Service running:', status.isRunning);
```

## Testing

### Test Scripts

1. **Full Background Verification Test**:
   ```bash
   node test-background-verification.js
   ```

2. **Email Configuration Test**:
   ```bash
   node test-background-verification.js email
   ```

3. **Monitor Pending Transactions**:
   ```bash
   node test-background-verification.js monitor
   ```

### Manual Testing Checklist

- [ ] Email saves correctly in `payerInfo.email`
- [ ] Cron job fetches PENDING transactions
- [ ] Toronet API is called with correct parameters
- [ ] `lastVerificationCheck` updates after each check
- [ ] State updates to PAID when confirmed
- [ ] Success URL receives POST with correct data
- [ ] Confirmation email sends successfully
- [ ] Expired transactions are handled after 24 hours
- [ ] Expiration email sends successfully

## Monitoring and Logging

### Console Logs

The service provides detailed console logging:

```
🚀 Starting payment verification service...
🔍 Starting payment verification at 2026-02-04T10:00:00.000Z
📋 Found 3 transactions to verify
🔍 Verifying transaction trans_123...
✅ Payment confirmed for transaction trans_123
📡 Webhook sent successfully to https://merchant.com/webhook (status: 200)
📧 Confirmation email sent successfully to user@example.com
✅ Verification completed in 1250ms
📊 Results: 3 verified, 1 confirmed, 0 errors
```

### Audit Trail

All verification activities are logged to the audit system:

- `VERIFICATION_ERROR`: When verification fails
- `PAYMENT_CONFIRMED`: When payment is confirmed
- `TRANSACTION_EXPIRED`: When transaction expires
- `WEBHOOK_SENT`: When webhook is sent successfully
- `WEBHOOK_FAILED`: When webhook fails

## Error Handling

### Graceful Error Handling

- **Toronet API errors**: Logged but don't stop processing other transactions
- **Email failures**: Logged but don't block the confirmation flow
- **Webhook failures**: Logged but don't block the confirmation flow
- **Database errors**: Logged and may stop processing to prevent data corruption

### Retry Logic

- **Verification**: Continues every 5 minutes until payment confirmed or expired
- **Webhooks**: Single attempt (merchant should implement idempotency)
- **Emails**: Single attempt (can be manually resent if needed)

## Performance Considerations

### Database Indexes

The following indexes are automatically created:

```javascript
// Transaction indexes for efficient querying
{ state: 1, expiresAt: 1 }           // Find pending non-expired transactions
{ lastVerificationCheck: 1 }         // Find transactions needing verification
{ expiresAt: 1 }                     // Find expired transactions
```

### Query Optimization

The service uses optimized queries to minimize database load:

```javascript
// Efficient query for pending transactions
{
  state: 'PENDING',
  expiresAt: { $gt: new Date() },
  $or: [
    { lastVerificationCheck: { $lt: fiveMinutesAgo } },
    { lastVerificationCheck: { $exists: false } }
  ]
}
```

## Security Considerations

### API Security

- **Toronet API**: Uses admin credentials (secure these properly)
- **Webhooks**: Use HTTPS endpoints and implement signature verification
- **Email**: Use app passwords, not account passwords

### Data Privacy

- **Email Storage**: Emails are stored in existing `payerInfo.email` field
- **Audit Logs**: Sensitive data is not logged in audit trails
- **Webhook Data**: Only necessary transaction data is sent

## Troubleshooting

### Common Issues

1. **Service Not Starting**:
   - Check database connection
   - Verify environment variables
   - Check console logs for errors

2. **Emails Not Sending**:
   - Verify SMTP configuration
   - Check Gmail app password setup
   - Test email service connection

3. **Webhooks Failing**:
   - Verify merchant endpoint is accessible
   - Check webhook URL format
   - Review webhook logs in audit trail

4. **Transactions Not Updating**:
   - Check Toronet API credentials
   - Verify transaction references
   - Review API response logs

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

This provides additional debug information in console logs.

## Future Enhancements

### Planned Features

- [ ] **Retry Logic**: Configurable retry attempts for failed webhooks
- [ ] **Email Templates**: Customizable email templates per merchant
- [ ] **Webhook Signatures**: HMAC signature verification for webhooks
- [ ] **Rate Limiting**: Configurable verification intervals
- [ ] **Dashboard**: Admin interface to monitor verification status
- [ ] **Metrics**: Prometheus metrics for monitoring
- [ ] **Alerting**: Slack/email alerts for system issues

### Configuration Options

Future versions may include:

```env
# Verification Configuration
VERIFICATION_INTERVAL_MINUTES=5
TRANSACTION_TIMEOUT_HOURS=24
MAX_VERIFICATION_ATTEMPTS=288  # 24 hours / 5 minutes

# Webhook Configuration
WEBHOOK_TIMEOUT_SECONDS=10
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_SIGNATURE_SECRET=your-secret-key

# Email Configuration
EMAIL_TEMPLATE_PATH=./templates/emails/
EMAIL_RETRY_ATTEMPTS=2
```

## Support

For issues or questions about the background verification system:

- **Email**: support@chainpaye.com
- **Documentation**: This file and API_DOCUMENTATION.md
- **Test Scripts**: Use provided test scripts for debugging
- **Audit Logs**: Check audit trail for detailed operation history