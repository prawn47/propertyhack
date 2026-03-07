const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const IMAGES_DIR = path.join(__dirname, '../public/images/articles');

const CATEGORY_ELEMENTS = {
  residential: 'suburban houses with neat gardens, a quiet tree-lined street, warm front porches, and a welcoming neighbourhood scene',
  commercial: 'modern office buildings with glass facades, an urban city skyline, retail storefronts, and clean architectural lines',
  investment: 'abstract geometric shapes suggesting growth and stability, stacked property silhouettes, subtle upward-trending lines, and a sense of financial momentum',
  development: 'a construction site with a crane, architectural blueprints laid flat, scaffolding around a rising structure, and hard-hat motifs',
  finance: 'a stylised bank building, abstract mortgage documents, interest rate percentage symbols, and geometric financial motifs',
  policy: 'a government building with columns, abstract city planning grids, policy document silhouettes, and civic architectural details',
  'property-market': 'an auction paddle raised at a property auction, for-sale signs on a street, and abstract market graph lines',
  uncategorized: 'a clean suburban streetscape with mixed property types, open sky, and calm neighbourhood details',
};

function buildImagePrompt(title, shortBlurb, category) {
  const elements = CATEGORY_ELEMENTS[category] || CATEGORY_ELEMENTS.uncategorized;

  return [
    `Generate a flat geometric editorial illustration for a property news article thumbnail.`,
    `Visual subject: ${elements}.`,
    `Colour palette: cream (#f0f0f0) background, charcoal (#2b2b2b) shapes, and subtle gold (#d4b038) accents on key focal elements. Warm and neutral overall.`,
    `Style: clean flat design, minimal detail, bold simple shapes, editorial graphic art reminiscent of print magazine illustration. No gradients. No photorealism. No people's faces. No text, letters, numbers, or labels anywhere in the image.`,
    `Composition: wide 16:9 landscape format. Clear focal point centred or slightly left. Generous negative space on the right third for text overlay.`,
    `Mood: calm, trustworthy, informative. Conveys the topic without being literal or busy.`,
    `Article context (do NOT illustrate literally, use only for thematic tone): ${title}. ${shortBlurb || ''}`.trim(),
  ].join(' ');
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// Model fallback chain for image generation
const IMAGE_MODELS = [
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-image',
];

async function generateArticleImage(title, shortBlurb, category, slug) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[imageGen] GEMINI_API_KEY not set — skipping image generation');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildImagePrompt(title, shortBlurb, category);
  let imageData = null;
  let mimeType = 'image/png';

  for (const modelName of IMAGE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData) {
          imageData = Buffer.from(part.inlineData.data, 'base64');
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (imageData) {
        console.log(`[imageGen] Generated image using ${modelName}`);
        break;
      }
    } catch (error) {
      console.log(`[imageGen] ${modelName} failed: ${error.message.substring(0, 100)}`);
      continue;
    }
  }

  if (!imageData) {
    console.warn('[imageGen] All image models failed — skipping');
    return null;
  }

  const fileSlug = slug || generateSlug(title);
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `${fileSlug}-${Date.now()}.${ext}`;
  const filePath = path.join(IMAGES_DIR, filename);

  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.writeFile(filePath, imageData);
    console.log(`[imageGen] Saved: ${filename} (${(imageData.length / 1024).toFixed(0)}KB)`);
  } catch (err) {
    console.error(`[imageGen] Failed to save image: ${err.message}`);
    return null;
  }

  return {
    imageData,
    mimeType,
    filename,
    publicPath: `/images/articles/${filename}`,
  };
}

module.exports = {
  generateArticleImage,
  buildImagePrompt,
};
