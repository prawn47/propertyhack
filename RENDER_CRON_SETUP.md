# Render Cron Job Setup for Scheduled Posts

## Problem
The previous BullMQ + Redis scheduler doesn't work on Render because:
- Web services don't persist background processes
- In-memory setInterval gets cleared on restarts
- Redis isn't included by default

## Solution
Use **Render Cron Jobs** to call a webhook endpoint every 1-2 minutes.

---

## Setup Instructions

### 1. Add Environment Variable to Backend (Render Dashboard)

Go to your backend service on Render → Environment tab → Add:

```
CRON_SECRET=<generate-random-secret-here>
```

**Generate secret:**
```bash
# Run locally to generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `CRON_SECRET`.

### 2. Create Render Cron Job

1. Go to Render Dashboard → **New +** → **Cron Job**
2. Configure:
   - **Name**: `quord-scheduled-posts-processor`
   - **Region**: Same as your backend service
   - **Command**: 
     ```bash
     curl -X POST https://YOUR-BACKEND-URL.onrender.com/api/cron/process-scheduled-posts \
       -H "X-Cron-Secret: YOUR_CRON_SECRET_HERE" \
       -H "Content-Type: application/json"
     ```
   - **Schedule**: Every 2 minutes
     - Cron expression: `*/2 * * * *`
   - **Environment**: Same as backend (to share DB connection)

3. Click **Create Cron Job**

### 3. Verify Setup

**Test the endpoint manually:**
```bash
curl -X POST https://YOUR-BACKEND-URL.onrender.com/api/cron/process-scheduled-posts \
  -H "X-Cron-Secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "success": true,
  "timestamp": "2025-11-06T05:42:00.000Z",
  "processed": 2,
  "failed": 0,
  "skipped": 0,
  "errors": []
}
```

**Check health:**
```bash
curl https://YOUR-BACKEND-URL.onrender.com/api/cron/health
```

### 4. Monitor Logs

- **Backend logs**: Render Dashboard → Your backend service → Logs
  - Look for: `[cron] Found X due posts`
  - Look for: `[cron] ✓ Published post X`
- **Cron job logs**: Render Dashboard → Your cron job → Logs
  - Should show curl output every 2 minutes

---

## How It Works

1. **Cron job** runs every 2 minutes
2. Calls `/api/cron/process-scheduled-posts` with secret header
3. Backend queries `ScheduledPost` table for due posts
4. Posts directly to LinkedIn API (no queue needed)
5. Moves to `PublishedPost` table and deletes from `ScheduledPost`

---

## Alternative: GitHub Actions (Free)

If you don't want to use Render Cron Jobs, use GitHub Actions:

**.github/workflows/scheduled-posts.yml:**
```yaml
name: Process Scheduled Posts

on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cron endpoint
        run: |
          curl -X POST https://YOUR-BACKEND-URL.onrender.com/api/cron/process-scheduled-posts \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

**Setup:**
1. Add `CRON_SECRET` to GitHub repo secrets (Settings → Secrets → New secret)
2. Commit the workflow file
3. GitHub Actions will run automatically

---

## Cleanup: Remove BullMQ Dependencies (Optional)

Since we're no longer using BullMQ, you can optionally remove:

1. **Remove packages:**
   ```bash
   cd server
   npm uninstall bullmq ioredis
   ```

2. **Remove imports from server/index.js:**
   - Lines 17-20 (queue/worker imports)
   - Lines 135-256 (scheduler functions and intervals)

3. **Delete files:**
   - `server/queues/`
   - `server/workers/`

4. **Remove from .env:**
   - `REDIS_URL`

---

## Benefits

✅ **Works on all Render plans** (including free tier)  
✅ **No Redis required**  
✅ **Survives backend restarts**  
✅ **Simple and reliable**  
✅ **Easy to monitor via logs**

---

## Testing Scheduled Posts

1. Create a scheduled post 2-3 minutes in the future
2. Wait for next cron run (max 2 minutes)
3. Check backend logs for `[cron] ✓ Published post X`
4. Verify post appears on LinkedIn
5. Check post moved from Scheduled to Published in DB
