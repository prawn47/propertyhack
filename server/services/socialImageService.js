const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'social');

const PLATFORM_CONFIGS = {
  facebook: { width: 1200, height: 630, fit: 'cover' },
  twitter: { width: 1200, height: 630, fit: 'cover' },
  instagram: { width: 1080, height: 1080, fit: 'cover' },
};

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function processImageForPlatform(sourceImagePath, platform, articleId) {
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.facebook;
  const outputFilename = `${articleId}-${platform}.jpg`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  if (!sourceImagePath) {
    return await generateFallbackImage(platform, articleId);
  }

  // Resolve source image — could be a URL or local path
  let imageBuffer;
  if (sourceImagePath.startsWith('http://') || sourceImagePath.startsWith('https://')) {
    const res = await fetch(sourceImagePath);
    if (!res.ok) {
      console.error(`[socialImage] Failed to download image: ${res.status}`);
      return await generateFallbackImage(platform, articleId);
    }
    imageBuffer = Buffer.from(await res.arrayBuffer());
  } else {
    const localPath = sourceImagePath.startsWith('/')
      ? path.join(__dirname, '..', 'public', sourceImagePath)
      : sourceImagePath;
    if (!fs.existsSync(localPath)) {
      console.error(`[socialImage] Local image not found: ${localPath}`);
      return await generateFallbackImage(platform, articleId);
    }
    imageBuffer = fs.readFileSync(localPath);
  }

  try {
    await sharp(imageBuffer)
      .resize(config.width, config.height, { fit: config.fit, position: 'centre' })
      .jpeg({ quality: 85 })
      .toFile(outputPath);

    console.log(`[socialImage] Processed ${platform} image: ${outputFilename}`);
    return `/images/social/${outputFilename}`;
  } catch (err) {
    console.error(`[socialImage] Sharp processing failed:`, err.message);
    return await generateFallbackImage(platform, articleId);
  }
}

async function generateFallbackImage(platform, articleId) {
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.facebook;
  const outputFilename = `${articleId}-${platform}-fallback.jpg`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  const svg = `
    <svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#2b2b2b"/>
      <text x="50%" y="45%" text-anchor="middle" fill="#d4b038" font-size="48" font-family="Arial, sans-serif" font-weight="bold">PropertyHack</text>
      <text x="50%" y="60%" text-anchor="middle" fill="#888888" font-size="24" font-family="Arial, sans-serif">Property News &amp; Insights</text>
    </svg>`;

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  console.log(`[socialImage] Generated fallback image: ${outputFilename}`);
  return `/images/social/${outputFilename}`;
}

module.exports = { processImageForPlatform, generateFallbackImage };
