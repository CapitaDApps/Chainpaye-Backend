# Rate Limiting Documentation

## Overview

ChainPaye API implements comprehensive rate limiting to protect against abuse, ensure fair usage, and maintain service stability. Rate limits are applied at multiple levels with different restrictions based on endpoint sensitivity and operation type.

## Rate Limiting Strategy

### Multi-Layer Protection

1. **Burst Protection** - Prevents rapid-fire requests
2. **General Rate Limiting** - Applies to all API endpoints
3. **Endpoint-Specific Limits** - Tailored limits for different operations
4. **Custom Key-Based Limits** - Per-user or per-merchant limits (optional)

## Rate Limit Configuration

### 1. Burst Protection
- **Window**: 1 minute
- **Limit**: 20 requests per minute
- **Applies to**: All endpoints
- **Purpose**: Prevent rapid-fire attacks

### 2. General API Rate Limit
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Applies to**: All API endpoints
- **Purpose**: General protection against abuse

### 3. Payment Link Creation
- **Window**: 10 minutes
- **Limit**: 20 creations per IP
- **Applies to**: `POST /api/v1/payment-links`
- **Purpose**: Prevent spam payment link creation

### 4. Payment Link Access
- **Window**: 5 minutes
- **Limit**: 50 accesses per IP
- **Applies to**: 
  - `GET /payment/:id` (ChainPaye direct access)
  - `POST /payment/:id` (ChainPaye direct access)
- **Purpose**: Prevent payment link enumeration attacks

### 5. Transaction Recording
- **Window**: 5 minutes
- **Limit**: 30 recordings per IP
- **Applies to**:
  - `POST /api/v1/transactions`
  - `POST /api/v1/transactions/:id/initialize`
- **Purpose**: Prevent transaction spam

### 6. Read Operations
- **Window**: 15 minutes
- **Limit**: 200 requests per IP
- **Applies to**:
  - `GET /api/v1/payment-links`
  - `GET /api/v1/payment-links/:id`
  - `GET /api/v1/transactions/:id`
  - `GET /api/v1/transactions/:id/state-history`
- **Purpose**: Allow higher limits for read-only operations

### 7. Sensitive Operations
- **Window**: 30 minutes
- **Limit**: 10 operations per IP
- **Applies to**:
  - `PATCH /api/v1/payment-links/:id/enable`
  - `PATCH /api/v1/payment-links/:id/disable`
  - `PATCH /api/v1/transactions/:id/state`
- **Purpose**: Strict control over state-changing operations

### 8. Health Checks
- **Window**: 1 minute
- **Limit**: 60 requests per IP
- **Applies to**: Health check endpoints
- **Purpose**: Allow monitoring without hitting limits

## Rate Limit Headers

All responses include standard rate limit headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1643723400
```

## Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes",
  "timestamp": "2026-02-07T12:00:00.000Z",
  "correlationId": "rate-limit-exceeded"
}
```

**HTTP Status Code**: `429 Too Many Requests`

## Endpoint-Specific Rate Limits

### Payment Link Endpoints

| Endpoint | Method | Rate Limit | Window |
|----------|--------|------------|--------|
| `/api/v1/payment-links` | POST | 20 | 10 min |
| `/api/v1/payment-links` | GET | 200 | 15 min |
| `/api/v1/payment-links/:id` | GET | 200 | 15 min |
| `/api/v1/payment-links/:id/verify` | GET | 200 | 15 min |
| `/api/v1/payment-links/:id/access` | GET | 200 | 15 min |
| `/api/v1/payment-links/:id/enable` | PATCH | 10 | 30 min |
| `/api/v1/payment-links/:id/disable` | PATCH | 10 | 30 min |

### Transaction Endpoints

| Endpoint | Method | Rate Limit | Window |
|----------|--------|------------|--------|
| `/api/v1/transactions` | POST | 30 | 5 min |
| `/api/v1/transactions/:id` | GET | 200 | 15 min |
| `/api/v1/transactions/:id/initialize` | POST | 30 | 5 min |
| `/api/v1/transactions/:id/state` | PATCH | 10 | 30 min |
| `/api/v1/transactions/:id/state-history` | GET | 200 | 15 min |

### ChainPaye Direct Access

| Endpoint | Method | Rate Limit | Window |
|----------|--------|------------|--------|
| `/payment/:id` | GET | 50 | 5 min |
| `/payment/:id` | POST | 50 | 5 min |

## Best Practices

### For API Consumers

1. **Implement Exponential Backoff**: When you receive a 429 response, wait before retrying
2. **Monitor Rate Limit Headers**: Track remaining requests to avoid hitting limits
3. **Cache Responses**: Cache GET requests when possible to reduce API calls
4. **Batch Operations**: Group multiple operations when the API supports it
5. **Use Webhooks**: Instead of polling, use webhooks for status updates (when available)

