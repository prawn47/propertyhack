# Quord.ai Production Deployment Guide

Complete guide for deploying Quord.ai to production with split architecture.

## Architecture Overview

- **quord.ai** → Marketing landing page (Vercel)
- **app.quord.ai** → Logged-in user application (Vercel)
- **api.quord.ai** → Backend API (Render)

## Prerequisites

1. GitHub account with repository access
2. Vercel account (free tier is fine)
3. Render account (free tier for testing, paid for production)
4. Domain: quord.ai (with DNS access)

## Part 1: Backend Deployment (Render)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Connect your GitHub repository

### Step 2: Deploy PostgreSQL Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configuration:
   - Name: `quord-postgres`
   - Database: `quord_production`
   - User: `quord`
   - Region: `Oregon (US West)`
   - Plan: **Starter ($7/month)** minimum
4. Click "Create Database"
5. **Copy the Internal Database URL** - you'll need this

### Step 3: Deploy Redis
1. Click "New +" → "Redis"
2. Configuration:
   - Name: `quord-redis`
   - Region: `Oregon (US West)`
   - Plan: **Starter ($10/month)** minimum
3. Click "Create Redis"
4. **Copy the Internal Redis URL** - you'll need this

### Step 4: Deploy Backend API
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `micro-rocket/quord_g0`
3. Configuration:
   - Name: `quord-api`
   - Region: `Oregon (US West)`
   - Branch: `main`
   - Root Directory: Leave empty
   - Runtime: `Node`
   - Build Command: `cd server && npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `cd server && npm start`
   - Plan: **Starter ($7/month)** minimum

4. **Environment Variables** (click "Add Environment Variable"):

```bash
# Essential
NODE_ENV=production
PORT=3001
DATABASE_URL=<paste Internal Database URL from Step 2>
REDIS_URL=<paste Internal Redis URL from Step 3>

# JWT Secrets (generate new ones!)
JWT_ACCESS_SECRET=<generate-random-64-char-string>
JWT_REFRESH_SECRET=<generate-random-64-char-string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://app.quord.ai,https://quord.ai

# AI APIs (copy from your .env)
GEMINI_API_KEY=<your-gemini-key>
OPENAI_API_KEY=<your-openai-key>
PERPLEXITY_API_KEY=<your-perplexity-key>

# Email
RESEND_API_KEY=<your-resend-key>
RESEND_FROM_EMAIL=post@mail.quord.ai

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=<your-linkedin-client-id>
QUORD_LINKEDIN_CLIENT_SECRET=<your-linkedin-secret>
QUORD_LINKEDIN_REDIRECT_URI=https://api.quord.ai/api/auth/linkedin/callback

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-secret>
GOOGLE_CALLBACK_URL=https://api.quord.ai/api/oauth/google/callback

# Stripe
STRIPE_SECRET_KEY=<your-stripe-secret>
STRIPE_PRO_PRICE_ID=<your-stripe-price-id>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

# News API
NEWSAPI_API_KEY=<your-newsapi-key>
```

5. Click "Create Web Service"
6. Wait for deployment (~5 minutes)
7. Note your service URL (e.g., `https://quord-api.onrender.com`)

### Step 5: Configure Custom Domain for API
1. In Render dashboard, select `quord-api`
2. Go to "Settings" → "Custom Domain"
3. Add domain: `api.quord.ai`
4. Render will provide DNS records
5. Add to your DNS provider:
   ```
   Type: CNAME
   Name: api
   Value: quord-api.onrender.com
   ```
6. Wait for DNS propagation (~5-30 minutes)

## Part 2: Frontend Deployment (Vercel)

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import project: `micro-rocket/quord_g0`

### Step 2: Configure Project
1. Framework Preset: `Vite`
2. Root Directory: `.` (leave empty)
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Install Command: `npm install`

### Step 3: Environment Variables
Add in Vercel dashboard → Settings → Environment Variables:

```bash
VITE_API_URL=https://api.quord.ai
VITE_APP_URL=https://app.quord.ai
VITE_GEMINI_API_KEY=<your-gemini-key>
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build (~2 minutes)
3. Note your Vercel URL (e.g., `quord-g0.vercel.app`)

### Step 5: Configure Custom Domains

#### Main App (app.quord.ai)
1. In Vercel dashboard, go to "Settings" → "Domains"
2. Add domain: `app.quord.ai`
3. Vercel provides DNS records:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```
4. Add to your DNS provider

