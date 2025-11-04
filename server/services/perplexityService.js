/**
 * NewsAPI.ai service for fetching curated news articles
 * based on user interests and settings
 */

const NEWSAPI_API_KEY = process.env.NEWSAPI_API_KEY;
const NEWSAPI_BASE_URL = 'https://newsapi.ai/api/v1';

/**
 * Fetch curated news articles for a user based on their settings
 * @param {Object} userSettings - User settings containing industry, keywords, position, etc.
 * @returns {Promise<Array>} Array of news articles
 */
async function fetchCuratedNews(userSettings) {
  if (!NEWSAPI_API_KEY) {
    console.error('NEWSAPI_API_KEY not configured');
    throw new Error('NewsAPI.ai API key not configured');
  }

  const { industry, keywords, position, audience, englishVariant } = userSettings;
  
  // Parse JSON strings from database
  const newsCategories = userSettings.newsCategories ? 
    (typeof userSettings.newsCategories === 'string' ? JSON.parse(userSettings.newsCategories) : userSettings.newsCategories) : [];
  const newsLanguages = userSettings.newsLanguages ? 
    (typeof userSettings.newsLanguages === 'string' ? JSON.parse(userSettings.newsLanguages) : userSettings.newsLanguages) : ['eng'];
  const newsSources = userSettings.newsSources ? 
    (typeof userSettings.newsSources === 'string' ? JSON.parse(userSettings.newsSources) : userSettings.newsSources) : [];
  
  // Map englishVariant to language code if newsLanguages is default
  const effectiveLanguages = mapLanguagePreferences(newsLanguages, englishVariant);
  console.log(`[NewsAPI] Language preferences: newsLanguages=${JSON.stringify(newsLanguages)}, englishVariant=${englishVariant}, effective=${JSON.stringify(effectiveLanguages)}`);

  // Build query based on user settings (include more user interests)
  const query = buildNewsAPIQuery(industry, keywords, position, audience, newsCategories);
  console.log(`[NewsAPI] User interests: industry=${industry}, position=${position}, audience=${audience}, keywords=${keywords}`);

  try {
    const requestBody = {
      apiKey: NEWSAPI_API_KEY,
      query: query,
      resultType: 'articles',
      articlesSortBy: 'date',
      articlesCount: 7,
      includeArticleImage: true,
      includeArticleBody: true,
      articleBodyLen: 300,
    };

    // Add language filter (use effective languages which include englishVariant mapping)
    if (effectiveLanguages && effectiveLanguages.length > 0) {
      requestBody.query.$query.lang = effectiveLanguages;
    }

    // Add source filter if specified
    if (newsSources && newsSources.length > 0) {
      requestBody.query.$query.sourceUri = { $in: newsSources };
    }

    console.log('[NewsAPI] Fetching with query:', JSON.stringify(requestBody.query, null, 2));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${NEWSAPI_BASE_URL}/article/getArticles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NewsAPI.ai error:', response.status, errorText);
      throw new Error(`NewsAPI.ai error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.articles || !data.articles.results) {
      console.error('No articles in NewsAPI.ai response:', data);
      return [];
    }

    // Parse and normalize articles
    const articles = data.articles.results.map(article => ({
      title: article.title || 'Untitled',
      summary: article.body ? article.body.substring(0, 300) + '...' : '',
      content: article.body || null,
      url: article.url || '#',
      source: article.source?.title || 'Unknown',
      publishedAt: article.dateTime || null,
      category: extractCategory(article, newsCategories),
      relevanceScore: article.relevance || 0.8,
    })).filter(article => article.title && article.summary);

    return articles;

  } catch (error) {
    console.error('Error fetching news from NewsAPI.ai:', error);
    throw error;
  }
}

/**
 * Map englishVariant and newsLanguages to effective language codes
 */
function mapLanguagePreferences(newsLanguages, englishVariant) {
  // If user has explicitly selected languages, respect that
  if (newsLanguages && newsLanguages.length > 0 && !(newsLanguages.length === 1 && newsLanguages[0] === 'eng')) {
    return newsLanguages;
  }
  
  // Otherwise, map englishVariant to appropriate language/region
  // NewsAPI.ai uses ISO 639-3 codes
  const variantMap = {
    'American': ['eng'],
    'British': ['eng'],
    'Australian': ['eng'],
    // Could extend with other variants if needed
  };
  
  return variantMap[englishVariant] || ['eng'];
}

/**
 * Build NewsAPI.ai query based on user settings
 */
function buildNewsAPIQuery(industry, keywords, position, audience, categories) {
  const keywordList = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
  
  // Build comprehensive OR query with all user interests
  // Limit to 10 keywords to stay well under API limit of 15
  const keywordConditions = [];
  
  // Priority 1: Industry (highest relevance)
  if (industry && keywordConditions.length < 10) {
    keywordConditions.push({ keyword: industry, keywordLoc: 'title,body' });
  }
  
  // Priority 2: User-specified keywords (most specific)
  if (keywordList.length > 0 && keywordConditions.length < 10) {
    const remainingSlots = 10 - keywordConditions.length;
    keywordList.slice(0, remainingSlots).forEach(kw => {
      keywordConditions.push({ keyword: kw, keywordLoc: 'title,body' });
    });
  }

  // If no keywords, use a default
  if (keywordConditions.length === 0) {
    keywordConditions.push({ keyword: 'business OR technology', keywordLoc: 'title,body' });
  }

  // Use OR instead of AND for more results
  const query = {
    $query: {
      $or: keywordConditions
    }
  };

  return query;
}

/**
 * Extract category from article
 */
function extractCategory(article, preferredCategories) {
  if (article.categories && article.categories.length > 0) {
    return article.categories[0].label || 'Business';
  }
  if (preferredCategories && preferredCategories.length > 0) {
    return preferredCategories[0];
  }
  return 'Business';
}


module.exports = {
  fetchCuratedNews,
};
