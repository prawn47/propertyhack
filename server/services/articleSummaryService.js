const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Generate SEO-optimized article summary from source content
 * @param {string} sourceUrl - Original article URL
 * @param {string} sourceContent - Original article text content
 * @param {string[]} focusKeywords - SEO focus keywords
 * @param {string} market - Market code (AU, US, etc.)
 * @returns {Promise<{title: string, slug: string, summary: string, metaDescription: string}>}
 */
async function generateArticleSummary(sourceUrl, sourceContent, focusKeywords = [], market = 'AU') {
  try {
    const keywordsStr = focusKeywords.join(', ');
    
    const prompt = `You are a professional property news editor for Property Hack, an agenda-free property news platform.

Your task is to create an SEO-optimized summary of a property article for the ${market} market.

ORIGINAL ARTICLE:
${sourceContent}

FOCUS KEYWORDS: ${keywordsStr || 'None specified - choose relevant property terms'}

Instructions:
1. Create an engaging, click-worthy title (max 60 characters)
2. Write a comprehensive summary (300-500 words) that:
   - Naturally incorporates the focus keywords without making them bold
   - Maintains objectivity and factual accuracy
   - Is written in clear, professional language
   - Includes key statistics, dates, and facts from the original
   - Uses proper H2/H3 structure for SEO
   - DO NOT use <strong> or <b> tags for keywords - keep all text regular weight
3. Create a meta description (150-160 characters) optimized for search engines
4. The tone should be professional yet accessible
5. IMPORTANT: Always attribute the source and make it clear this is a summary

Format your response as JSON:
{
  "title": "Engaging title here",
  "summary": "Full summary with proper HTML formatting (use <h2>, <h3>, <p>, <ul>, <li> tags but NOT <strong> or <b>)",
  "metaDescription": "SEO meta description"
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const fullPrompt = `You are an expert property news editor and SEO specialist. Always respond with valid JSON only.\n\n${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response (sometimes Gemini wraps it in markdown)
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.match(/```json\n([\s\S]*?)\n```/)[1];
    } else if (text.includes('```')) {
      jsonText = text.match(/```\n([\s\S]*?)\n```/)[1];
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Generate slug from title
    const slug = generateSlug(parsed.title);
    
    return {
      title: parsed.title,
      slug,
      summary: parsed.summary,
      metaDescription: parsed.metaDescription,
    };
  } catch (error) {
    console.error('Failed to generate article summary:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

/**
 * Generate alt text for article image
 * @param {string} articleTitle - Article title
 * @param {string} articleSummary - Article summary
 * @param {string[]} focusKeywords - Focus keywords
 * @returns {Promise<string>}
 */
async function generateImageAltText(articleTitle, articleSummary, focusKeywords = []) {
  try {
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error('Failed to generate alt text:', error);
    throw new Error(`Alt text generation failed: ${error.message}`);
  }
}

module.exports = {
  generateArticleSummary,
  generateImageAltText,
  generateSlug,
};
