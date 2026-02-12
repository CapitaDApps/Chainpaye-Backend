# Deployment Guide

## Overview
This guide covers deploying the ChainPaye Payment Link API to various cloud platforms.

## Prerequisites
- Node.js 18+ 
- MongoDB Atlas connection string
- Environment variables configured

## Build Process
The application uses TypeScript and requires compilation before deployment:

```bash
npm install
npm run build
npm start
```

## Environment Variables
Required environment variables:

```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
TORONET_API_URL=https://api.toronet.com
TORONET_ADMIN_ADDRESS=your_admin_address
TORONET_ADMIN_PASSWORD=your_admin_password
ENCRYPTION_KEY_V1=your_encryption_key_v1
ENCRYPTION_KEY_V2=your_encryption_key_v2

# CORS Configuration (IMPORTANT for production)
CORS_ORIGIN=https://chainpaye.com,https://www.chainpaye.com
```

### CORS Configuration
**Development:**
```env
CORS_ORIGIN=*
```

**Production (REQUIRED):**
```env
CORS_ORIGIN=https://chainpaye.com,https://www.chainpaye.com,https://app.chainpaye.com
```

⚠️ **Security Warning:** Never use `CORS_ORIGIN=*` in production. Always specify exact domains.

For detailed CORS configuration, see [CORS_CONFIGURATION.md](CORS_CONFIGURATION.md).

## Platform-Specific Deployment

### Render
1. Connect your GitHub repository
2. Use the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18
3. Add environment variables in Render dashboard
4. The `render.yaml` file is included for automatic configuration

### Heroku
1. Install Heroku CLI
2. Create new app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set MONGODB_URI=your_connection_string`
4. Deploy: `git push heroku main`
5. The `Procfile` is included for automatic configuration

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Configure environment variables in Vercel dashboard

### Railway
1. Connect GitHub repository
2. Railway will auto-detect Node.js and use package.json scripts
3. Add environment variables in Railway dashboard

## File Structure
```
dist/                 # Compiled JavaScript files (generated)
src/                  # TypeScript source files
├── server.ts        # Main server entry point
├── app.ts           # Express app configuration
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # MongoDB models
├── repositories/    # Data access layer
├── routes/          # API routes
├── services/        # Business logic
└── types/           # TypeScript type definitions
```

## Health Check
The API includes a health check endpoint:
- **URL**: `/api/v1/health`
- **Method**: GET
- **Response**: JSON with server status

## Troubleshooting

### "Cannot find module '/opt/render/project/src/server.js'"
**Problem**: Deployment platform looking for source file instead of compiled file.

**Solutions**:
1. Ensure `npm run build` runs during deployment
2. Verify `package.json` has correct start script: `"start": "node dist/server.js"`
3. Check that TypeScript is in dependencies (not devDependencies)
4. Ensure build command runs: `npm install && npm run build`

### Database Connection Timeout
**Problem**: MongoDB connection fails during deployment.

**Solutions**:
1. Verify MONGODB_URI environment variable is set
2. Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for cloud deployments)
3. Ensure database user has proper permissions
4. Test connection string locally first

### Port Issues
**Problem**: Server not accessible after deployment.

**Solutions**:
1. Use `process.env.PORT` in server configuration
2. Don't hardcode port numbers
3. Ensure platform-specific port configuration

### Build Failures
**Problem**: TypeScript compilation fails during deployment.

**Solutions**:
1. Move `typescript` from devDependencies to dependencies
2. Ensure all @types packages are available
3. Check tsconfig.json configuration
4. Verify Node.js version compatibility

## Performance Optimization
- Enable gzip compression
- Use connection pooling for MongoDB
- Implement proper error handling
- Add request rate limiting
- Use environment-specific logging levels

## Security Considerations
- Never commit .env files
- Use strong encryption keys
- Implement proper CORS configuration
- Add request validation middleware
- Use HTTPS in production
- Implement proper authentication/authorization

## Monitoring
- Set up health check monitoring
- Implement application logging
- Monitor database performance
- Track API response times
- Set up error alerting

## Scaling
- Use horizontal scaling for high traffic
- Implement database read replicas
- Add caching layer (Redis)
- Use CDN for static assets
- Implement load balancing