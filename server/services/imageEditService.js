const fs = require('fs').promises;
const path = require('path');
const aiProviderService = require('./aiProviderService');

const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';
const IMAGES_DIR = isCloudflareWorker
  ? '/images/wizard'
  : path.join(__dirname, '../public/images/wizard');

// Same 15 retro camera/film styles from imageGenerationService
const PHOTO_STYLES = [
  { camera: 'Nikon FM2, 50mm f/1.4 lens', film: 'Kodak Gold 200', look: 'slight warm cast, visible film grain in shadows, natural colour saturation' },
  { camera: 'Canon AE-1, 35mm f/2.8 lens', film: 'Fuji Superia 400', look: 'cool-neutral tones with gentle green shift in shadows, fine grain texture' },
  { camera: 'Pentax K1000, 28mm f/2.8 lens', film: 'Kodak Portra 160', look: 'soft pastel highlights, muted warm tones, creamy bokeh on background' },
  { camera: 'Olympus OM-1, 50mm f/1.8 lens', film: 'Kodak Ektar 100', look: 'rich natural colours, sharp detail, slight warm shift in highlights' },
  { camera: 'Minolta X-700, 45mm f/2 lens', film: 'Agfa Vista 200', look: 'punchy midtones, slight amber warmth, organic grain pattern' },
  { camera: 'Leica M6, 35mm f/2 lens', film: 'Kodak Tri-X 400', look: 'B&W, high contrast, dramatic grain, deep blacks, classic photojournalism' },
  { camera: 'Contax T2, 38mm f/2.8 lens', film: 'Fuji Pro 400H', look: 'pastel greens, soft skin tones, gentle highlights, refined grain structure' },
  { camera: 'Hasselblad 500C, 80mm f/2.8 lens', film: 'Kodak Ektachrome E100', look: 'vivid slide film colours, fine grain, saturated blues and greens' },
  { camera: 'Mamiya 7, 80mm f/4 lens', film: 'Fuji Velvia 50', look: 'ultra-saturated, sharp landscape detail, intense colour contrast' },
  { camera: 'Yashica T4, 35mm f/3.5 lens', film: 'Kodak ColorPlus 200', look: 'casual snapshot feel, warm tones, nostalgic colour palette' },
  { camera: 'Rolleiflex 2.8F, 80mm f/2.8 lens', film: 'Ilford HP5 Plus', look: 'B&W, medium format, beautiful tonal range, smooth gradation' },
  { camera: 'Nikon F3, 50mm f/1.4 lens', film: 'CineStill 800T', look: 'cinematic tungsten cast, halation around lights, moody atmosphere' },
  { camera: 'Canon F-1, 50mm f/1.8 lens', film: 'Kodak UltraMax 400', look: 'punchy saturated colours, versatile daylight balance, vibrant reds' },
  { camera: 'Leica M3, 50mm f/2 lens', film: 'Agfa APX 100', look: 'B&W, fine grain, classic photojournalism feel, crisp definition' },
  { camera: 'Pentax 67, 105mm f/2.4 lens', film: 'Fuji Pro 160NS', look: 'medium format, natural colours, wedding photography feel, shallow depth' },
];

// Map style name strings to PHOTO_STYLES entries by film name
const STYLE_MAP = {};
PHOTO_STYLES.forEach((s, i) => {
  const key = s.film.toLowerCase().replace(/\s+/g, '-');
  STYLE_MAP[key] = s;
  STYLE_MAP[String(i)] = s;
});

function getStyleByName(styleName) {
  if (!styleName) return PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];
  const key = styleName.toLowerCase().replace(/\s+/g, '-');
  return STYLE_MAP[key] || PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function generateFilename(type, market, slug, date) {
  const d = date || new Date().toISOString().split('T')[0];
  const m = (market || 'au').toLowerCase();
  const s = slugify(slug || 'image');
  const ext = 'png';
  return `propertyhack-${type}-${m}-${s}-${d}.${ext}`;
}

function buildStylePrompt(style) {
  return `Shot on ${style.camera}. ${style.film} film stock. ${style.look}.`;
}

