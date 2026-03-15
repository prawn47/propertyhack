const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getClient } = require('../lib/prisma');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateHeadlines(article, tonePrompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a social media editor for PropertyHack, a property news platform.

Tone guidelines: ${tonePrompt || 'Informative, concise, neutral news tone. Not salesy or clickbaity.'}

Generate social media posts for this article:
- Title: ${article.title}
- Summary: ${article.shortBlurb || ''}
- Category: ${article.category || ''}
- Location: ${article.location || ''}
- Market: ${article.market || 'AU'}

Rules:
- Facebook: Conversational headline (max 200 chars), include 1-2 relevant hashtags
- Twitter/X: Punchy, direct headline (max 200 chars to leave room for link + hashtags), include 2-3 hashtags
- Instagram: Engaging caption (max 150 chars), include 5-10 relevant property/news hashtags, end with "Link in bio"
- Do NOT copy the article title verbatim — rephrase it for social media
- Hashtags should be relevant to the article content, category, and location
- Keep tone informative, not clickbaity

Respond in this exact JSON format (no markdown, no code fences):
{
  "facebook": {
    "headline": "Your Facebook post text here",
    "hashtags": ["#Hashtag1", "#Hashtag2"]
  },
  "twitter": {
    "headline": "Your Twitter/X post text here",
    "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"]
  },
  "instagram": {
    "headline": "Your Instagram caption here. Link in bio",
    "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3", "#Hashtag4", "#Hashtag5"]
  }
}`;

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStr = text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    for (const platform of ['facebook', 'twitter', 'instagram']) {
      if (!parsed[platform]?.headline) {
        throw new Error(`Missing headline for ${platform}`);
      }
      if (!Array.isArray(parsed[platform]?.hashtags)) {
        parsed[platform].hashtags = [];
      }
    }

    return parsed;
  } catch (err) {
    console.error('[socialHeadlineService] Gemini failed, using fallback:', err.message);
    return generateFallbackHeadlines(article);
  }
}

function generateFallbackHeadlines(article) {
  const title = article.title || 'Property News Update';
  const truncated = title.length > 150 ? title.substring(0, 147) + '...' : title;
  const defaultHashtags = ['#PropertyNews', '#RealEstate'];

  return {
    facebook: {
      headline: truncated,
      hashtags: defaultHashtags,
    },
    twitter: {
      headline: truncated,
      hashtags: defaultHashtags,
    },
    instagram: {
      headline: `${truncated}\n\nLink in bio`,
      hashtags: [...defaultHashtags, '#Property', '#Housing', '#Investment'],
    },
  };
}

async function generateHeadlinesWithConfig(article) {
  const prisma = getClient();
  const config = await prisma.socialConfig.findFirst();
  const tonePrompt = config?.tonePrompt || 'Informative, concise, neutral news tone.';
  const headlines = await generateHeadlines(article, tonePrompt);

  if (config?.defaultHashtags?.length) {
    for (const platform of ['facebook', 'twitter', 'instagram']) {
      const existing = new Set(headlines[platform].hashtags.map(h => h.toLowerCase()));
      for (const defaultTag of config.defaultHashtags) {
        if (!existing.has(defaultTag.toLowerCase())) {
          headlines[platform].hashtags.unshift(defaultTag);
        }
      }
    }
  }

  return headlines;
}

module.exports = { generateHeadlines, generateFallbackHeadlines, generateHeadlinesWithConfig };
