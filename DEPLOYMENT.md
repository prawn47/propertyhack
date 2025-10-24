# QUORD.ai Deployment Guide

## Environment Variables Setup

### Required Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="file:./dev.db"  # For SQLite (development)
# DATABASE_URL="postgresql://user:password@host:port/database"  # For PostgreSQL (production)

# JWT Configuration
JWT_ACCESS_SECRET="your-super-secret-jwt-access-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-key-change-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Service (Resend)
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="noreply@mail.quord.ai"

# AI Services
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"

# OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/oauth/google/callback"

LINKEDIN_CLIENT_ID="your-linkedin-client-id"
QUORD_LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
QUORD_LINKEDIN_REDIRECT_URI="http://localhost:3001/api/oauth/linkedin/callback"

# Server Configuration
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
```

### Frontend Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Gemini AI (for client-side AI generation)
GEMINI_API_KEY="your-gemini-api-key"

# LinkedIn Publishing (for direct LinkedIn API calls)
LINKEDIN_ACCESS_TOKEN="your-linkedin-access-token"
```

## PostgreSQL Migration

### 1. Update Database Configuration

In `server/prisma/schema.prisma`, change the datasource:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2. Update Environment Variable

```bash
DATABASE_URL="postgresql://username:password@host:port/database_name"
```

### 3. Run Migration

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

### 4. Verify Migration

```bash
npx prisma studio  # Opens database browser
```

## Deployment Steps

### Development

1. **Start Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm install
   npm run dev
   ```

### Production

1. **Backend Deployment:**
   ```bash
   cd server
   npm install --production
   npm run build  # If you add a build script
   npm start
   ```

2. **Frontend Deployment:**
   ```bash
   npm install
   npm run build
   # Deploy dist/ folder to your hosting service
   ```

### Environment-Specific Configuration

#### Development
- SQLite database (file-based)
- CORS enabled for localhost:3000
- Detailed error messages
- Session cookies not secure

#### Production
- PostgreSQL database
- CORS configured for your domain
- Generic error messages
- Secure session cookies
- HTTPS required

## Security Considerations

### JWT Secrets
- Use strong, random secrets (32+ characters)
- Different secrets for access and refresh tokens
- Rotate secrets periodically

### Database Security
- Use connection pooling
- Enable SSL for PostgreSQL
- Restrict database user permissions
- Regular backups

### API Keys
- Store in environment variables only
- Use different keys for development/production
- Monitor API usage and set limits
- Rotate keys regularly

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Adjust based on your needs

## Monitoring and Logging

### Health Checks
- Backend: `GET /health`
- Database connectivity
- External service availability

### Logging
- Authentication events
- API errors
- Database queries (in development)
- Performance metrics

## Backup Strategy

### Database Backups
```bash
# PostgreSQL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# SQLite
cp server/dev.db backup_$(date +%Y%m%d_%H%M%S).db
```

### Environment Backups
- Store environment templates in version control
- Use secret management services in production
- Document all required variables

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check network connectivity

2. **Authentication Issues**
   - Verify JWT secrets are set
   - Check token expiration times
   - Ensure CORS is configured correctly

3. **OAuth Errors**
   - Verify callback URLs match OAuth app settings
   - Check client IDs and secrets
   - Ensure proper scopes are requested

4. **Email Service Issues**
   - Verify Resend API key
   - Check domain verification
   - Monitor rate limits

### Debug Commands

```bash
# Check database schema
npx prisma db pull

# Reset database (development only)
npx prisma migrate reset

# View database contents
npx prisma studio

# Test API endpoints
curl -X GET http://localhost:3001/health
```

## Performance Optimization

### Database
- Add indexes for frequently queried fields
- Use connection pooling
- Implement query optimization
- Regular VACUUM (PostgreSQL)

### API
- Implement caching for user settings
- Use pagination for large datasets
- Compress responses
- Implement request deduplication

### Frontend
- Code splitting
- Image optimization
- Bundle size optimization
- CDN for static assets
