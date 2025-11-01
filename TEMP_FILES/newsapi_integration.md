# NewsAPI.ai Integration

## Summary
Replaced Perplexity AI with NewsAPI.ai for fetching curated news articles. Added user-customizable news preferences in Settings.

## Environment Variable
**Updated:**
- ❌ ~~`PERPLEXITY_API_KEY`~~
- ✅ `NEWSAPI_API_KEY` (already set in server/.env)

## New Features

### User News Preferences
Users can now customize their news feed in Settings → News Preferences:

**Languages** (8 options):
- English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese

**Categories** (6 options):
- Business, Technology, Science, Health, Finance, Politics

**Countries** (8 options):
- USA, UK, Canada, Australia, Germany, France, China, Japan

### Database Changes
Added to `UserSettings` model:
- `newsCategories` - JSON array of category URIs
- `newsLanguages` - JSON array of language codes (default: ["eng"])
- `newsSources` - JSON array of source URIs
- `newsCountries` - JSON array of country codes

### API Changes
**NewsAPI.ai Endpoint:** `https://newsapi.ai/api/v1/article/getArticles`

**Query Parameters:**
- `articlesCount`: 7
- `articlesSortBy`: date
- `forceMaxDataTimeWindow`: 7 days
- Keyword matching in title/body
- Language and category filtering
- Source filtering (if configured)

**Response Mapping:**
- `article.title` → title
- `article.body` (first 300 chars) → summary
- `article.url` → url
- `article.source.title` → source
- `article.dateTime` → publishedAt
- `article.categories` → category

## How It Works

1. **User configures preferences** in Settings page
2. **Preferences saved** to database as JSON strings
3. **News scheduler** (runs every 10 min, fetches at 6 AM user time)
4. **Service fetches** from NewsAPI.ai with user's filters
5. **Articles stored** in NewsArticle table (up to 50 per user)
6. **User sees** personalized news carousel on homepage

## Testing

### Manual Test
1. Go to Settings → News Preferences
2. Select languages, categories, and countries
3. Click "Save and Close"
4. Go back to Home
5. Click "Refresh" button in News carousel
6. Articles should match selected preferences

### Check Logs
```bash
tail -f backend.log | grep news
```

Look for:
```
[news-scheduler] Fetching news for user...
[news-scheduler] Saved X articles for user...
```

## API Comparison

| Feature | Perplexity | NewsAPI.ai |
|---------|-----------|-----------|
| **Model** | LLM-based | REST API |
| **Response** | AI-generated JSON | Structured data |
| **Filtering** | Prompt-based | Query parameters |
| **Languages** | Limited | 50+ languages |
| **Categories** | AI interpretation | Taxonomy-based |
| **Cost/request** | ~$0.02 | ~$0.001 |
| **Reliability** | AI variability | Consistent |

## Benefits

1. **More Reliable:** Structured API vs AI generation
2. **More Control:** Direct filtering vs prompt engineering
3. **Cost Effective:** ~20x cheaper per request
4. **Better UX:** Users can customize preferences
5. **Multilingual:** Support for 50+ languages
6. **Faster:** Direct API vs LLM processing

## Future Enhancements

- Add source selection UI (specific news outlets)
- Add date range selector (beyond 7 days)
- Add keywords specific to news (separate from post keywords)
- Add relevance threshold slider
- Add "favorite sources" feature
