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

// Expanded to 15 distinct photographer styles — vintage camera/film combinations
const PHOTO_STYLES = [
  // Original 5
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
  // New 10 additions
  {
    camera: 'Leica M6, 35mm f/2 lens',
    film: 'Kodak Tri-X 400',
    look: 'B&W, high contrast, dramatic grain, deep blacks, classic photojournalism',
  },
  {
    camera: 'Contax T2, 38mm f/2.8 lens',
    film: 'Fuji Pro 400H',
    look: 'pastel greens, soft skin tones, gentle highlights, refined grain structure',
  },
  {
    camera: 'Hasselblad 500C, 80mm f/2.8 lens',
    film: 'Kodak Ektachrome E100',
    look: 'vivid slide film colours, fine grain, saturated blues and greens',
  },
  {
    camera: 'Mamiya 7, 80mm f/4 lens',
    film: 'Fuji Velvia 50',
    look: 'ultra-saturated, sharp landscape detail, intense colour contrast',
  },
  {
    camera: 'Yashica T4, 35mm f/3.5 lens',
    film: 'Kodak ColorPlus 200',
    look: 'casual snapshot feel, warm tones, nostalgic colour palette',
  },
  {
    camera: 'Rolleiflex 2.8F, 80mm f/2.8 lens',
    film: 'Ilford HP5 Plus',
    look: 'B&W, medium format, beautiful tonal range, smooth gradation',
  },
  {
    camera: 'Nikon F3, 50mm f/1.4 lens',
    film: 'CineStill 800T',
    look: 'cinematic tungsten cast, halation around lights, moody atmosphere',
  },
  {
    camera: 'Canon F-1, 50mm f/1.8 lens',
    film: 'Kodak UltraMax 400',
    look: 'punchy saturated colours, versatile daylight balance, vibrant reds',
  },
  {
    camera: 'Leica M3, 50mm f/2 lens',
    film: 'Agfa APX 100',
    look: 'B&W, fine grain, classic photojournalism feel, crisp definition',
  },
  {
    camera: 'Pentax 67, 105mm f/2.4 lens',
    film: 'Fuji Pro 160NS',
    look: 'medium format, natural colours, wedding photography feel, shallow depth',
  },
];

// Market-specific architectural and environmental details
const MARKET_DETAILS = {
  AU: 'weatherboard cottages, red brick, tin roofs, eucalyptus trees, wide suburban streets',
  UK: 'Victorian terraces, Georgian facades, red brick, chimney pots, hedgerows',
  US: 'Colonial homes, clapboard siding, porches, mature oak trees, sidewalks',
  NZ: 'timber homes, native bush, rolling green hills, harbour views',
  CA: 'row houses, maple trees, heritage stone buildings, wide avenues',
};

function getRandomStyle() {
  return PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];
}

function generateSceneDescription(title, shortBlurb, category, market) {
  // Create a dynamic scene description based on the article content
  const blurbSnippet = shortBlurb ? shortBlurb.substring(0, 200) : '';
  const marketDetails = MARKET_DETAILS[market] || MARKET_DETAILS.AU; // Default to AU
  
  // Generate contextual scene elements based on category
  let sceneContext = '';
  switch (category) {
    case 'residential':
      sceneContext = 'a residential neighbourhood scene';
      break;
    case 'commercial':
      sceneContext = 'a commercial district with office buildings and street activity';
      break;
    case 'investment':
      sceneContext = 'an investment property area showing mixed development';
      break;
    case 'development':
      sceneContext = 'a development site with construction or planning activity';
      break;
    case 'finance':
      sceneContext = 'a professional setting related to property finance';
      break;
    case 'policy':
      sceneContext = 'a civic or government building representing policy matters';
      break;
    case 'property-market':
      sceneContext = 'a property market scene with real estate activity';
      break;
    default:
      sceneContext = 'a general property-related scene';
  }
  
  return {
    sceneContext,
    marketDetails,
    blurbSnippet
  };
}

async function buildImagePrompt(title, shortBlurb, category, market) {
  const style = getRandomStyle();
  const { sceneContext, marketDetails, blurbSnippet } = generateSceneDescription(title, shortBlurb, category, market);

  const dbTemplate = await getPromptTemplate();
  if (dbTemplate) {
    const requiredPlaceholders = ['{scene_context}', '{camera}', '{film}', '{look}', '{market_details}'];
    const missing = requiredPlaceholders.filter(p => !dbTemplate.includes(p));
    if (missing.length > 0) {
      console.log(`[image-gen] Warning: DB prompt template missing placeholder: ${missing.join(', ')}`);
    }
    return dbTemplate
      .replace('{scene_context}', sceneContext)
      .replace('{market_details}', marketDetails)
      .replace('{title}', title)
      .replace('{shortBlurb}', blurbSnippet)
      .replace('{category}', category)
      .replace('{market}', market)
      .replace('{camera}', style.camera)
      .replace('{film}', style.film)
      .replace('{look}', style.look);
  }

  // New dynamic prompt structure
  return [
    `Create a photograph that captures the essence of this property news story.`,
    ``,
    `Story: ${title}. ${blurbSnippet}`,
    `Location: ${market}`,
    `Category: ${category}`,
    ``,
    `Photograph this as if you were a photojournalist covering this story for a 1990s property magazine.`,
    `Shot on ${style.camera}. ${style.film} film stock. ${style.look}.`,
    `Wide 16:9 landscape composition.`,
    `The image should feel authentic — a real moment captured on film, not staged or computer-generated.`,
    `Incorporate architectural and environmental details appropriate for ${market}: ${marketDetails}.`,
    ``,
    `No text, no numbers, no watermarks, no labels, no close-up faces.`,
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

async function generateArticleImage(title, shortBlurb, category, slug, market = 'AU', attemptsMade = 0, articleId = null) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[imageGen] GEMINI_API_KEY not set — skipping image generation');
    return null;
  }

  const prompt = await buildImagePrompt(title, shortBlurb, category, market);
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
  
  // Add market prefix to filename: {market}-{slug}.png
  let filename = `${market.toLowerCase()}-${fileSlug}.${ext}`;
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
      filename = `${market.toLowerCase()}-${fileSlug}-${hashSuffix}.${ext}`;
      filePath = path.join(IMAGES_DIR, filename);
      console.log(`[imageGen] Collision on ${market.toLowerCase()}-${fileSlug}.${ext} — using ${filename}`);
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