const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const IMAGES_DIR = path.join(__dirname, '../public/images/articles');

let cachedPromptTemplate = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getPromptTemplate() {
  const now = Date.now();
  if (cachedPromptTemplate && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedPromptTemplate;
  }
  try {
    const record = await prisma.systemPrompt.findUnique({ where: { name: 'image-generation' } });
    if (record && record.isActive) {
      cachedPromptTemplate = record.content;
      cacheTimestamp = now;
      return cachedPromptTemplate;
    }
  } catch (err) {
    console.warn('[imageGen] Could not load prompt from DB:', err.message);
  }
  return null;
}

const CATEGORY_ELEMENTS = {
  residential: 'a suburban street with Australian homes and established gardens, natural daylight',
  commercial: 'a commercial building with glass facades, pedestrians at street level',
  investment: 'a neighbourhood with mixed property types, rooftops and tree-lined streets',
  development: 'a construction site with a residential building taking shape, building materials in foreground',
  finance: 'a desk with property documents, house keys and a small model home, natural window light',
  policy: 'a civic building with sandstone columns, street level view with foot traffic',
  'property-market': 'an open-home inspection with natural light through windows, polished timber floors',
  uncategorized: 'an Australian suburban neighbourhood, diverse housing styles with mature trees',
};

// 5 distinct photographer styles — randomly selected per image for variety
const PHOTO_STYLES = [
  {
    camera: 'Nikon FM2, 50mm f/1.4 lens',
    film: 'Kodak Gold 200',
    look: 'slight warm cast, visible film grain in shadows, natural colour saturation',
  },
  {
    camera: 'Canon AE-1, 35mm f/2.8 lens',
    film: 'Fuji Superia 400',
    look: 'cool-neutral tones with gentle green shift in shadows, fine grain texture',
  },
  {
    camera: 'Pentax K1000, 28mm f/2.8 lens',
    film: 'Kodak Portra 160',
    look: 'soft pastel highlights, muted warm tones, creamy bokeh on background',
  },
  {
    camera: 'Olympus OM-1, 50mm f/1.8 lens',
    film: 'Kodak Ektar 100',
    look: 'rich natural colours, sharp detail, slight warm shift in highlights',
  },
  {
    camera: 'Minolta X-700, 45mm f/2 lens',
    film: 'Agfa Vista 200',
    look: 'punchy midtones, slight amber warmth, organic grain pattern',
  },
];

function getRandomStyle() {
  return PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];
}

async function buildImagePrompt(title, shortBlurb, category) {
  const elements = CATEGORY_ELEMENTS[category] || CATEGORY_ELEMENTS.uncategorized;
  const style = getRandomStyle();

  const dbTemplate = await getPromptTemplate();
  if (dbTemplate) {
    return dbTemplate
      .replace('{category_elements}', elements)
      .replace('{title}', title)
      .replace('{shortBlurb}', shortBlurb || '')
      .replace('{camera}', style.camera)
      .replace('{film}', style.film)
      .replace('{look}', style.look);
  }

  return [
    `Photograph for a property news article.`,
    `Subject: ${elements}.`,
    `Shot on ${style.camera}. ${style.film} film stock.`,
    `${style.look}.`,
    `Wide 16:9 landscape composition, off-centre subject, environmental context.`,
    `No text, no numbers, no watermarks, no labels. No close-up faces.`,
    `This should look like a real photograph from a 1990s property magazine, not computer-generated.`,
    `Article context: ${title}. ${shortBlurb || ''}`.trim(),
  ].join(' ');
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

const FALLBACK_QUOTES = [
  '/images/fallbacks/quote-1.svg',
  '/images/fallbacks/quote-2.svg',
  '/images/fallbacks/quote-3.svg',
  '/images/fallbacks/quote-4.svg',
];

function getRandomFallbackImage() {
  const publicPath = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  return { imageData: null, mimeType: 'image/svg+xml', filename: null, publicPath };
}

// Model fallback chain for image generation
const IMAGE_MODELS = [
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-image',
];

async function generateArticleImage(title, shortBlurb, category, slug, attemptsMade = 0) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[imageGen] GEMINI_API_KEY not set — skipping image generation');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = await buildImagePrompt(title, shortBlurb, category);
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
      console.warn(`[imageGen] ${modelName} failed: ${error.message.substring(0, 100)}`);
      continue;
    }
  }

  if (!imageData) {
    if (attemptsMade < 2) {
      throw new Error('All image models failed — will retry');
    }
    console.warn('[imageGen] All AI models failed after retries — using fallback quote image');
    return getRandomFallbackImage();
  }

  const rawSlug = slug || generateSlug(title);
  const fileSlug = rawSlug.replace(/-[a-z0-9]{5}$/, '');
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `${fileSlug}.${ext}`;
  const filePath = path.join(IMAGES_DIR, filename);

  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.writeFile(filePath, imageData);
    console.log(`[imageGen] Saved: ${filename} (${(imageData.length / 1024).toFixed(0)}KB)`);
  } catch (err) {
    throw new Error(`Failed to save image: ${err.message}`);
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
