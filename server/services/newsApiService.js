const axios = require('axios');

/**
 * Fetch Australian property news from NewsAPI
 * @param {string} apiKey - NewsAPI key
 * @returns {Promise<Array>} Array of articles
 */
async function fetchAustralianPropertyNews(apiKey) {
  try {
    const url = 'https://newsapi.org/v2/everything';
    
    // Calculate date range (last 7 days for more results)
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const params = {
      apiKey,
      q: 'property OR "real estate" OR housing OR "property market"',
      language: 'en',
      from,
      to,
      sortBy: 'publishedAt',
      pageSize: 100, // Get up to 100 articles
      // Filter to Australian sources (removed domain restriction - will filter by content instead)
    };
    
    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${response.data.message || 'Unknown error'}`);
    }
    
    // Filter and format articles
    const articles = response.data.articles
      .filter(article => {
        // Basic quality filters
        const title = (article.title || '').toLowerCase();
        const desc = (article.description || '').toLowerCase();
        const content = (article.content || '').toLowerCase();
        const url = (article.url || '').toLowerCase();
        
        // Must have basic fields
        if (!article.title || !article.description || !article.url || !article.source?.name) return false;
        if (article.title === '[Removed]' || article.description === '[Removed]') return false;
        
        // Must be Australian content (check URL or content)
        const isAustralian = 
          url.includes('.au') ||
          title.includes('australia') || desc.includes('australia') || content.includes('australia') ||
          title.match(/sydney|melbourne|brisbane|perth|adelaide|canberra|hobart|darwin/) ||
          desc.match(/sydney|melbourne|brisbane|perth|adelaide|canberra|hobart|darwin/);
        
        return isAustralian;
      })
      .map(article => ({
        title: article.title,
        description: article.description,
        content: article.content || article.description,
        url: article.url,
        sourceName: article.source.name,
        sourceUrl: article.source.url || extractDomain(article.url),
        publishedAt: article.publishedAt,
        imageUrl: article.urlToImage,
        author: article.author,
      }));
    
    console.log(`✅ Fetched ${articles.length} Australian property articles from NewsAPI`);
    return articles;
    
  } catch (error) {
    console.error('❌ Failed to fetch from NewsAPI:', error.message);
    throw error;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return '';
  }
}

/**
 * Fetch top headlines specifically about Australian property
 * Alternative endpoint with better relevance
 */
async function fetchAustralianPropertyHeadlines(apiKey) {
  try {
    const url = 'https://newsapi.org/v2/top-headlines';
    
    const params = {
      apiKey,
      country: 'au',
      category: 'business',
      q: 'property OR "real estate" OR housing',
      pageSize: 20,
    };
    
    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${response.data.message || 'Unknown error'}`);
    }
    
    const articles = response.data.articles
      .filter(article => article.title !== '[Removed]')
      .map(article => ({
        title: article.title,
        description: article.description,
        content: article.content || article.description,
        url: article.url,
        sourceName: article.source.name,
        sourceUrl: extractDomain(article.url),
        publishedAt: article.publishedAt,
        imageUrl: article.urlToImage,
        author: article.author,
      }));
    
    console.log(`✅ Fetched ${articles.length} Australian property headlines from NewsAPI`);
    return articles;
    
  } catch (error) {
    console.error('❌ Failed to fetch headlines from NewsAPI:', error.message);
    throw error;
  }
}

module.exports = {
  fetchAustralianPropertyNews,
  fetchAustralianPropertyHeadlines,
};
