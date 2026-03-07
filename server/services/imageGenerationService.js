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
  residential: 'a beautiful suburban street with modern Australian homes, manicured lawns, and warm golden-hour lighting',
  commercial: 'a sleek modern commercial building with glass facades reflecting a city skyline at twilight',
  investment: 'an aerial view of a thriving neighbourhood with mixed property types, rooftops and tree-lined streets',
  development: 'an active construction site with a modern residential building taking shape, cranes silhouetted against a sunset sky',
  finance: 'a polished mahogany desk with property documents, a calculator, house keys, and a small model home, shot with shallow depth of field',
  policy: 'an imposing government or civic building with classical columns, shot from a low angle with dramatic clouds',
  'property-market': 'a bustling property auction scene or an elegant open-home inspection with natural light flooding through windows',
  uncategorized: 'a stunning aerial photograph of an Australian suburban neighbourhood with diverse housing and lush greenery',
};

async function buildImagePrompt(title, shortBlurb, category) {
  const elements = CATEGORY_ELEMENTS[category] || CATEGORY_ELEMENTS.uncategorized;

  const dbTemplate = await getPromptTemplate();
  if (dbTemplate) {
    return dbTemplate
      .replace('{category_elements}', elements)
      .replace('{title}', title)
      .replace('{shortBlurb}', shortBlurb || '');
  }

  return [
    `Generate a photorealistic editorial photograph for a property news article thumbnail.`,
    `Visual subject: ${elements}.`,
    `Photography style: professional editorial photography, natural lighting, shallow depth of field where appropriate. High production value, like a premium real estate magazine cover shot.`,
    `Colour treatment: warm and natural tones with rich contrast. No heavy filters or artificial colour grading.`,
    `Composition: wide 16:9 landscape format. Strong focal point. Cinematic framing.`,
    `IMPORTANT: No text, letters, numbers, watermarks, or labels anywhere in the image. No people's faces.`,
    `Mood: aspirational, premium, trustworthy.`,
    `Article context (use for thematic inspiration only): ${title}. ${shortBlurb || ''}`.trim(),
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