async function generateAltText(title, content) {
  const prompt = [
    'Write a short, descriptive alt text (max 125 characters) for an image accompanying this property news content.',
    `Title: ${title || 'Property news image'}`,
    content ? `Context: ${content.substring(0, 300)}` : '',
    'Return ONLY the alt text, no quotes, no prefix.',
  ].filter(Boolean).join('\n');

  try {
    const result = await aiProviderService.generateText('image-alt-text', prompt, {
      maxTokens: 100,
      temperature: 0.3,
    });
    return result.text.trim().replace(/^["']|["']$/g, '').substring(0, 125);
  } catch (err) {
    console.warn('[imageEdit] Alt text generation failed:', err.message);
    return title ? `Property news: ${title}`.substring(0, 125) : 'Property news image';
  }
}

async function saveImageFile(imageData, filename, mimeType) {
  const r2Bucket = globalThis.__cf_env?.IMAGES_BUCKET;

  if (r2Bucket) {
    const r2Key = `wizard/${filename}`;
    await r2Bucket.put(r2Key, imageData, {
      httpMetadata: { contentType: mimeType || 'image/png' },
    });
    console.log(`[imageEdit] Saved to R2: ${r2Key} (${(imageData.length / 1024).toFixed(0)}KB)`);
    return `/images/wizard/${filename}`;
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const filePath = path.join(IMAGES_DIR, filename);
  await fs.writeFile(filePath, imageData);
  console.log(`[imageEdit] Saved: ${filename} (${(imageData.length / 1024).toFixed(0)}KB)`);
  return `/images/wizard/${filename}`;
}

async function editImage(imageUrl, editPrompt, style, aspectRatio) {
  const photoStyle = getStyleByName(style);

  const prompt = [
    `Edit this image based on these instructions: ${editPrompt}`,
    '',
    `Maintain the retro camera film aesthetic throughout.`,
    buildStylePrompt(photoStyle),
    aspectRatio ? `Aspect ratio: ${aspectRatio}.` : 'Wide 16:9 landscape composition.',
    '',
    'The image should feel authentic — a real moment captured on film, not staged or computer-generated.',
    'No text, no numbers, no watermarks, no labels, no close-up faces.',
  ].join(' ');

  console.log('[imageEdit] Edit prompt:', prompt.substring(0, 200) + '...');

  const result = await aiProviderService.generateImage('image-generation', prompt);
  const mimeType = result.mimeType || 'image/png';
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';

  const slug = slugify(editPrompt);
  const date = new Date().toISOString().split('T')[0];
  const filename = `propertyhack-edit-${slug}-${date}.${ext}`;

  const publicPath = await saveImageFile(result.imageData, filename, mimeType);
  const altText = await generateAltText(editPrompt, editPrompt);

  return { imageUrl: publicPath, altText, filename };
}

async function generateImageWithMetadata(prompt, style, aspectRatio, context) {
  const photoStyle = getStyleByName(style);

  const fullPrompt = [
    prompt,
    '',
    `Maintain the retro camera film aesthetic throughout.`,
    buildStylePrompt(photoStyle),
    aspectRatio ? `Aspect ratio: ${aspectRatio}.` : 'Wide 16:9 landscape composition.',
    '',
    'The image should feel authentic — a real moment captured on film, not staged or computer-generated.',
    'No text, no numbers, no watermarks, no labels, no close-up faces.',
  ].join(' ');

  console.log('[imageEdit] Generate prompt:', fullPrompt.substring(0, 200) + '...');

  const result = await aiProviderService.generateImage('image-generation', fullPrompt);
  const mimeType = result.mimeType || 'image/png';
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';

  const type = context?.type || 'image';
  const market = context?.market || 'au';
  const slugText = context?.title || prompt;
  const date = new Date().toISOString().split('T')[0];
  const filename = generateFilename(type, market, slugText, date).replace(/\.png$/, `.${ext}`);

  const publicPath = await saveImageFile(result.imageData, filename, mimeType);
  const altText = await generateAltText(context?.title || prompt, prompt);

  return { imageUrl: publicPath, altText, filename };
}

module.exports = {
  editImage,
  generateImageWithMetadata,
  generateFilename,
  generateAltText,
  slugify,
};
