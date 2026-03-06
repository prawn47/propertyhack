const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function generateArticleSummary(articleContent) {
  const { title, content, sourceUrl, sourceName } = articleContent;

  const hasContent = content && content.trim().length > 50;
  const inputText = hasContent
    ? `Title: ${title}\nSource: ${sourceName || sourceUrl}\nContent:\n${content}`
    : `Title: ${title}\nSource: ${sourceName || sourceUrl}\n(Full article content not available — summarise from title only)`;

  const prompt = `You are a property news editor for PropertyHack, an Australian property news platform. Your tone is factual and neutral.

Analyse the following article and return a JSON object with these fields:
- shortBlurb: ~50 words, a concise hook suitable for a news card. Do not exceed 60 words.
- longSummary: ~300 words, a comprehensive summary covering the key points, facts, and figures. Always attribute the source (${sourceName || sourceUrl}).
- suggestedCategory: one of exactly these slugs: property-market, residential, commercial, investment, development, policy, finance, uncategorized
- extractedLocation: the primary Australian city and/or state mentioned (e.g. "Sydney, NSW" or "Victoria"), or null if not identifiable

Respond with valid JSON only. Do not wrap in markdown code fences.

ARTICLE:
${inputText}`;

  let model;
  try {
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  } catch {
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  let text;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    text = response.text();
  } catch (error) {
    // Try fallback model if exp variant fails
    if (error.message && error.message.includes('not found')) {
      const fallback = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await fallback.generateContent(prompt);
      const response = await result.response;
      text = response.text();
    } else {
      throw new Error(`Gemini API error during summarisation: ${error.message}`);
    }
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

  return {
    shortBlurb: parsed.shortBlurb || '',
    longSummary: parsed.longSummary || '',
    suggestedCategory,
    extractedLocation: parsed.extractedLocation || null,
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