#### Marketing Site (quord.ai)
1. Add domain: `quord.ai`
2. Also add: `www.quord.ai` (for redirect)
3. DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

## Part 3: DNS Configuration

In your DNS provider (Cloudflare, Namecheap, etc.):

```
# Main domain and www
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com

# App subdomain
CNAME app   cname.vercel-dns.com

# API subdomain
CNAME api   quord-api.onrender.com
```

## Part 4: OAuth Callback URLs

### LinkedIn Developer Console
Update redirect URIs:
```
https://api.quord.ai/api/auth/linkedin/callback
```

### Google Cloud Console
Update authorized redirect URIs:
```
https://api.quord.ai/api/oauth/google/callback
```

### Stripe Dashboard
Update webhook endpoint:
```
https://api.quord.ai/api/subscription/webhook
```

## Part 5: Testing

### 1. Test Backend API
```bash
curl https://api.quord.ai/health
# Should return: {"status":"OK","timestamp":"..."}
```

### 2. Test Frontend
- Visit https://quord.ai (marketing)
- Visit https://app.quord.ai (app)
- Try registering a new account
- Try logging in with existing account

### 3. Test Full Flow
1. Register at app.quord.ai
2. Login
3. Go to Settings → Connect LinkedIn
4. Create a draft post
5. Publish to LinkedIn
6. Check scheduled posts work

## Part 6: Post-Deployment Tasks

### 1. Update Super Admin User
Since database is fresh, recreate super admin:

```bash
# SSH into Render shell (or use dashboard console)
cd server
node -e "
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  const passwordHash = await bcrypt.hash('super', 10);
  const user = await prisma.user.upsert({
    where: { email: 'dan@microrocket.com' },
    update: { superAdmin: true },
    create: {
      email: 'dan@microrocket.com',
      passwordHash,
      emailVerified: true,
      superAdmin: true
    }
  });
  console.log('Super admin created:', user.email);
  await prisma.\$disconnect();
}
createSuperAdmin();
"
```

### 2. Monitor Logs
- **Render**: Dashboard → quord-api → Logs
- **Vercel**: Dashboard → Deployments → View Function Logs

### 3. Set Up Monitoring
Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Uptime Robot** for uptime monitoring

## Cost Estimate

### Monthly Costs
- **Render**:
  - PostgreSQL Starter: $7/month
  - Redis Starter: $10/month
  - Web Service Starter: $7/month
  - **Total**: ~$24/month

- **Vercel**:
  - Hobby (free) for testing
  - Pro ($20/month) for production features

**Total Monthly**: ~$24-44/month

### Free Tier Testing
You can test on free tiers:
- Render: Free tier available (spins down when inactive)
- Vercel: Hobby tier (free, but no team features)

## Troubleshooting

### Backend Won't Start
1. Check Render logs for errors
2. Verify DATABASE_URL is correct
3. Ensure Prisma migrations ran: `npx prisma migrate deploy`
4. Check Redis connection

### Frontend Can't Reach API
1. Verify CORS_ORIGIN includes your frontend URL
2. Check api.quord.ai DNS is resolving
3. Test API directly: `curl https://api.quord.ai/health`
4. Check Vercel environment variables

### OAuth Not Working
1. Update callback URLs in provider dashboards
2. Verify CLIENT_ID and CLIENT_SECRET are correct
3. Check REDIRECT_URI matches exactly

### Database Migrations Fail
```bash
# Connect to Render shell
cd server
npx prisma migrate reset --force
npx prisma migrate deploy
```

## Rollback Plan

If deployment fails:

1. **Vercel**: Click previous deployment → "Promote to Production"
2. **Render**: Settings → "Rollback to Previous Deploy"
3. **DNS**: Change back to old values (takes time to propagate)

## Security Checklist

- [ ] All API keys are in environment variables (not committed)
- [ ] JWT secrets are randomly generated and unique
- [ ] CORS_ORIGIN is restrictive (only your domains)
- [ ] Database has strong password
- [ ] Redis has password protection
- [ ] HTTPS is enforced everywhere
- [ ] Rate limiting is enabled
- [ ] Helmet security headers are active

## Support

- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Prisma**: https://www.prisma.io/docs

---

**Ready to deploy?** Start with Part 1 (Backend) and work through sequentially.
