/**
 * Perplexity AI service for fetching curated news articles
 * based on user interests and settings
 */

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Fetch curated news articles for a user based on their settings
 * @param {Object} userSettings - User settings containing industry, keywords, position, etc.
 * @returns {Promise<Array>} Array of news articles
 */
async function fetchCuratedNews(userSettings) {
  if (!PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY not configured');
    throw new Error('Perplexity API key not configured');
  }

  const { industry, keywords, position, audience, postGoal } = userSettings;

  // Build search query based on user settings
  const searchQuery = buildSearchQuery(industry, keywords, position, audience, postGoal);

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a news curator. Return ONLY a valid JSON array of news articles. Each article must have: title, summary (2-3 sentences), url, source, publishedAt (ISO date or null), category. No markdown, no explanation, just the JSON array.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in Perplexity response:', data);
      return [];
    }

    // Parse the JSON response
    const articles = parseArticlesFromResponse(content);
    return articles;

  } catch (error) {
    console.error('Error fetching news from Perplexity:', error);
    throw error;
  }
}

/**
 * Build search query based on user settings
 */
function buildSearchQuery(industry, keywords, position, audience, postGoal) {
  const keywordList = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
  
  let query = `Find 5-7 recent news articles (from the last 7 days) relevant to:\n`;
  query += `- Industry: ${industry}\n`;
  query += `- Position/Role: ${position}\n`;
  if (keywordList.length > 0) {
    query += `- Keywords: ${keywordList.join(', ')}\n`;
  }
  query += `- Target audience: ${audience}\n`;
  query += `- Content goal: ${postGoal}\n\n`;
  query += `Focus on:\n`;
  query += `1. News that would be valuable to comment on for LinkedIn posts\n`;
  query += `2. Industry trends, innovations, and insights\n`;
  query += `3. Articles that spark professional discussion\n`;
  query += `4. Recent developments (last 7 days preferred)\n\n`;
  query += `Return as JSON array with fields: title, summary, url, source, publishedAt, category`;

  return query;
}

/**
 * Parse articles from Perplexity response
 */
function parseArticlesFromResponse(content) {
  try {
    // Try to extract JSON from the response
    // Sometimes the response might have markdown code blocks
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const articles = JSON.parse(jsonStr);
    
    if (!Array.isArray(articles)) {
      console.error('Parsed response is not an array:', articles);
      return [];
    }

    // Validate and normalize articles
    return articles.map(article => ({
      title: article.title || 'Untitled',
      summary: article.summary || '',
      content: article.content || null,
      url: article.url || '#',
      source: article.source || 'Unknown',
      publishedAt: article.publishedAt || null,
      category: article.category || industry,
      relevanceScore: article.relevanceScore || 0.8,
    })).filter(article => article.title && article.summary);

  } catch (error) {
    console.error('Error parsing articles from response:', error);
    console.error('Response content:', content);
    return [];
  }
}

module.exports = {
  fetchCuratedNews,
};
