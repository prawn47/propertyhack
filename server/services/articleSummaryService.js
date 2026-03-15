const { getClient } = require('../lib/prisma');
const aiProviderService = require('./aiProviderService');

let cachedSummaryPrompt = null;
let summaryCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSummaryPromptTemplate() {
  const now = Date.now();
  if (cachedSummaryPrompt && (now - summaryCacheTimestamp) < CACHE_TTL) {
    return cachedSummaryPrompt;
  }
  try {
    const prisma = getClient();
    const record = await prisma.systemPrompt.findUnique({ where: { name: 'article-summarisation' } });
    if (record && record.isActive) {
      cachedSummaryPrompt = record.content;
      summaryCacheTimestamp = now;
      return cachedSummaryPrompt;
    }
  } catch (err) {
    console.warn('[summary] Could not load prompt from DB:', err.message);
  }
  return null;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

const ENGLISH_VARIANT = {
  AU: 'British English (Australian/UK spelling and phrasing, e.g. "organisation", "centre", "labour", "metres")',
  NZ: 'British English (New Zealand/UK spelling and phrasing, e.g. "organisation", "centre", "labour", "metres")',
  UK: 'British English (UK spelling and phrasing, e.g. "organisation", "centre", "labour", "metres")',
  US: 'American English (US spelling and phrasing, e.g. "organization", "center", "labor", "meters")',
  CA: 'American English (US/Canadian spelling and phrasing, e.g. "organization", "center", "labor", "meters")',
};

const HARDCODED_FALLBACK = `You are a property news editor for PropertyHack, a global property news platform covering Australia, New Zealand, US, UK, and Canada. Your tone is authoritative, factual, and data-driven.

IMPORTANT: Write all summaries in {englishVariant}.

Analyse the following article and return a JSON object with these fields:

- isPropertyRelated: boolean — true ONLY if the article is directly about property, real estate, housing, construction, mortgages, interest rates affecting housing, property investment, urban planning, property development, home buying/selling, rental markets, or housing policy. Return false for general news, sports, politics (unless directly about housing policy), entertainment, celebrities, etc.
- relevanceScore: integer 1-10 — rate the relevance of this article to property and real estate:
  - 9-10: Core property content (sales, auctions, listings, market reports, development)
  - 7-8: Strongly related (housing policy, mortgage rates, construction, investment strategy)
  - 5-6: Moderately related (macro economics affecting property, infrastructure, lifestyle/architecture)
  - 3-4: Loosely related (general finance, broad economics, urban planning without property focus)
  - 1-2: Not related (sports, entertainment, celebrity, unrelated politics)
- shortBlurb: ~50 words, a concise hook suitable for a news card. Include a specific data point (percentage, dollar amount, or trend figure) if available in the source material. Do not exceed 60 words. Leave empty string if not property related.
- longSummary: ~80 words, max 100 words. A concise summary with key facts, statistics, and figures from the article. Attribute the source ({sourceName}). Write in a definitive, expert tone. Leave empty string if not property related.
- suggestedCategory: one of exactly these slugs: property-market, residential, commercial, investment, development, policy, finance, uncategorized
- extractedLocation: the primary city/state/region mentioned (e.g. "Sydney, NSW", "London", "New York", "Toronto"), or null if not identifiable
- markets: an array of market codes this article is relevant to. Use ONLY these codes: "AU", "NZ", "US", "UK", "CA", "ALL". Use "ALL" for content relevant globally (e.g. universal home-buying tips, decorating/landscaping advice, general investment strategy, global housing trends). An article can belong to multiple specific markets (e.g. ["AU", "UK"]) if it compares or discusses both. Most articles will have exactly one market code.
- isEvergreen: boolean — true if the content is timeless advice, tips, guides, or educational content that remains useful regardless of when it was published (e.g. "10 tips to sell your home faster", "how to choose an investment property", "landscaping ideas to boost value"). false for time-sensitive news, market reports, auction results, policy announcements, or anything tied to a specific date/event.
- isGlobal: boolean — true if the content discusses macro trends, cross-market analysis, global housing data, worldwide interest rate commentary, or comparative international property analysis that is relevant to readers in ALL markets (e.g. "global housing bubble fears grow", "how rising rates are cooling markets worldwide", "international property investment trends"). false for country-specific news or timeless tips (those are isEvergreen). An article can be both isGlobal and isEvergreen if it is both timeless AND globally relevant, but most articles will be one or neither.

Respond with valid JSON only. Do not wrap in markdown code fences.

ARTICLE:
{content}`;

async function generateArticleSummary(articleContent) {
  const { title, content, sourceUrl, sourceName, sourceMarket } = articleContent;

  const hasContent = content && content.trim().length > 50;
  const inputText = hasContent
    ? `Title: ${title}\nSource: ${sourceName || sourceUrl}\nContent:\n${content}`
    : `Title: ${title}\nSource: ${sourceName || sourceUrl}\n(Full article content not available — summarise from title only)`;

  const englishVariant = ENGLISH_VARIANT[sourceMarket] || ENGLISH_VARIANT.AU;

  const dbTemplate = await getSummaryPromptTemplate();
  const template = dbTemplate || HARDCODED_FALLBACK;

  const userPrompt = template
    .replace('{englishVariant}', englishVariant)
    .replace('{sourceName}', sourceName || sourceUrl)
    .replace('{content}', inputText);

  const { text } = await aiProviderService.generateText('article-summarisation', userPrompt, { jsonMode: true });

  // Strip markdown fences if present
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${error.message}. Raw: ${jsonText.substring(0, 200)}`);
  }

  // Enforce word limits — resubmit once if exceeded
  const BLURB_MAX = 60;
  const SUMMARY_MAX = 100;

  const blurbWords = (parsed.shortBlurb || '').split(/\s+/).filter(Boolean).length;
  const summaryWords = (parsed.longSummary || '').split(/\s+/).filter(Boolean).length;

  if (blurbWords > BLURB_MAX || summaryWords > SUMMARY_MAX) {
    console.log(`[summary] Word limit exceeded (blurb: ${blurbWords}/${BLURB_MAX}, summary: ${summaryWords}/${SUMMARY_MAX}) — requesting trim`);

    const trimPrompt = `You returned summaries that are too long. Shorten them while keeping all key facts and the source attribution.

Current shortBlurb (${blurbWords} words, max ${BLURB_MAX}):
${parsed.shortBlurb}

Current longSummary (${summaryWords} words, max ${SUMMARY_MAX}):
${parsed.longSummary}

Return ONLY a JSON object with two fields: "shortBlurb" and "longSummary". No markdown fences.`;

    try {
      const { text: trimText } = await aiProviderService.generateText('article-summarisation', trimPrompt, { jsonMode: true });
      let trimJson = trimText.trim();
      if (trimJson.startsWith('```')) {
        trimJson = trimJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }
      const trimmed = JSON.parse(trimJson);
      if (trimmed.shortBlurb) parsed.shortBlurb = trimmed.shortBlurb;
      if (trimmed.longSummary) parsed.longSummary = trimmed.longSummary;
      const newBlurb = (parsed.shortBlurb || '').split(/\s+/).filter(Boolean).length;
      const newSummary = (parsed.longSummary || '').split(/\s+/).filter(Boolean).length;
      console.log(`[summary] After trim: blurb ${newBlurb} words, summary ${newSummary} words`);
    } catch (trimErr) {
      console.warn(`[summary] Trim retry failed, using original: ${trimErr.message.substring(0, 80)}`);
    }
  }

  const validCategories = ['property-market', 'residential', 'commercial', 'investment', 'development', 'policy', 'finance', 'uncategorized'];
  const suggestedCategory = validCategories.includes(parsed.suggestedCategory)
    ? parsed.suggestedCategory
    : 'uncategorized';

  const validMarkets = ['AU', 'NZ', 'US', 'UK', 'CA', 'ALL'];
  const markets = Array.isArray(parsed.markets)
    ? parsed.markets.filter(m => validMarkets.includes(m))
    : ['AU'];
  if (markets.length === 0) markets.push('AU');

  const relevanceScore = Number.isInteger(parsed.relevanceScore) && parsed.relevanceScore >= 1 && parsed.relevanceScore <= 10
    ? parsed.relevanceScore
    : 5;

  return {
    isPropertyRelated: parsed.isPropertyRelated !== false,
    relevanceScore,
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

  const userPrompt = `Generate descriptive, SEO-friendly alt text for an article image.

Article Title: ${articleTitle}
Article Summary: ${articleSummary.substring(0, 200)}...
Focus Keywords: ${keywordsStr}

Create alt text that:
- Describes what the image should show
- Incorporates relevant keywords naturally
- Is concise (max 125 characters)
- Is descriptive and accessible

Return ONLY the alt text, nothing else.`;

  const { text } = await aiProviderService.generateText('image-alt-text', userPrompt);
  return text.trim().replace(/^"|"$/g, '');
}

module.exports = {
  generateArticleSummary,
  generateImageAltText,
  generateSlug,
};
