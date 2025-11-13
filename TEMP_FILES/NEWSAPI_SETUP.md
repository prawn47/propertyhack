# NewsAPI Setup Guide

## What You Get

**Automated Daily Workflow:**
1. ⏰ **5 AM AEST** - System fetches 50 Australian property articles from NewsAPI
2. 🤖 **AI Auto-Processing** (for each article):
   - Generates SEO-optimized summary using your admin tone/style
   - Creates custom property image with DALL-E
   - Generates descriptive alt text
   - Extracts focus keywords
   - Populates title, slug, meta description
   - Adds source URL with attribution
   - **Saves as DRAFT** (not published)
3. 👤 **Admin Review**:
   - See all fetched articles in your Articles list (status: draft)
   - Click article to review/edit
   - Click "Publish" to make it live

## Setup Instructions

### 1. Get Your NewsAPI Key

1. Go to https://newsapi.org/register
2. Sign up for free account
3. Copy your API key

### 2. Add to Environment Variables

Edit `server/.env` and add:

```bash
NEWSAPI_KEY=your_api_key_here
```

### 3. Restart Server

```bash
cd /Users/dan/Projects/propertyhack
./stop.sh
./start.sh
```

## Testing

### Manual Fetch (Test Now)

1. Login to http://localhost:3004
2. Go to Articles page
3. Click "📰 Fetch Latest News" button
4. Wait 2-3 minutes
5. Refresh page - you'll see new draft articles!

### Automatic Daily Fetch

- Runs every day at **5 AM AEST**
- Check logs: `tail -f /Users/dan/Projects/propertyhack/backend.log`
- Look for: `[Daily News Fetch] Starting...`

## How It Works

### Cron Schedule
- Timezone: UTC
- Schedule: `0 19 * * *` (7 PM UTC = 5 AM AEST)
- During daylight saving, adjust to `0 18 * * *` (6 PM UTC)

### NewsAPI Query
```
Query: (property OR "real estate" OR housing) AND Australia
Sources: domain.com.au, realestate.com.au, afr.com, news.com.au, etc.
Results: Up to 50 articles from last 24 hours
```

### AI Processing
Each article goes through:
1. **Summary Generation** (OpenAI GPT-4):
   - Uses focus keywords
   - SEO-optimized structure
   - 300-500 words
   
2. **Image Generation** (DALL-E 3):
   - Professional editorial style
   - Australian property theme
   - 1792x1024 high quality
   
3. **Keyword Extraction**:
   - Auto-detects: "sydney property", "housing market", etc.
   - Max 4 keywords per article

### Duplicate Prevention
- System checks source URL before processing
- Skips articles already in database
- No duplicates!

## Monitoring

### View Queue Status
http://localhost:3001/system/queue-status

### Backend Logs
```bash
# Watch live logs
tail -f /Users/dan/Projects/propertyhack/backend.log

# Search for news fetch
grep "Daily News Fetch" /Users/dan/Projects/propertyhack/backend.log
```

### Worker Logs
Look for:
```
[article-processing-worker] Processing article: ...
[article-processing-worker] Generating AI summary...
[article-processing-worker] Generating AI image...
✅ Article processed successfully
```

## Costs (Estimate)

**NewsAPI:**
- Free tier: 100 requests/day
- Your usage: 1 request/day ✅

**OpenAI (per article):**
- GPT-4 summary: ~$0.03
- DALL-E 3 image: ~$0.04
- Alt text (GPT-3.5): ~$0.001
- **Total per article: ~$0.07**

**Daily cost (50 articles):**
- ~$3.50/day
- ~$105/month

## Customization

### Change Fetch Time
Edit `server/jobs/dailyNewsFetch.js`:
```js
const cronSchedule = '0 19 * * *'; // Change this
```

### Change Number of Articles
Edit `server/services/newsApiService.js`:
```js
pageSize: 50, // Change this (max 100)
```

### Add More News Sources
Edit `server/services/newsApiService.js`:
```js
domains: 'domain.com.au,yoursite.com,etc',
```

### Customize AI Style
Admin settings will be used (coming soon - currently uses default professional tone)

## Troubleshooting

### No articles appearing?
1. Check NEWSAPI_KEY is set in server/.env
2. Check logs: `tail -f backend.log`
3. Try manual fetch button
4. Check Redis is running: `redis-cli ping`

### Worker not processing?
1. Restart server: `./stop.sh && ./start.sh`
2. Check queue status: http://localhost:3001/system/queue-status
3. Check Redis: `brew services list | grep redis`

### Cron not running?
1. Check server logs for: `Daily news fetch scheduled`
2. Verify time: Is it 5 AM AEST?
3. Test manual trigger first

## Next Steps

Once you have your NewsAPI key:
1. Add it to `server/.env`
2. Restart server
3. Click "Fetch Latest News" to test
4. Review the AI-generated drafts
5. Edit/publish your favorites!
