# Quord.ai Deployment Checklist

Quick reference for deploying to production.

## Pre-Deployment

- [ ] Code pushed to GitHub (`main` branch)
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Domain `quord.ai` ready with DNS access

## Backend (Render) - api.quord.ai

### 1. Create Services
- [ ] PostgreSQL database created (Starter plan, $7/mo)
- [ ] Redis instance created (Starter plan, $10/mo)
- [ ] Web service created (Starter plan, $7/mo)
- [ ] All services in same region (Oregon)

### 2. Environment Variables Set
- [ ] `DATABASE_URL` (from PostgreSQL internal URL)
- [ ] `REDIS_URL` (from Redis internal URL)
- [ ] `JWT_ACCESS_SECRET` (generated via `node generate-secrets.js`)
- [ ] `JWT_REFRESH_SECRET` (generated via `node generate-secrets.js`)
- [ ] `GEMINI_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `PERPLEXITY_API_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `LINKEDIN_CLIENT_ID`
- [ ] `QUORD_LINKEDIN_CLIENT_SECRET`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PRO_PRICE_ID`
- [ ] `NEWSAPI_API_KEY`
- [ ] `CORS_ORIGIN=https://app.quord.ai,https://quord.ai`

### 3. Deployment
- [ ] Backend deployed successfully
- [ ] Migrations ran automatically
- [ ] Health check passes: `curl https://<your-render-url>.onrender.com/health`
- [ ] Custom domain `api.quord.ai` added in Render
- [ ] DNS CNAME record added: `api` → `quord-api.onrender.com`
- [ ] SSL certificate active

## Frontend (Vercel) - app.quord.ai & quord.ai

### 1. Import Project
- [ ] Connected GitHub repository
- [ ] Framework: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### 2. Environment Variables Set
- [ ] `VITE_API_URL=https://api.quord.ai`
- [ ] `VITE_APP_URL=https://app.quord.ai`
- [ ] `VITE_GEMINI_API_KEY`

### 3. Deployment
- [ ] Initial deployment successful
- [ ] Build passes
- [ ] Preview URL works
- [ ] Domain `app.quord.ai` added in Vercel
- [ ] Domain `quord.ai` added in Vercel
- [ ] Domain `www.quord.ai` added (redirects to quord.ai)

### 4. DNS Configuration
- [ ] A record: `@` → `76.76.21.21`
- [ ] CNAME: `www` → `cname.vercel-dns.com`
- [ ] CNAME: `app` → `cname.vercel-dns.com`
- [ ] All domains show SSL certificate

## OAuth & Integrations

### LinkedIn
- [ ] Redirect URI updated: `https://api.quord.ai/api/auth/linkedin/callback`

### Google
- [ ] Redirect URI updated: `https://api.quord.ai/api/oauth/google/callback`

### Stripe
- [ ] Webhook endpoint: `https://api.quord.ai/api/subscription/webhook`
- [ ] Webhook signing secret updated in Render

## Post-Deployment

### Testing
- [ ] Visit https://quord.ai - marketing page loads
- [ ] Visit https://app.quord.ai - app loads
- [ ] Register new account
- [ ] Login works
- [ ] LinkedIn connection works
- [ ] Create and publish a post
- [ ] Schedule a post
- [ ] Super admin access works

### Super Admin Setup
- [ ] SSH into Render console
- [ ] Run super admin creation script
- [ ] Login as dan@microrocket.com
- [ ] Access super admin settings
- [ ] Create system prompts

### Monitoring
- [ ] Check Render logs for errors
- [ ] Check Vercel function logs
- [ ] Set up uptime monitoring (optional)
- [ ] Configure error tracking (Sentry, optional)

## Cost Summary

**Monthly costs:**
- Render PostgreSQL: $7
- Render Redis: $10
- Render Web Service: $7
- Vercel Pro (optional): $20
- **Total**: $24-44/month

## Quick Commands

### Generate JWT secrets
```bash
node generate-secrets.js
```

### Test API health
```bash
curl https://api.quord.ai/health
```

### View Render logs
```bash
# In Render dashboard: Logs tab
```

### Create super admin (Render console)
```bash
cd server
node -e "..." # See DEPLOYMENT_GUIDE.md for full script
```

## Troubleshooting

**Backend won't start:**
- Check Render logs
- Verify DATABASE_URL and REDIS_URL
- Ensure migrations ran

**Frontend can't reach API:**
- Test API directly
- Check CORS_ORIGIN
- Verify DNS propagation

**OAuth not working:**
- Update callback URLs in provider dashboards
- Verify environment variables

## Rollback

If something goes wrong:
1. Vercel: Previous deployment → "Promote to Production"
2. Render: Settings → "Rollback to Previous Deploy"
3. DNS: Revert changes (takes time)

---

**Need help?** See full DEPLOYMENT_GUIDE.md
