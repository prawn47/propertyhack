const fs = require('fs').promises;
const path = require('path');

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
    `Flat geometric editorial illustration for a property news article thumbnail.`,
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

async function generateArticleImage(title, shortBlurb, category) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[imageGen] GEMINI_API_KEY not set — skipping image generation');
    return null;
  }

  const prompt = buildImagePrompt(title, shortBlurb, category);
  const model = 'imagen-3.0-generate-002';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

  let responseData;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/png',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[imageGen] API error ${response.status}: ${errText.substring(0, 200)}`);
      return null;
    }

    responseData = await response.json();
  } catch (err) {
    console.error(`[imageGen] Request failed: ${err.message}`);
    return null;
  }

  const prediction = responseData?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    console.error('[imageGen] No image data in response');
    return null;
  }

  const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
  const mimeType = prediction.mimeType || 'image/png';

  const slug = generateSlug(title);
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = `${slug}-${Date.now()}.${ext}`;
  const filePath = path.join(IMAGES_DIR, filename);

  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.writeFile(filePath, imageBuffer);
    console.log(`[imageGen] Saved: ${filename}`);
  } catch (err) {
    console.error(`[imageGen] Failed to save image: ${err.message}`);
    return null;
  }

  return {
    imageData: imageBuffer,
    mimeType,
    filename,
    publicPath: `/images/articles/${filename}`,
  };
}

module.exports = {
  generateArticleImage,
  buildImagePrompt,
};
