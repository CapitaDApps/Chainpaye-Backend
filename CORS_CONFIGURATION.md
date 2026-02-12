# CORS Configuration Guide

## Overview

Cross-Origin Resource Sharing (CORS) has been configured to allow the ChainPaye frontend to communicate with the API from different domains.

## Current Configuration

### Development Mode
```
CORS_ORIGIN=*
```
- Allows requests from **any origin**
- Suitable for development and testing
- **NOT recommended for production**

### Production Mode
```
CORS_ORIGIN=https://chainpaye.com,https://www.chainpaye.com
```
- Restricts requests to specific domains
- Comma-separated list of allowed origins
- **Recommended for production**

## Configuration Details

### Allowed Methods
- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS

### Allowed Headers
- `Content-Type` - For JSON requests
- `Authorization` - For authentication tokens
- `X-Correlation-Id` - For request tracking
- `X-Requested-With` - For AJAX requests

### Exposed Headers
- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Remaining requests
- `RateLimit-Reset` - When rate limit resets

### Additional Settings
- **Credentials:** Enabled (allows cookies and authentication)
- **Max Age:** 24 hours (browser caches preflight requests)

## Environment Variables

Add to your `.env` file:

```bash
# Development - Allow all origins
CORS_ORIGIN=*

# Production - Specific domains only
CORS_ORIGIN=https://chainpaye.com,https://www.chainpaye.com,https://app.chainpaye.com
```

## Implementation

The CORS middleware is configured in `src/app.ts`:

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

## Testing CORS

### Test with cURL

```bash
# Test preflight request
curl -X OPTIONS http://localhost:4000/api/v1/payment-links \
  -H "Origin: https://chainpaye.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Test actual request
curl -X GET http://localhost:4000/api/v1/payment-links \
  -H "Origin: https://chainpaye.com" \
  -v
```

### Test with JavaScript

```javascript
// Test CORS from browser console
fetch('http://localhost:4000/api/v1/payment-links', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('CORS headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
  });
  return response.json();
})
.then(data => console.log('Response:', data))
.catch(error => console.error('CORS Error:', error));
```

## Common CORS Issues and Solutions

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Problem:** Frontend can't access the API

**Solution:** 
- Check `CORS_ORIGIN` is set in `.env`
- Verify the origin matches exactly (including protocol and port)
- Restart the server after changing `.env`

### Issue 2: "Credentials mode is 'include' but CORS header is '*'"

**Problem:** Can't use credentials with wildcard origin

**Solution:**
```bash
# Change from wildcard to specific domain
CORS_ORIGIN=https://chainpaye.com
```

### Issue 3: Preflight request fails

**Problem:** OPTIONS request returns 404 or 403

**Solution:**
- CORS middleware is applied before routes
- Check that OPTIONS method is allowed
- Verify no authentication middleware blocks OPTIONS

### Issue 4: Custom headers not allowed

**Problem:** `X-Correlation-Id` or other custom headers rejected

**Solution:**
- Add header to `allowedHeaders` in `corsOptions`
- Rebuild and restart server

## Security Best Practices

### 1. Production Configuration

**DO:**
```bash
CORS_ORIGIN=https://chainpaye.com,https://www.chainpaye.com
```

**DON'T:**
```bash
CORS_ORIGIN=*
```

### 2. Multiple Domains

For multiple domains, use comma-separated list:
```bash
CORS_ORIGIN=https://chainpaye.com,https://app.chainpaye.com,https://admin.chainpaye.com
```

### 3. Dynamic Origin Validation

For more complex scenarios, modify `src/app.ts`:

```typescript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  // ... other options
};
```

### 4. Environment-Specific Configuration

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const corsOptions = {
  origin: isDevelopment ? '*' : process.env.CORS_ORIGIN,
  credentials: !isDevelopment, // Only in production
  // ... other options
};
```

## Frontend Integration

### Axios Configuration

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add correlation ID to all requests
api.interceptors.request.use(config => {
  config.headers['X-Correlation-Id'] = crypto.randomUUID();
  return config;
});

export default api;
```

### Fetch Configuration

```javascript
const apiUrl = process.env.REACT_APP_API_URL;

fetch(`${apiUrl}/api/v1/payment-links`, {
  method: 'POST',
  credentials: 'include', // Include cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Correlation-Id': crypto.randomUUID()
  },
  body: JSON.stringify(data)
});
```

## Monitoring CORS

### Log CORS Requests

Add logging to track CORS issues:

```typescript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    console.log(`CORS request from: ${origin}`);
  }
  next();
});
```

### Check Response Headers

Verify CORS headers in responses:

```bash
curl -I http://localhost:4000/api/v1/payment-links \
  -H "Origin: https://chainpaye.com"
```

Expected headers:
```
Access-Control-Allow-Origin: https://chainpaye.com
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

## Deployment Checklist

- [ ] Set `CORS_ORIGIN` to specific domain(s) in production
- [ ] Remove wildcard (`*`) from production configuration
- [ ] Test CORS from production frontend domain
- [ ] Verify credentials work if using authentication
- [ ] Check rate limit headers are exposed
- [ ] Test preflight requests (OPTIONS)
- [ ] Monitor CORS errors in production logs

## Troubleshooting

### Enable CORS Debug Logging

```typescript
import cors from 'cors';

app.use(cors({
  ...corsOptions,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Log all CORS requests
app.use((req, res, next) => {
  console.log('CORS Debug:', {
    method: req.method,
    origin: req.headers.origin,
    path: req.path
  });
  next();
});
```

### Check Browser Console

Look for CORS errors in browser DevTools:
- Network tab: Check response headers
- Console tab: Look for CORS error messages
- Check if preflight (OPTIONS) request succeeded

### Verify Server Configuration

```bash
# Check environment variable
echo $CORS_ORIGIN

# Test server response
curl -X OPTIONS http://localhost:4000/api/v1/payment-links \
  -H "Origin: https://chainpaye.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

## Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Package](https://www.npmjs.com/package/cors)
- [CORS Best Practices](https://web.dev/cross-origin-resource-sharing/)

## Support

For CORS-related issues:
1. Check browser console for specific error messages
2. Verify `CORS_ORIGIN` environment variable is set correctly
3. Test with cURL to isolate frontend vs backend issues
4. Check correlation IDs in logs for debugging
