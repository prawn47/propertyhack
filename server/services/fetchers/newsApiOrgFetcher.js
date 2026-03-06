const axios = require('axios');

async function fetch(sourceConfig) {
  const { keywords, country, category, pageSize = 100 } = sourceConfig;

  if (!keywords || keywords.length === 0) {
    throw new Error('NewsAPI.org source config missing keywords');
  }

  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) {
    throw new Error('NEWSAPI_API_KEY environment variable not set');
  }

  const query = keywords.join(' OR ');
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  let response;

  if (country || category) {
    response = await makeRequest('https://newsapi.org/v2/top-headlines', {
      apiKey,
      q: query,
      country,
      category,
      pageSize: Math.min(pageSize, 100),
    });
  } else {
    response = await makeRequest('https://newsapi.org/v2/everything', {
      apiKey,
      q: query,
      language: 'en',
      from,
      to,
      sortBy: 'publishedAt',
      pageSize: Math.min(pageSize, 100),
    });
  }

  if (response.data.status !== 'ok') {
    throw new Error(`NewsAPI.org error: ${response.data.message || 'Unknown error'}`);
  }

  const articles = response.data.articles
    .filter(article => {
      if (!article.title || !article.url) return false;
      if (article.title.includes('[Removed]')) return false;
      if ((article.content || '').includes('[Removed]')) return false;
      return true;
    })
    .map(article => ({
      title: article.title,
      content: article.content || article.description || '',
      url: article.url,
      imageUrl: article.urlToImage || null,
      date: article.publishedAt || null,
      author: article.author || null,
      sourceName: article.source?.name || 'NewsAPI',
    }));

  return articles;
}

async function makeRequest(url, params) {
  try {
    return await axios.get(url, { params });
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 429) {
        throw new Error('NewsAPI.org rate limit exceeded (429) — try again later');
      }
      if (status === 401) {
        throw new Error('NewsAPI.org authentication failed (401) — check NEWSAPI_API_KEY');
      }
      if (status >= 500) {
        throw new Error(`NewsAPI.org server error (${status})`);
      }
    }
    throw new Error(`NewsAPI.org request failed: ${err.message}`);
  }
}

module.exports = { fetch };
