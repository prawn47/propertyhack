# News Curation User Preferences - FIXED

## Issues Fixed

### 1. Missing Country Filter
**Problem**: Users could select countries in Settings but they were not being applied to the news API query.

**Fix**: Added `newsCountries` filter to the NewsAPI.ai query with proper URI mapping:
```javascript
if (newsCountries && newsCountries.length > 0) {
  requestBody.query.$query.sourceLocationUri = newsCountries.map(c => `http://en.wikipedia.org/wiki/${c}`);
}
```

### 2. Missing Category Filter  
**Problem**: Users could select categories in Settings but they were not being applied as query filters.

**Fix**: Added `newsCategories` filter with OR logic:
```javascript
if (newsCategories && newsCategories.length > 0) {
  requestBody.query.$query.categoryUri = { $or: newsCategories };
}
```

### 3. No Visibility into API Configuration
**Problem**: No way for Super Admins to see or modify how user preferences are applied to news API calls.

**Fix**: Created `news_curation` system prompt that documents:
- Which user settings are applied (keywords, industry, categories, languages, sources, countries)
- Priority levels for each setting
- Query building logic
- API limits and constraints
- Troubleshooting guidance

This prompt is now accessible via Super Admin Settings panel.

## User Preferences Now Fully Supported

All settings from the "News Preferences" section in Settings are now applied:

1. ✅ **Keywords** (`settings.keywords`) - Used in title/body matching
2. ✅ **Industry** (`settings.industry`) - Highest priority keyword
3. ✅ **Categories** (`settings.newsCategories`) - Filter by topic (Business, Tech, Science, etc.)
4. ✅ **Languages** (`settings.newsLanguages`) - Filter by language with englishVariant fallback
5. ✅ **Sources** (`settings.newsSources`) - Filter by specific publications
6. ✅ **Countries** (`settings.newsCountries`) - Filter by source location (USA, UK, Canada, etc.)

## How to Test

1. Go to Settings → News Preferences
2. Select specific categories (e.g., Technology, Finance)
3. Select specific countries (e.g., United States, United Kingdom)
4. Add custom keywords in the "Keywords to include" field
5. Wait for next scheduled news fetch (6 AM user's local time) OR manually trigger via:
   - Backend logs will show: `[NewsAPI] News preferences: categories=[...], sources=X, countries=[...]`

## Super Admin Access

As a Super Admin, you can now:
1. Click "⚙️ Super Admin" in Settings
2. View the `news_curation` system prompt
3. Edit the documentation or logic descriptions
4. This serves as living documentation for how news curation works

## Files Modified

- `server/services/perplexityService.js` - Added country and category filters
- `server/seed_news_prompt.js` - Created (seed script, can be deleted after run)
- Database: `system_prompts` table - Added `news_curation` entry

## Next Steps

Consider testing with a real user by:
1. Setting specific preferences in their Settings
2. Checking backend logs for the next news curation run
3. Verifying articles in NewsCarousel match their preferences
