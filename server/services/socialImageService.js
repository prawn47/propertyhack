const path = require('path');
const fs = require('fs');

const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';

// Sharp is not available on CF Workers, but this service may not be used there
const sharp = isCloudflareWorker ? null : require('sharp');

const PLATFORM_CONFIGS = {
  facebook:  { width: 1200, height: 630, fit: 'cover' },
  twitter:   { width: 1200, height: 630, fit: 'cover' },
  instagram: { width: 1080, height: 1080, fit: 'cover' },
};

const SOCIAL_IMAGE_DIR = isCloudflareWorker 
  ? '/images/social' 
  : path.join(__dirname, '../public/images/social');

if (!fs.existsSync(SOCIAL_IMAGE_DIR)) {
  fs.mkdirSync(SOCIAL_IMAGE_DIR, { recursive: true });
}

async function processImageForPlatform(sourceImagePath, platform, articleId) {
  if (isCloudflareWorker) {
    throw new Error('Social image processing not available on CF Workers (sharp not supported)');
  }
  
  const config = PLATFORM_CONFIGS[platform];
  if (!config) throw new Error(`Unknown platform: ${platform}`);

  const outputFilename = `${articleId}-${platform}.jpg`;
  const outputPath = path.join(SOCIAL_IMAGE_DIR, outputFilename);

  try {
    let imageBuffer;

    if (sourceImagePath && (sourceImagePath.startsWith('http://') || sourceImagePath.startsWith('https://'))) {
      const response = await fetch(sourceImagePath);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else if (sourceImagePath && fs.existsSync(sourceImagePath)) {
      imageBuffer = fs.readFileSync(sourceImagePath);
    } else {
      return await generateFallbackImage(platform, articleId);
    }

    await sharp(imageBuffer)
      .resize(config.width, config.height, { fit: config.fit, position: 'centre' })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    return `/images/social/${outputFilename}`;
  } catch (err) {
    console.error(`[socialImageService] Failed to process image for ${platform}:`, err.message);
    return await generateFallbackImage(platform, articleId);
  }
}

async function generateFallbackImage(platform, articleId) {
  const config = PLATFORM_CONFIGS[platform];
  const outputFilename = `${articleId}-${platform}-fallback.jpg`;
  const outputPath = path.join(SOCIAL_IMAGE_DIR, outputFilename);

  const svgText = `
    <svg width="${config.width}" height="${config.height}">
      <rect width="100%" height="100%" fill="#2b2b2b"/>
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#d4b038" text-anchor="middle" dominant-baseline="middle">PropertyHack</text>
      <text x="50%" y="58%" font-family="Arial, sans-serif" font-size="24" fill="#f0f0f0" text-anchor="middle" dominant-baseline="middle">Property News &amp; Insights</text>
    </svg>
  `;

  await sharp(Buffer.from(svgText))
    .resize(config.width, config.height)
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  return `/images/social/${outputFilename}`;
}

module.exports = { processImageForPlatform, generateFallbackImage, PLATFORM_CONFIGS };
