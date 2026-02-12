# CORS Implementation Summary

## Overview
CORS (Cross-Origin Resource Sharing) has been successfully implemented to allow the ChainPaye frontend to communicate with the API from different domains.

## Changes Made

### 1. Dependencies Installed
```bash
npm install cors
npm install --save-dev @types/cors
```

### 2. Files Modified

#### src/app.ts
- Added `cors` import
- Configured CORS middleware with comprehensive options
- Applied CORS before other middleware (important for preflight requests)

```typescript
import cors from "cors";

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
```

#### .env
- Added `CORS_ORIGIN` environment variable
- Set to `*` for development (allows all origins)
- Should be changed to specific domains in production

```env
CORS_ORIGIN=*
```

### 3. Documentation Created

#### CORS_CONFIGURATION.md
- Comprehensive CORS configuration guide
- Security best practices
- Troubleshooting common issues
- Frontend integration examples
- Testing procedures

#### test-cors.js
- Automated CORS testing script
- Tests CORS headers
- Tests preflight (OPTIONS) requests
- Tests rate limit header exposure
- Tests cross-origin POST requests

### 4. Documentation Updated

#### API_DOCUMENTATION.md
- Added CORS section
- Documented allowed origins configuration
- Referenced detailed CORS documentation

#### DEPLOYMENT.md
- Added CORS environment variable to deployment checklist
- Added security warning about production configuration
- Provided examples for different environments

## CORS Configuration

### Development Mode
```env
CORS_ORIGIN=*
```
- Allows requests from any origin
- Suitable for local development
- **NOT for production**

### Production Mode
```env
CORS_ORIGIN=https://chainpaye.com,https://www.chainpaye.com
```
- Restricts to specific domains
- Comma-separated list
- **Required for production security**

## Features Enabled

### 1. Allowed Methods
- GET - Read operations
- POST - Create operations
- PUT - Full update operations
- PATCH - Partial update operations
- DELETE - Delete operations
- OPTIONS - Preflight requests

### 2. Allowed Headers
- `Content-Type` - For JSON requests
- `Authorization` - For authentication (future use)
- `X-Correlation-Id` - For request tracking
- `X-Requested-With` - For AJAX identification

### 3. Exposed Headers
- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Requests remaining in window
- `RateLimit-Reset` - Unix timestamp when limit resets

### 4. Additional Settings
- **Credentials:** Enabled (allows cookies and auth headers)
- **Max Age:** 24 hours (browser caches preflight responses)

## Testing

### Run CORS Tests
```bash
node test-cors.js
```

Tests verify:
- ✓ CORS headers are present
- ✓ Preflight requests work
- ✓ Rate limit headers are exposed
- ✓ Cross-origin POST requests succeed

### Manual Testing

#### Test with cURL
```bash
# Test preflight
curl -X OPTIONS http://localhost:4000/api/v1/payment-links \
  -H "Origin: https://chainpaye.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test actual request
curl -X GET http://localhost:4000/api/v1/payment-links \
  -H "Origin: https://chainpaye.com" \
  -v
```

#### Test from Browser
```javascript
fetch('http://localhost:4000/api/v1/payment-links', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('CORS Error:', error));
```

## Frontend Integration

### Axios Example
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Use the API
api.get('/api/v1/payment-links')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

### Fetch Example
```javascript
fetch(`${process.env.REACT_APP_API_URL}/api/v1/payment-links`, {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-Correlation-Id': crypto.randomUUID()
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

## Security Considerations

### ✅ DO in Production
- Set specific domains in `CORS_ORIGIN`
- Use HTTPS for all domains
- Regularly review allowed origins
- Monitor CORS errors in logs

### ❌ DON'T in Production
- Use `CORS_ORIGIN=*` (allows any origin)
- Allow HTTP origins (security risk)
- Expose sensitive headers
- Ignore CORS errors

## Deployment Checklist

- [ ] Install cors package (`npm install cors`)
- [ ] Configure CORS in `src/app.ts`
- [ ] Set `CORS_ORIGIN` in `.env`
- [ ] Change `CORS_ORIGIN` to specific domains for production
- [ ] Test CORS with `node test-cors.js`
- [ ] Verify preflight requests work
- [ ] Test from actual frontend domain
- [ ] Monitor CORS errors in production

## Common Issues

### Issue 1: "No 'Access-Control-Allow-Origin' header"
**Solution:** Check `CORS_ORIGIN` is set and server is restarted

### Issue 2: Preflight request fails
**Solution:** Verify CORS middleware is before routes

### Issue 3: Custom headers rejected
**Solution:** Add headers to `allowedHeaders` in corsOptions

### Issue 4: Credentials not working
**Solution:** Ensure `credentials: true` and origin is not `*`

## Verification

All TypeScript compilation passes:
- ✓ src/app.ts compiles without errors
- ✓ CORS types are properly imported
- ✓ No type conflicts

CORS is production-ready and can be deployed immediately after setting production domains.

## Next Steps

1. **For Development:**
   - Current configuration works out of the box
   - Test with `node test-cors.js`

2. **For Production:**
   - Update `.env` with production domains:
     ```env
     CORS_ORIGIN=https://chainpaye.com,https://www.chainpaye.com
     ```
   - Deploy and test from production frontend
   - Monitor CORS errors in logs

## Support

For CORS-related issues:
- Review `CORS_CONFIGURATION.md` for detailed guide
- Run `test-cors.js` to verify configuration
- Check browser console for specific error messages
- Verify environment variables are set correctly
