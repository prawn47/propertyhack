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

  const { industry, keywords } = userSettings;
  
  // Parse JSON strings from database
  const newsCategories = userSettings.newsCategories ? 
    (typeof userSettings.newsCategories === 'string' ? JSON.parse(userSettings.newsCategories) : userSettings.newsCategories) : [];
  const newsLanguages = userSettings.newsLanguages ? 
    (typeof userSettings.newsLanguages === 'string' ? JSON.parse(userSettings.newsLanguages) : userSettings.newsLanguages) : ['eng'];
  const newsSources = userSettings.newsSources ? 
    (typeof userSettings.newsSources === 'string' ? JSON.parse(userSettings.newsSources) : userSettings.newsSources) : [];

  // Build query based on user settings
  const query = buildNewsAPIQuery(industry, keywords, newsCategories);

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

    // Add language filter if specified
    if (newsLanguages && newsLanguages.length > 0) {
      requestBody.query.$query.lang = newsLanguages;
    }

    // Add source filter if specified
    if (newsSources && newsSources.length > 0) {
      requestBody.query.$query.sourceUri = { $in: newsSources };
    }

    const response = await fetch(`${NEWSAPI_BASE_URL}/article/getArticles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

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
 * Build NewsAPI.ai query based on user settings
 */
function buildNewsAPIQuery(industry, keywords, categories) {
  const keywordList = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
  
  // Build query with keywords and industry
  const queryTerms = [];
  
  if (industry) {
    queryTerms.push({ keyword: industry, keywordLoc: 'title,body' });
  }
  
  if (keywordList.length > 0) {
    keywordList.forEach(kw => {
      queryTerms.push({ keyword: kw, keywordLoc: 'title,body' });
    });
  }

  // Add category filter if specified
  if (categories && categories.length > 0) {
    queryTerms.push({ categoryUri: { $in: categories } });
  }

  // Date filter - last 7 days
  const dateEnd = new Date();
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 7);

  return {
    $query: {
      $and: queryTerms.length > 0 ? queryTerms : [{ keyword: 'business', keywordLoc: 'title,body' }],
    },
    $filter: {
      forceMaxDataTimeWindow: '7',
      dateStart: dateStart.toISOString().split('T')[0],
      dateEnd: dateEnd.toISOString().split('T')[0],
    }
  };
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
