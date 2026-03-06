const axios = require('axios');

const NEWSAPI_AI_URL = 'https://eventregistry.org/api/v1/article/getArticles';

async function fetch(sourceConfig) {
  const { keywords, categories, sourceLocations, maxItems = 50 } = sourceConfig;

  if (!keywords || keywords.length === 0) {
    throw new Error('NewsAPI.ai source config missing keywords');
  }

  const apiKey = process.env.NEWSAPI_AI_KEY;
  if (!apiKey) {
    throw new Error('NEWSAPI_AI_KEY not configured');
  }

  const body = {
    action: 'getArticles',
    keyword: keywords,
    lang: 'eng',
    articlesSortBy: 'date',
    articlesCount: maxItems,
    apiKey,
  };

  if (categories && categories.length > 0) {
    body.categoryUri = categories;
  }

  if (sourceLocations && sourceLocations.length > 0) {
    body.sourceLocationUri = sourceLocations;
  }

  let response;
  try {
    response = await axios.post(NEWSAPI_AI_URL, body);
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 401) {
        throw new Error('NewsAPI.ai authentication failed (401) — check NEWSAPI_AI_KEY');
      }
      if (status === 429) {
        throw new Error('NewsAPI.ai rate limit exceeded (429) — try again later');
      }
      if (status >= 500) {
        throw new Error(`NewsAPI.ai server error (${status})`);
      }
    }
    throw new Error(`NewsAPI.ai request failed: ${err.message}`);
  }

  const articles = response.data?.articles?.results;
  if (!articles || articles.length === 0) {
    return [];
  }

  return articles
    .filter(article => article.title && article.url)
    .map(article => ({
      title: article.title,
      content: article.body || article.description || '',
      url: article.url,
      imageUrl: article.image || null,
      date: article.dateTimePub || article.dateTime || null,
      author: article.authors?.[0]?.name || null,
      sourceName: article.source?.title || 'NewsAPI.ai',
    }));
}

module.exports = { fetch };
