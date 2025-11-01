# 🚨 Setup Required: News Curation Feature

## Immediate Action Required

Add Perplexity API key to your environment:

1. **Get API Key:**
   - Go to: https://www.perplexity.ai/settings/api
   - Create account if needed
   - Generate API key

2. **Add to server/.env:**
   ```bash
   PERPLEXITY_API_KEY=your_actual_api_key_here
   ```

3. **Restart Backend:**
   ```bash
   cd server
   npm run dev
   ```

## Verify It's Working

### Backend Logs
You should see:
```
📰 News curation worker started (interval 10m)
```

### Test Manually
1. Open http://localhost:3004
2. Look for "📰 News For You" section on homepage
3. Click "🔄 Refresh" button
4. Articles should appear (5-7 cards)

## Cost Info
- **Model:** `llama-3.1-sonar-small-128k-online` (lowest cost)
- **Per User:** ~$0.02/day (~$0.60/month)
- **100 Users:** ~$60/month
- **Frequency:** Once per day at 6 AM user time

## If Something Breaks
- Check `TEMP_FILES/news_curation_feature.md` for troubleshooting
- Scheduler runs every 10 minutes (not immediately)
- First fetch happens 5 seconds after server starts OR at user's 6 AM
