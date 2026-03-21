const { getClient } = require('../lib/prisma');
const aiProviderService = require('./aiProviderService');

async function suggestTakes(articleId, prisma) {
  const db = prisma || getClient();

  const article = await db.article.findUnique({
    where: { id: articleId },
    select: { title: true, shortBlurb: true, longSummary: true, category: true, market: true },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const systemPrompt = `You are a sharp, opinionated property commentator writing hot takes for social media. You write in a casual, confident voice — not corporate. You reference specific details from the article. Keep each take under 250 characters.`;

  const userPrompt = `Based on this property article, generate 3 different commentary angles.

Article title: ${article.title}
Summary: ${article.longSummary || article.shortBlurb || ''}
Category: ${article.category || 'property'}
Market: ${article.market || 'AU'}

Return ONLY a JSON array with exactly 3 objects:
[
  {"angle": "contrarian", "text": "Against-the-grain perspective challenging conventional wisdom about this story"},
  {"angle": "data-driven", "text": "Analytical observation backed by numbers or trends from the article"},
  {"angle": "relatable", "text": "Personal angle — what this means for everyday property owners/renters"}
]

Requirements:
- Each take must be genuinely different in perspective
- Reference specific details from the article
- Keep each under 250 characters
- Write in a casual, opinionated voice
- Make them suitable for Twitter/X`;

  const { text } = await aiProviderService.generateText('hot-take-suggestions', userPrompt, {
    systemPrompt,
    jsonMode: true,
    maxTokens: 1024,
    temperature: 0.9,
  });

  const suggestions = parseResponse(text);
  return { suggestions };
}

function parseResponse(text) {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : parsed.suggestions || parsed.takes || [];
    if (arr.length > 0 && arr[0].angle && arr[0].text) {
      return arr.slice(0, 3);
    }
  } catch {
    // fall through to regex extraction
  }

  // Try extracting JSON array from the response
  const arrayMatch = text.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]);
      if (arr.length > 0 && arr[0].angle && arr[0].text) {
        return arr.slice(0, 3);
      }
    } catch {
      // fall through
    }
  }

  // Last resort: regex extraction of individual objects
  const suggestions = [];
  const objectPattern = /\{[^{}]*"angle"\s*:\s*"([^"]+)"[^{}]*"text"\s*:\s*"([^"]+)"[^{}]*\}/g;
  let match;
  while ((match = objectPattern.exec(text)) !== null && suggestions.length < 3) {
    suggestions.push({ angle: match[1], text: match[2] });
  }

  if (suggestions.length > 0) {
    return suggestions;
  }

  throw new Error('Failed to parse AI response into suggestions');
}

module.exports = { suggestTakes };
