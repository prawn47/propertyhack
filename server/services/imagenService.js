const fs = require('fs/promises');
const path = require('path');
const aiProviderService = require('./aiProviderService');

const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';
const NEWSLETTERS_DIR = isCloudflareWorker 
  ? '/images/newsletters' 
  : path.join(__dirname, '..', 'public', 'images', 'newsletters');
const STYLE_PREFIX = 'Professional editorial illustration for a property news newsletter. No text overlays, no watermarks. ';

/**
 * Generate a newsletter hero image via the AI provider abstraction.
 * @param {string} prompt - Image description
 * @returns {Promise<{ imageData: Buffer, mimeType: string }>}
 */
async function generateNewsletterImage(prompt) {
  const fullPrompt = STYLE_PREFIX + prompt;
  const result = await aiProviderService.generateImage('newsletter-image', fullPrompt);
  return { imageData: result.imageData, mimeType: result.mimeType || 'image/png' };
}

/**
 * Save image data to the newsletters directory.
 * @param {Buffer} imageData
 * @param {string} filename - Without extension
 * @returns {Promise<string>} URL path (e.g. /images/newsletters/abc123.png)
 */
/**
 * Save image — R2 (CF Workers) or local filesystem.
 * Ref: Beads workspace-8i6
 */
async function saveImage(imageData, filename) {
  const r2Bucket = globalThis.__cf_env?.IMAGES_BUCKET;

  if (r2Bucket) {
    // CF Workers — save to R2
    const r2Key = `newsletters/${filename}.png`;
    await r2Bucket.put(r2Key, imageData, {
      httpMetadata: { contentType: 'image/png' },
    });
    console.log(`[imagenService] Saved to R2: ${r2Key}`);
    return `/images/newsletters/${filename}.png`;
  }

  // Local — save to filesystem
  await fs.mkdir(NEWSLETTERS_DIR, { recursive: true });
  const filePath = path.join(NEWSLETTERS_DIR, `${filename}.png`);
  await fs.writeFile(filePath, imageData);
  return `/images/newsletters/${filename}.png`;
}

function generateNewsletterFilename(jurisdiction, date) {
  const j = (jurisdiction || 'au').toLowerCase();
  const d = date instanceof Date
    ? date.toISOString().slice(0, 10)
    : typeof date === 'string' ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `propertyhack-newsletter-${j}-${d}-hero`;
}

function generateNewsletterAltText(subject) {
  return `PropertyHack newsletter hero image: ${subject || 'latest edition'}`;
}

/**
 * Orchestrator: generate and save a hero image for a newsletter draft.
 * Loads an optional prompt template from SystemPrompt, interpolates subject/theme,
 * generates the image, and saves it.
 *
 * @param {string} newsletterId - Used as fallback filename
 * @param {string} subject - Newsletter subject line
 * @param {string} themeText - Theme or topic description
 * @param {object} [options] - Optional: { jurisdiction }
 * @returns {Promise<{url: string|null, altText: string}>} URL path and alt text
 */
async function generateHeroImage(newsletterId, subject, themeText, options = {}) {
  try {
    let prompt = `${subject}. ${themeText}`;

    try {
      const { getClient } = require('../lib/prisma');
      const prisma = getClient();
      const template = await prisma.systemPrompt.findFirst({
        where: { name: 'newsletter-image-prompt-template', isActive: true },
      });

      if (template && template.content) {
        prompt = template.content
          .replace(/\{subject\}/g, subject)
          .replace(/\{theme\}/g, themeText);
      }
    } catch {
      // No template found — use default prompt
    }

    // Use descriptive filename, fall back to newsletterId
    let filename;
    try {
      filename = generateNewsletterFilename(options.jurisdiction, new Date());
    } catch {
      filename = newsletterId;
    }

    const { imageData } = await generateNewsletterImage(prompt);
    const urlPath = await saveImage(imageData, filename);
    const altText = generateNewsletterAltText(subject);
    return { url: urlPath, altText };
  } catch (err) {
    console.warn(`[imagenService] Failed to generate hero image for newsletter ${newsletterId}: ${err.message}`);
    return { url: null, altText: generateNewsletterAltText(subject) };
  }
}

module.exports = {
  generateNewsletterImage,
  saveImage,
  generateHeroImage,
  generateNewsletterFilename,
  generateNewsletterAltText,
};
