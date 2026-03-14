const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const aiProviderService = require('./aiProviderService');

const prisma = new PrismaClient();
const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';
const IMAGES_DIR = isCloudflareWorker 
  ? '/images/articles' 
  : path.join(__dirname, '../public/images/articles');

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
    const requiredPlaceholders = ['{category_elements}', '{camera}', '{film}', '{look}'];
    const missing = requiredPlaceholders.filter(p => !dbTemplate.includes(p));
    if (missing.length > 0) {
      console.log(`[image-gen] Warning: DB prompt template missing placeholder: ${missing.join(', ')}`);
    }
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

async function generateArticleImage(title, shortBlurb, category, slug, attemptsMade = 0, articleId = null) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[imageGen] GEMINI_API_KEY not set — skipping image generation');
    return null;
  }

  const prompt = await buildImagePrompt(title, shortBlurb, category);
  console.log('[image-gen] Prompt:', prompt.substring(0, 200) + '...');
  let imageData = null;
  let mimeType = 'image/png';

  try {
    const result = await aiProviderService.generateImage('image-generation', prompt);
    imageData = result.imageData;
    mimeType = result.mimeType || 'image/png';
    console.log('[imageGen] Generated image via AI provider abstraction');
  } catch (error) {
    console.warn(`[imageGen] AI provider failed: ${error.message.substring(0, 100)}`);
  }

  if (!imageData) {
    if (attemptsMade < 2) {
      throw new Error('All image models failed — will retry');
    }
    console.warn('[imageGen] All AI models failed after retries — using fallback quote image');
    return { ...getRandomFallbackImage(), isFallback: true };
  }

  const rawSlug = slug || generateSlug(title);
  const fileSlug = rawSlug.replace(/-[a-z0-9]{5}$/, '');
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  let filename = `${fileSlug}.${ext}`;
  let filePath = path.join(IMAGES_DIR, filename);

  // Collision prevention: if file exists and is owned by a different article, add a hash suffix
  try {
    await fs.access(filePath);
    // File exists — check DB ownership
    const publicPath = `/images/articles/${filename}`;
    const owner = await prisma.article.findFirst({
      where: { imageUrl: publicPath },
      select: { id: true },
    });
    const ownedByOther = owner && owner.id !== articleId;
    if (ownedByOther || !owner) {
      const hashSuffix = crypto.randomBytes(3).toString('hex');
      filename = `${fileSlug}-${hashSuffix}.${ext}`;
      filePath = path.join(IMAGES_DIR, filename);
      console.log(`[imageGen] Collision on ${fileSlug}.${ext} — using ${filename}`);
    }
  } catch {
    // File does not exist — no collision, proceed with original filename
  }

  // ── Save image: R2 (CF Workers) or local filesystem ─────────────
  // On CF Workers, images go to the R2 bucket configured in wrangler.toml.
  // Locally, images go to server/public/images/articles/ as before.
  // Ref: Beads workspace-8i6
  const r2Bucket = globalThis.__cf_env?.IMAGES_BUCKET;

  if (r2Bucket) {
    // CF Workers — save to R2
    try {
      const r2Key = `articles/${filename}`;
      await r2Bucket.put(r2Key, imageData, {
        httpMetadata: { contentType: mimeType },
      });
      console.log(`[imageGen] Saved to R2: ${r2Key} (${(imageData.length / 1024).toFixed(0)}KB)`);
    } catch (err) {
      throw new Error(`Failed to save image to R2: ${err.message}`);
    }

    // TODO: Update this URL once R2 custom domain is configured
    // Use the SITE_URL + /images/ path, or the R2 public URL
    const siteUrl = process.env.SITE_URL || 'https://propertyhack.com';
    return {
      imageData,
      mimeType,
      filename,
      publicPath: `/images/articles/${filename}`,
      // r2Url can be used if serving directly from R2 with custom domain:
      // r2Url: `https://images.propertyhack.com/articles/${filename}`,
    };
  } else {
    // Local / traditional — save to filesystem
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
}

module.exports = {
  generateArticleImage,
  buildImagePrompt,
};
