const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

const ENGLISH_VARIANT = {
  AU: 'British English (Australian/UK spelling and phrasing, e.g. "organisation", "centre", "labour", "metres")',
  UK: 'British English (UK spelling and phrasing, e.g. "organisation", "centre", "labour", "metres")',
  US: 'American English (US spelling and phrasing, e.g. "organization", "center", "labor", "meters")',
  CA: 'American English (US/Canadian spelling and phrasing, e.g. "organization", "center", "labor", "meters")',
};

async function generateArticleSummary(articleContent) {
  const { title, content, sourceUrl, sourceName, sourceMarket } = articleContent;

  const hasContent = content && content.trim().length > 50;
  const inputText = hasContent
    ? `Title: ${title}\nSource: ${sourceName || sourceUrl}\nContent:\n${content}`
    : `Title: ${title}\nSource: ${sourceName || sourceUrl}\n(Full article content not available — summarise from title only)`;

  const englishVariant = ENGLISH_VARIANT[sourceMarket] || ENGLISH_VARIANT.AU;

  const prompt = `You are a property news editor for PropertyHack, a global property news platform covering Australia, US, UK, and Canada. Your tone is authoritative, factual, and data-driven.

IMPORTANT: Write all summaries in ${englishVariant}.

Analyse the following article and return a JSON object with these fields:

- isPropertyRelated: boolean — true ONLY if the article is directly about property, real estate, housing, construction, mortgages, interest rates affecting housing, property investment, urban planning, property development, home buying/selling, rental markets, or housing policy. Return false for general news, sports, politics (unless directly about housing policy), entertainment, celebrities, etc.
- shortBlurb: ~50 words, a concise hook suitable for a news card. Include a specific data point (percentage, dollar amount, or trend figure) if available in the source material. Do not exceed 60 words. Leave empty string if not property related.
- longSummary: ~300 words, a comprehensive summary. IMPORTANT for search engine visibility: include specific statistics, percentages, dates, and dollar figures from the article. Use clear section structure with key findings first. Always attribute the source (${sourceName || sourceUrl}). Write in a definitive, expert tone as if you are the authority on this topic. Leave empty string if not property related.
- suggestedCategory: one of exactly these slugs: property-market, residential, commercial, investment, development, policy, finance, uncategorized
- extractedLocation: the primary city/state/region mentioned (e.g. "Sydney, NSW", "London", "New York", "Toronto"), or null if not identifiable
- markets: an array of market codes this article is relevant to. Use ONLY these codes: "AU", "US", "UK", "CA", "ALL". Use "ALL" for content relevant globally (e.g. universal home-buying tips, decorating/landscaping advice, general investment strategy, global housing trends). An article can belong to multiple specific markets (e.g. ["AU", "UK"]) if it compares or discusses both. Most articles will have exactly one market code.
- isEvergreen: boolean — true if the content is timeless advice, tips, guides, or educational content that remains useful regardless of when it was published (e.g. "10 tips to sell your home faster", "how to choose an investment property", "landscaping ideas to boost value"). false for time-sensitive news, market reports, auction results, policy announcements, or anything tied to a specific date/event.
- isGlobal: boolean — true if the content discusses macro trends, cross-market analysis, global housing data, worldwide interest rate commentary, or comparative international property analysis that is relevant to readers in ALL markets (e.g. "global housing bubble fears grow", "how rising rates are cooling markets worldwide", "international property investment trends"). false for country-specific news or timeless tips (those are isEvergreen). An article can be both isGlobal and isEvergreen if it is both timeless AND globally relevant, but most articles will be one or neither.

Respond with valid JSON only. Do not wrap in markdown code fences.

ARTICLE:
${inputText}`;

  const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  let text;
  let lastError;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      text = response.text();
      break;
    } catch (error) {
      lastError = error;
      console.log(`[summary] ${modelName} failed: ${error.message.substring(0, 80)}`);
      continue;
    }
  }

  if (!text) {
    throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
  }

  // Strip markdown fences if present
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse Gemini response as JSON: ${error.message}. Raw: ${jsonText.substring(0, 200)}`);
  }

  const validCategories = ['property-market', 'residential', 'commercial', 'investment', 'development', 'policy', 'finance', 'uncategorized'];
  const suggestedCategory = validCategories.includes(parsed.suggestedCategory)
    ? parsed.suggestedCategory
    : 'uncategorized';

  const validMarkets = ['AU', 'US', 'UK', 'CA', 'ALL'];
  const markets = Array.isArray(parsed.markets)
    ? parsed.markets.filter(m => validMarkets.includes(m))
    : ['AU'];
  if (markets.length === 0) markets.push('AU');

  return {
    isPropertyRelated: parsed.isPropertyRelated !== false,
    shortBlurb: parsed.shortBlurb || '',
    longSummary: parsed.longSummary || '',
    suggestedCategory,
    extractedLocation: parsed.extractedLocation || null,
    markets,
    isEvergreen: parsed.isEvergreen === true,
    isGlobal: parsed.isGlobal === true,
  };
}

async function generateImageAltText(articleTitle, articleSummary, focusKeywords = []) {
  const keywordsStr = focusKeywords.join(', ');

  const prompt = `Generate descriptive, SEO-friendly alt text for an article image.

Article Title: ${articleTitle}
Article Summary: ${articleSummary.substring(0, 200)}...
Focus Keywords: ${keywordsStr}

Create alt text that:
- Describes what the image should show
- Incorporates relevant keywords naturally
- Is concise (max 125 characters)
- Is descriptive and accessible

Return ONLY the alt text, nothing else.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    throw new Error(`Alt text generation failed: ${error.message}`);
  }
}

module.exports = {
  generateArticleSummary,
  generateImageAltText,
  generateSlug,
};
