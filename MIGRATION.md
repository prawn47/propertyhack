# PropertyHack — Cloudflare Workers Migration Guide

> **Branch:** `feat/cloudflare-migration`
> **Ref:** Beads workspace-8i6
> **Date:** 2026-03-14

## Overview

This branch migrates the PropertyHack backend from a traditional Node.js/Express server
(Docker/VPS) to Cloudflare Workers with the following replacements:

| Component | Before | After |
|-----------|--------|-------|
| **Backend** | Express on Docker/VPS | Express via CF Workers `nodejs_compat` |
| **Job Queues** | BullMQ + Redis | CF Queues (10 queues, 1:1 mapping) |
| **Redis** | ioredis (BullMQ backend) | **Eliminated** (CF Queues don't need Redis) |
| **Cron Jobs** | node-cron (4 schedulers) | CF Cron Triggers |
| **Image Storage** | Local filesystem (`public/images/`) | R2 bucket (`propertyhack-images`) |
| **Database** | PostgreSQL (self-hosted) | DO Managed Postgres via Hyperdrive |
| **Frontend** | Served by Express | CF Pages (separate deployment) |

## Architecture

```
Internet → Cloudflare Network
             ├── Pages (React SPA frontend)
             │   └── _redirects → proxies /api/* to Worker
             └── Worker (Express backend via nodejs_compat)
                 ├── Prisma → Hyperdrive → DO Managed Postgres (pgvector)
                 ├── CF Queues (10 queues replacing BullMQ pipeline)
                 ├── CF Cron Triggers (4 scheduled jobs)
                 ├── R2 (article + newsletter images)
                 └── KV (rate limiting — optional, uses express-rate-limit for now)
```

## Dual-Mode Design

**All changes are backwards-compatible.** The same code runs:

1. **On CF Workers:** `globalThis.__cf_env` is set → uses CF Queues, R2, Cron Triggers
2. **Locally / VPS / Fly.io:** `globalThis.__cf_env` is undefined → uses BullMQ, Redis, node-cron, filesystem

This means:
- `npm start` in `server/` still works exactly as before (needs Redis)
- `npx wrangler dev` in `server/` runs on CF Workers locally
- `npx wrangler deploy` deploys to production

## Files Changed

### New Files
- `server/worker-entry.js` — CF Worker entry point (fetch, queue, scheduled handlers)
- `server/wrangler.toml` — CF Workers configuration
- `server/queues/cfAdapter.js` — BullMQ Queue.add() adapter for CF Queues
- `server/routes/images.js` — R2 image serving route
- `server/.dev.vars` — Template for local CF dev secrets
- `public/_redirects` — CF Pages proxy rules
- `MIGRATION.md` — This file

### Modified Files
- `server/index.js` — Exports `app`, conditional `app.listen()`, R2 image route
- `server/queues/connection.js` — Dual-mode (Redis or CF Queues)
- `server/queues/*.js` (10 files) — Dual-mode queue instantiation
- `server/workers/*.js` (10 files) — Extracted `processJob()`, conditional BullMQ Worker
- `server/jobs/*.js` (4 files) — Exported `run*()` functions, conditional node-cron
- `server/services/imageGenerationService.js` — R2 save path for article images
- `server/services/imagenService.js` — R2 save path for newsletter images
- `.gitignore` — Added `.dev.vars` and `.wrangler/`

## Deployment Steps

### Prerequisites

1. **Cloudflare account** with Workers paid plan ($5/mo) — needed for 30s CPU time
2. **Wrangler CLI:** `npm install -g wrangler && wrangler login`
3. **DO Managed Postgres** already provisioned (see credentials in Beads)

### Step 1: Create Cloudflare Resources

```bash
cd server

# Create Hyperdrive config (connection pooling for Postgres)
wrangler hyperdrive create propertyhack-db \
  --connection-string="postgresql://doadmin:AVNS_xxx@db-postgresql-syd1-89854-do-user-34538256-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
# ⚠️ Copy the returned ID and update wrangler.toml [[hyperdrive]] id

# Create R2 bucket
wrangler r2 bucket create propertyhack-images

# Create KV namespace
wrangler kv namespace create RATE_LIMIT
# ⚠️ Copy the returned ID and update wrangler.toml [[kv_namespaces]] id

# Create all 10 queues
for q in source-fetch article-process article-summarise article-image \
         article-embed social-generate social-publish newsletter-generate \
         article-audit alt-text-backfill; do
  wrangler queues create "$q"
done
```

### Step 2: Set Secrets

```bash
cd server

# Required secrets
wrangler secret put JWT_ACCESS_SECRET
wrangler secret put JWT_REFRESH_SECRET
wrangler secret put GEMINI_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put NEWSAPI_API_KEY
wrangler secret put NEWSAPI_AI_KEY
wrangler secret put PERPLEXITY_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_WEBHOOK_SIGNING_SECRET
wrangler secret put SOCIAL_TOKEN_ENCRYPTION_KEY
```

### Step 3: Update wrangler.toml

Replace `TO_BE_CONFIGURED` placeholders with actual IDs from Step 1:
- `[[hyperdrive]]` → `id = "your-hyperdrive-id"`
- `[[kv_namespaces]]` → `id = "your-kv-namespace-id"`

### Step 4: Generate Prisma Client & Deploy

```bash
cd server

# Generate Prisma client
npx prisma generate

# Test locally first
npx wrangler dev

# Deploy to production
npx wrangler deploy
```

### Step 5: Deploy Frontend to CF Pages

```bash
# From project root
npm run build
wrangler pages deploy frontend-dist --project-name propertyhack
```

### Step 6: Configure DNS

In Cloudflare DNS dashboard:
- `propertyhack.com` → CF Pages (auto-configured when you add custom domain)
- `api.propertyhack.com` → CF Worker custom domain (set in dashboard or `wrangler.toml`)

Then update `public/_redirects` to use the actual API domain.

## Known Limitations & TODOs

### Express ↔ CF Workers Bridge
The `worker-entry.js` fetch handler manually bridges Web Standards Request → Express.
This is a simplified bridge. For full compatibility, consider:
- `handleAsNodeRequest` from `cloudflare:node` when it ships (expected mid-2026)
- Or use `@hono/node-server` as an intermediate adapter

### SSE Streaming (Henry Chat)
Henry's SSE streaming should work via the bridge, but needs testing. CF Workers
support response streaming. If issues arise, consider:
- WebSocket via Durable Objects as a fallback
- Or keep Henry on a separate Fly.io service

### Queue Observability
CF Queues don't expose job counts like BullMQ's `getJobCounts()`. The
`/system/queue-status` endpoint returns zeroes on CF Workers. Options:
- Use CF Queue analytics dashboard
- Track counts in KV manually

### Image Migration
Existing images on the current server need to be uploaded to R2:
```bash
# From the current server, upload all images to R2
cd server/public/images
for dir in articles newsletters; do
  for f in $dir/*; do
    wrangler r2 object put "propertyhack-images/$f" --file "$f"
  done
done
```

### Worker CPU Time Limits
CF Workers paid plan gives 30s CPU time per request. AI API calls (Gemini, OpenAI)
can take 10-20 seconds. Queue consumers have a 15-minute timeout, which is fine.
But regular HTTP requests that trigger AI calls may need to be async (queue the work,
return immediately, poll for results).

## Cost

| Service | Monthly Cost |
|---------|-------------|
| CF Workers Paid | $5 |
| DO Managed Postgres (Basic) | $15 |
| CF Pages | Free |
| R2 (10GB free tier) | Free |
| CF Queues (1M ops free) | Free |
| **Total** | **~$20/mo** |

## Rollback

If issues arise, the code still works on traditional infrastructure:
1. Set up Redis and `REDIS_URL` env var
2. Run `node server/index.js` — it will use BullMQ + node-cron automatically
3. No code changes needed to roll back