### Handling Rate Limits

```javascript
async function makeApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = response.headers.get('RateLimit-Reset');
      
      console.log(`Rate limit exceeded. Retry after: ${data.retryAfter}`);
      
      // Implement exponential backoff
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
      return makeApiRequest(url, options); // Retry
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

### Monitoring Rate Limits

```javascript
function checkRateLimitHeaders(response) {
  const limit = response.headers.get('RateLimit-Limit');
  const remaining = response.headers.get('RateLimit-Remaining');
  const reset = response.headers.get('RateLimit-Reset');
  
  console.log(`Rate Limit: ${remaining}/${limit} remaining`);
  console.log(`Resets at: ${new Date(reset * 1000).toISOString()}`);
  
  // Alert if approaching limit
  if (parseInt(remaining) < parseInt(limit) * 0.1) {
    console.warn('Approaching rate limit!');
  }
}
```

## Advanced Rate Limiting (Optional)

### Per-User Rate Limiting

For authenticated requests, you can implement per-user rate limiting:

```typescript
import { userRateLimit } from './middleware/rateLimiter';

// Apply to authenticated routes
router.post('/api/v1/payment-links', 
  authenticate, 
  userRateLimit, 
  createPaymentLink
);
```

### Per-Merchant Rate Limiting

For multi-tenant scenarios:

```typescript
import { merchantRateLimit } from './middleware/rateLimiter';

// Apply to merchant-specific routes
router.post('/api/v1/payment-links', 
  authenticate, 
  merchantRateLimit, 
  createPaymentLink
);
```

## Testing Rate Limits

### Test Script Example

```javascript
const axios = require('axios');

async function testRateLimit() {
  const baseUrl = 'http://localhost:4000';
  let successCount = 0;
  let rateLimitCount = 0;
  
  console.log('Testing rate limit...');
  
  for (let i = 0; i < 25; i++) {
    try {
      const response = await axios.post(`${baseUrl}/api/v1/payment-links`, {
        userId: 'test-user',
        address: '0x1234567890123456789012345678901234567890',
        token: 'USDC',
        amount: '100.00',
        selectedCurrency: 'USD',
        paymentType: 'card',
        successUrl: 'https://example.com/success'
      });
      
      successCount++;
      console.log(`Request ${i + 1}: Success`);
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitCount++;
        console.log(`Request ${i + 1}: Rate limited`);
      } else {
        console.log(`Request ${i + 1}: Error - ${error.message}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nResults:`);
  console.log(`Successful: ${successCount}`);
  console.log(`Rate Limited: ${rateLimitCount}`);
}

testRateLimit();
```

## Troubleshooting

### Common Issues

1. **Hitting Rate Limits Too Quickly**
   - Solution: Implement request throttling on the client side
   - Check if you're making unnecessary duplicate requests

2. **Rate Limits in Development**
   - Solution: Rate limits apply in all environments
   - Consider increasing limits for development (modify `rateLimiter.ts`)

3. **Shared IP Addresses**
   - Issue: Multiple users behind the same IP (NAT, proxy)
   - Solution: Implement authentication-based rate limiting

4. **Load Balancer/Proxy Issues**
   - Ensure `X-Forwarded-For` header is properly set
   - Configure Express to trust proxy: `app.set('trust proxy', 1)`

## Configuration

Rate limits are configured in `src/middleware/rateLimiter.ts`. To modify:

```typescript
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // Adjust window
  max: 100, // Adjust limit
  // ... other options
});
```

## Monitoring and Alerts

### Recommended Monitoring

1. **Track 429 Responses**: Monitor rate limit exceeded events
2. **Alert on Patterns**: Detect potential abuse or attacks
3. **Usage Analytics**: Understand API usage patterns
4. **Performance Impact**: Monitor rate limiter performance

### Logging

All rate limit events are logged with correlation IDs for tracking:

```
Rate limit exceeded: correlationId=abc-123, ip=192.168.1.1, endpoint=/api/v1/payment-links
```

## Security Considerations

1. **DDoS Protection**: Rate limiting provides basic DDoS protection
2. **Brute Force Prevention**: Limits prevent brute force attacks
3. **Resource Protection**: Prevents resource exhaustion
4. **Fair Usage**: Ensures fair access for all users

## Future Enhancements

Potential improvements to consider:

1. **Redis-Based Rate Limiting**: For distributed systems
2. **Dynamic Rate Limits**: Adjust based on system load
3. **Tiered Rate Limits**: Different limits for different user tiers
4. **Geographic Rate Limits**: Different limits by region
5. **Endpoint-Specific Keys**: Rate limit by API key instead of IP

## Support

For questions or issues related to rate limiting:
- Check rate limit headers in responses
- Review this documentation
- Contact support with correlation IDs from error responses
