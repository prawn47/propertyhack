const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let cachedPromptTemplate = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getPromptTemplate() {
  const now = Date.now();
  if (cachedPromptTemplate && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedPromptTemplate;
  }
  try {
    const record = await prisma.systemPrompt.findUnique({ where: { name: 'social-generation' } });
    if (record && record.isActive) {
      cachedPromptTemplate = record.content;
      cacheTimestamp = now;
      return cachedPromptTemplate;
    }
  } catch (err) {
    console.warn('[socialGen] Could not load prompt from DB:', err.message);
  }
  return null;
}

const FALLBACK_PROMPT = `Generate social media posts for the following property news article. Return a JSON object with keys for each requested platform.

Article title: {title}
Article summary: {shortBlurb}
Article URL: {sourceUrl}
Category: {category}

Generate posts for these platforms: {platforms}

Requirements per platform:
- twitter: Max 280 characters. Punchy, newsworthy tone. Include 2-3 relevant hashtags. Include the article URL.
- facebook: 1-2 short paragraphs. Conversational tone. End with the article URL.
- linkedin: Professional, industry-insight tone. 1-2 paragraphs. End with the article URL.
- instagram: Engaging caption with emojis. 5-8 hashtags at the end. Mention "link in bio" instead of URL.

Return ONLY valid JSON with platform names as keys and post content as string values.`;

async function buildPrompt(article, platforms) {
  const { title, shortBlurb, longSummary, sourceUrl, category } = article;
  const platformList = platforms.join(', ');

  const dbTemplate = await getPromptTemplate();
  const template = dbTemplate || FALLBACK_PROMPT;

  return template
    .replace('{title}', title || '')
    .replace('{shortBlurb}', shortBlurb || '')
    .replace('{longSummary}', longSummary || '')
    .replace('{sourceUrl}', sourceUrl || '')
    .replace('{category}', category || '')
    .replace('{platforms}', platformList);
}

const SOCIAL_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

async function generateSocialPosts(article, platforms) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[socialGen] GEMINI_API_KEY not set — skipping social post generation');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = await buildPrompt(article, platforms);

  for (const modelName of SOCIAL_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const posts = JSON.parse(text);

      console.log(`[socialGen] Generated posts using ${modelName} for article: ${article.id}`);
      return posts;
    } catch (error) {
      console.log(`[socialGen] ${modelName} failed: ${error.message.substring(0, 100)}`);
      continue;
    }
  }

  console.warn('[socialGen] All models failed — returning null');
  return null;
}

module.exports = { generateSocialPosts };
