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
  residential: 'a suburban street with modern Australian homes and established gardens, late afternoon light casting long shadows across the footpath',
  commercial: 'a modern commercial building with glass facades reflecting warm sky tones, pedestrians walking past at street level',
  investment: 'a neighbourhood with mixed property types viewed from a slight elevation, rooftops and tree-lined streets with natural light',
  development: 'a construction site with a residential building taking shape, building materials in foreground, workers in hard hats at a distance',
  finance: 'a desk with property documents, house keys and a small model home on brushed timber, natural window light from the side',
  policy: 'a civic building with sandstone columns, shot from street level with passing foot traffic, overcast natural light',
  'property-market': 'an open-home inspection with natural light through sash windows, polished timber floors and a small crowd browsing',
  uncategorized: 'an Australian suburban neighbourhood from a gentle elevation, diverse housing styles with mature eucalyptus trees and warm afternoon light',
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
    `Editorial photograph for a property news article.`,
    `Subject: ${elements}.`,
    `Shot on Canon EOS R5 with 24-70mm f/2.8 lens. Natural available light, warm white balance around 5500K.`,
    `Warm golden-amber undertones throughout. Kodak Portra 400 colour tones — slightly warm highlights, natural skin-like warmth on surfaces.`,
    `Subtle film grain texture, natural vignette at edges. Slight bokeh on background elements.`,
    `Wide 16:9 landscape composition with a clear focal point and environmental context.`,
    `No text, no letters, no numbers, no watermarks, no labels anywhere. No close-up faces.`,
    `The image should look like it was taken by a professional photographer on assignment, not computer-generated.`,
    `Article context (for thematic inspiration only): ${title}. ${shortBlurb || ''}`.trim(),
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
