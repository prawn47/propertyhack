# BullMQ Scheduling Not Working in Production

## Root Cause

**Problem:** Scheduled posts not publishing automatically in production.

**Why:** Render's web service uses containerized hosting that can sleep between requests. The `setInterval()` schedulers in `server/index.js` (lines 244-257) won't run reliably because:
1. Containers sleep when idle
2. `setInterval` only runs while the process is active
3. BullMQ workers may start but schedulers that queue jobs don't run consistently

## Current Architecture

The app has TWO scheduling mechanisms:

### 1. BullMQ Internal Schedulers (NOT WORKING in production)
- Location: `server/index.js` lines 137-165, 244-257
- Runs `checkAndQueueScheduledPosts()` every 60 seconds
- **Problem:** Requires always-on process

### 2. External Cron Endpoint (WORKING, but not configured)
- Location: `server/routes/cron.js`
- Endpoint: `POST /api/cron/process-scheduled-posts`
- Header: `X-Cron-Secret: <value>`
- **This bypasses BullMQ and posts directly to LinkedIn**

## Solutions

### Option A: Use Render Cron Jobs (RECOMMENDED)

1. **Add CRON_SECRET to Render env vars**
   ```
   Go to Render Dashboard → quord-api → Environment
   Add: CRON_SECRET=<generate-random-secret>
   ```

2. **Create Render Cron Job**
   ```yaml
   # Add to render.yaml
   - type: cron
     name: quord-scheduled-posts
     schedule: "*/2 * * * *"  # Every 2 minutes
     command: |
       curl -X POST https://api.propertyhack.com/api/cron/process-scheduled-posts \
         -H "X-Cron-Secret: $CRON_SECRET"
   ```

3. **Deploy**
   ```bash
   git add render.yaml
   git commit -m "Add cron job for scheduled posts"
   git push
   ```

### Option B: Use External Cron Service

Use cron-job.org, GitHub Actions, or similar:

```yaml
# .github/workflows/scheduled-posts.yml
name: Process Scheduled Posts
on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger post processing
        run: |
          curl -X POST https://api.propertyhack.com/api/cron/process-scheduled-posts \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}"
```

### Option C: Migrate to Always-On Service

If you need BullMQ workers to run continuously:
1. Use Render Background Worker (separate from web service)
2. Or use Railway/Fly.io which keep processes alive

## Immediate Fix

**Quick test without cron setup:**

```bash
# 1. Set CRON_SECRET in Render dashboard
# 2. Manually trigger processing:
curl -X POST https://api.propertyhack.com/api/cron/process-scheduled-posts \
  -H "X-Cron-Secret: YOUR_SECRET"
```

## Verification

After implementing Option A or B:

1. Create a scheduled post (2 min in future)
2. Wait 2-3 minutes
3. Check if post appears in published posts
4. Check Render logs for `[cron] Found X due posts`

## Notes

- Current `/api/cron/process-scheduled-posts` endpoint **bypasses BullMQ entirely**
- It queries the database directly and posts to LinkedIn
- This is more reliable for serverless/container environments
- BullMQ workers are initialized but schedulers don't run consistently
- Redis connection may still fail if REDIS_URL not configured (check logs)

## Files Modified

- Added diagnostics endpoint in `server/index.js` (committed)
- Needs: `render.yaml` update + CRON_SECRET env var
