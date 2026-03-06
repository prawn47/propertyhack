const axios = require('axios');

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const SYSTEM_PROMPT =
  'You are a property news researcher. Find recent property news articles. For each article, return JSON with fields: title, url, summary, date, sourceName. Return a JSON array.';

async function fetch(sourceConfig) {
  const { searchQueries, maxResults = 20 } = sourceConfig;

  if (!searchQueries || searchQueries.length === 0) {
    throw new Error('Perplexity source config missing searchQueries');
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const allArticles = [];

  for (const query of searchQueries) {
    let response;
    try {
      response = await axios.post(
        PERPLEXITY_API_URL,
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Find recent property news articles about: ${query}. Return up to ${maxResults} articles as a JSON array.`,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        if (status === 401) {
          throw new Error('Perplexity authentication failed (401) — check PERPLEXITY_API_KEY');
        }
        if (status === 429) {
          throw new Error('Perplexity rate limit exceeded (429) — try again later');
        }
        if (status >= 500) {
          throw new Error(`Perplexity server error (${status})`);
        }
      }
      throw new Error(`Perplexity request failed: ${err.message}`);
    }

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) continue;

    let parsed;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      continue;
    }

    if (!Array.isArray(parsed)) continue;

    for (const item of parsed) {
      if (!item.title || !item.url) continue;
      allArticles.push({
        title: item.title,
        content: item.summary || '',
        url: item.url,
        imageUrl: item.imageUrl || null,
        date: item.date || null,
        author: item.author || null,
        sourceName: item.sourceName || 'Perplexity',
      });
    }
  }

  return allArticles;
}

module.exports = { fetch };
