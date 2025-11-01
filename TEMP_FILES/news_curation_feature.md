# News Curation Feature

## Overview
Curated news articles are automatically fetched daily at 6 AM user time using Perplexity AI, tailored to each user's interests from their settings.

## Setup

### 1. Environment Variables

Add to `server/.env`:
```bash
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

Get your API key from: https://www.perplexity.ai/settings/api

### 2. Database Migration
Already completed - NewsArticle model added to schema.

## Features

### Automated News Fetching
- Runs every 10 minutes, checks if it's 6 AM in each user's timezone
- Fetches 5-7 recent articles (last 7 days) based on user settings:
  - Industry
  - Keywords
  - Position/Role
  - Target audience
  - Content goals
- Stores up to 50 most recent articles per user
- Tracks which articles have been read

### News Carousel UI
- Horizontal scrolling carousel of news articles
- Each card shows:
  - Source name and publication date
  - Article title and summary
  - Category tag
  - "Comment & Post" button
  - Link to original article
- Read articles appear dimmed
- Manual refresh button available

### Post Creation Integration
- Click "Comment & Post" on any article
- Pre-fills topic with article title
- Article context automatically included in AI generation:
  - Article title, source, summary, and URL
  - AI generates post ideas that reference the article
- User can clear article context at any time

## API Endpoints

### GET /api/news
Fetch user's curated news articles
Query params:
- `limit` (default: 20) - max articles to return
- `unread` (true/false) - filter unread only

### POST /api/news/refresh
Manually trigger news refresh for current user

### PATCH /api/news/:id/read
Mark article as read

### DELETE /api/news/:id
Delete a news article

## Backend Services

### perplexityService.js
- `fetchCuratedNews(userSettings)` - Fetches articles from Perplexity API
- Uses `llama-3.1-sonar-small-128k-online` model for real-time web search
- Returns structured JSON with: title, summary, url, source, publishedAt, category

### News Scheduler
- Location: `server/index.js`
- Runs every 10 minutes
- Checks each user's timezone
- Fetches news only at 6 AM (within the hour)
- Prevents duplicate fetches (23-hour cooldown)
- Gracefully handles errors per user

## User Experience

1. **Homepage Load**: News carousel appears below "What's On Your Mind"
2. **Browse Articles**: Scroll through curated news
3. **Comment on Article**: 
   - Click "Comment & Post" button
   - Topic auto-filled with article title
   - Article badge shows which article you're commenting on
   - Generate ideas → AI includes article context
   - Create post with article reference
4. **Read Original**: Click 🔗 to open article in new tab
5. **Manual Refresh**: Click refresh button to fetch new articles anytime

## Testing

### Test News Fetching
```bash
# From frontend, click Refresh button in NewsCarousel
# Or wait for 6 AM in your timezone
```

### Test Article Context in Posts
1. Click "Comment & Post" on an article
2. Click "Generate Ideas"
3. Select an idea
4. Verify generated post references the article

### Check Scheduler Logs
```bash
cd server
npm run dev
# Watch for:
# [news-scheduler] Fetching news for user...
# [news-scheduler] Saved X articles for user...
```

## Configuration

### Adjust Fetch Frequency
Edit `server/index.js`:
```javascript
// Current: every 10 minutes
newsWorkerInterval = setInterval(processNewsForUsers, 10 * 60 * 1000);

// Change to every hour:
newsWorkerInterval = setInterval(processNewsForUsers, 60 * 60 * 1000);
```

### Adjust Fetch Time
Edit `server/index.js` in `processNewsForUsers()`:
```javascript
// Current: 6 AM
if (userHour !== 6) continue;

// Change to 8 AM:
if (userHour !== 8) continue;
```

### Adjust Article Retention
Edit `server/routes/news.js`:
```javascript
// Current: keep last 50 articles
if (existingCount > 50) {
  // Change to 100:
  if (existingCount > 100) {
```

## Troubleshooting

### No articles appearing
1. Check PERPLEXITY_API_KEY is set
2. Click manual refresh button
3. Check server logs for errors
4. Verify user has settings configured

### Articles not relevant
1. Update user settings (industry, keywords, position)
2. Settings are in Settings page
3. Refresh news after updating settings

### Scheduler not running
1. Check server logs for "News curation worker started"
2. Verify scheduler interval is running
3. Check for timezone parsing errors in logs

## Cost Considerations

**Perplexity API Usage:**
- Each user: 1 fetch per day
- Each fetch: ~2000 tokens (~$0.02 per user per day)
- 100 users: ~$2/day = ~$60/month
- Model: `llama-3.1-sonar-small-128k-online` (lowest cost)

**Optimization:**
- Fetches only at 6 AM (once per 24 hours)
- Only for active users (those with settings)
- Cached for 23 hours (prevents duplicate fetches)
