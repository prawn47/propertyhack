#!/usr/bin/env node
/**
 * Regenerate all article images using Image Gen v2
 * Connects directly to the database and calls Gemini API
 * Saves images locally first, then batch upload to R2
 * 
 * Usage:
 *   node regenerate-images.js              # Process all articles
 *   node regenerate-images.js --limit 10   # Process first 10 only
 *   node regenerate-images.js --dry-run    # Show what would be processed
 */

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const GEMINI_API_KEY = 'AIzaSyBE1pkGHNBROeKI4bNR9r2dBeedVRsQURY';
const IMAGES_DIR = '/tmp/ph-images';
const DELAY_BETWEEN_CALLS = 2000; // 2 seconds

// 15 distinct photographer styles from v2 service
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
    look: 'creamy skin tones, muted colour palette, fine grain structure',
  },
  {
    camera: 'Olympus OM-1, 24mm f/2.8 lens',
    film: 'Agfa Vista Plus 200',
    look: 'slightly oversaturated blues and greens, warm highlight tones',
  },
  {
    camera: 'Leica M6, 35mm f/2.0 lens',
    film: 'Ilford HP5 Plus 400',
    look: 'black and white with rich contrast, detailed shadows',
  },
  {
    camera: 'Hasselblad 500CM, 80mm f/2.8 lens',
    film: 'Kodak Ektar 100',
    look: 'ultra-fine grain, vivid colour saturation, medium format depth',
  },
  {
    camera: 'Mamiya RB67, 127mm f/3.8 lens',
    film: 'Fuji Pro 400H',
    look: 'soft pastels, lifted shadows, dreamy medium format rendering',
  },
  {
    camera: 'Contax G2, 28mm f/2.8 lens',
    film: 'Cinestill 800T',
    look: 'tungsten balanced with halation glow, distinctive grain structure',
  },
  {
    camera: 'Bronica SQ-A, 80mm f/2.8 lens',
    film: 'Kodak T-Max 100',
    look: 'black and white with excellent sharpness, smooth tonal gradation',
  },
  {
    camera: 'Nikon F3, 85mm f/1.8 lens',
    film: 'Fuji Velvia 50',
    look: 'highly saturated colours, deep shadows, slide film aesthetic',
  },
  {
    camera: 'Canon F-1, 24mm f/2.8 lens',
    film: 'Kodak Tri-X 400',
    look: 'black and white with classic contrast curve, pronounced grain',
  },
  {
    camera: 'Pentax 67, 105mm f/2.4 lens',
    film: 'Portra 800',
    look: 'push-processed look with enhanced grain, warm highlights',
  },
  {
    camera: 'Minolta X-700, 50mm f/1.7 lens',
    film: 'Lomography Color Negative 400',
    look: 'cross-processed colour shifts, vintage saturation curve',
  },
  {
    camera: 'Rollei 35S, 40mm f/2.8 lens',
    film: 'Agfa APX 100',
    look: 'black and white with smooth gradation, compact camera sharpness',
  },
  {
    camera: 'Yashica Mat-124G, 80mm f/3.5 lens',
    film: 'Kodak Gold 400',
    look: 'twin-lens reflex rendering, warm colour bias, distinctive bokeh',
  }
];

// Market code mapping
const MARKET_CODES = {
  'Australia': 'au',
  'New Zealand': 'nz', 
  'United Kingdom': 'uk',
  'United States': 'us',
  'Canada': 'ca'
};

function getMarketCode(location) {
  return MARKET_CODES[location] || 'au';
}

function selectPhotoStyle(articleId) {
  // Use article ID to deterministically select style (consistent across runs)
  // Convert string ID to number using simple hash
  let hash = 0;
  for (let i = 0; i < articleId.length; i++) {
    const char = articleId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % PHOTO_STYLES.length;
  return PHOTO_STYLES[index];
}

function generateFilename(title, location, slug) {
  const marketCode = getMarketCode(location);
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  return `${marketCode}-${safeTitle}.png`;
}

async function generatePrompt(article) {
  const style = selectPhotoStyle(article.id);
  
  // Enhanced prompt using AI scene descriptions (simplified version for bulk)
  const prompt = `Photograph of a ${article.category || 'property'} scene inspired by: "${article.title}". ${article.shortBlurb ? `Context: ${article.shortBlurb.substring(0, 200)}` : ''}

Photography specifications:
- Camera: ${style.camera}
- Film: ${style.film}  
- Look: ${style.look}

Style: Professional real estate photography with ${style.look}. High quality, well-composed, architectural focus. No text, watermarks, or people clearly visible. ${article.location ? `Location style: ${article.location}` : 'Australia'}.

Create a compelling, professional property photograph that captures the essence of this article.`;

  return prompt;
}

async function callGeminiAPI(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  
  // Find the image part in the response
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(part => part.inlineData?.data);
  
  if (!imagePart) {
    throw new Error('No image data in Gemini response');
  }

  return {
    imageData: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType || 'image/png'
  };
}

async function saveImageLocally(filename, imageData) {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const filePath = path.join(IMAGES_DIR, filename);
  await fs.writeFile(filePath, imageData);
  return filePath;
}

async function processArticle(article, index, total) {
  const filename = generateFilename(article.title, article.location, article.slug);
  console.log(`[${index + 1}/${total}] Processing: ${filename}`);

  try {
    const prompt = await generatePrompt(article);
    const result = await callGeminiAPI(prompt);
    
    // Save locally
    const filePath = await saveImageLocally(filename, result.imageData);
    
    // Update database with the new image path
    const publicPath = `/images/articles/${filename}`;
    await prisma.article.update({
      where: { id: article.id },
      data: {
        imageUrl: publicPath,
        imageAltText: `Professional ${article.category || 'property'} photograph from ${article.location || 'Australia'}`,
        imageGenerationFailed: false
      }
    });

    console.log(`✅ Generated: ${filename} (${Math.round(result.imageData.length / 1024)}KB)`);
    return { success: true, filename, size: result.imageData.length };
    
  } catch (error) {
    if (error.message.includes('429') || error.message.includes('403')) {
      // Rate limit or quota exceeded
      throw error;
    }
    
    console.error(`❌ Failed ${filename}: ${error.message}`);
    return { success: false, filename, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

  console.log('🚀 PropertyHack Image Generation v2 - Bulk Regeneration');
  console.log('=====================================');

  // Fetch articles that need images
  const where = {
    status: 'PUBLISHED',
    OR: [
      { imageUrl: null },
      { imageUrl: { startsWith: '/images/fallbacks/' } },
      { imageGenerationFailed: true }
    ]
  };

  const articles = await prisma.article.findMany({
    where,
    select: {
      id: true,
      title: true, 
      shortBlurb: true,
      category: true,
      location: true,
      slug: true,
      imageUrl: true
    },
    orderBy: { createdAt: 'desc' },
    ...(limit && { take: limit })
  });

  console.log(`Found ${articles.length} articles needing images`);
  
  if (isDryRun) {
    console.log('\n📋 DRY RUN - Articles to process:');
    articles.forEach((article, i) => {
      const filename = generateFilename(article.title, article.location, article.slug);
      console.log(`  ${i + 1}. ${filename} — "${article.title}"`);
    });
    process.exit(0);
  }

  if (articles.length === 0) {
    console.log('✨ No articles need image generation');
    process.exit(0);
  }

  console.log(`\n🎯 Processing ${articles.length} articles...`);
  console.log(`⏱️  Rate limit: ${DELAY_BETWEEN_CALLS}ms between API calls`);
  console.log(`💾 Saving to: ${IMAGES_DIR}`);

  const results = {
    successful: 0,
    failed: 0,
    errors: [],
    totalSize: 0
  };

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    try {
      const result = await processArticle(article, i, articles.length);
      
      if (result.success) {
        results.successful++;
        results.totalSize += result.size;
      } else {
        results.failed++;
        results.errors.push({ filename: result.filename, error: result.error });
      }
      
      // Rate limiting delay (except for last item)
      if (i < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));
      }
      
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('403')) {
        console.error(`\n🚨 Hit API limit at article ${i + 1}/${articles.length}: ${error.message}`);
        console.log(`✅ Successfully processed: ${results.successful} images`);
        console.log(`❌ Failed: ${results.failed} images`);
        console.log('💡 Stopping here - API quota exceeded');
        process.exit(1);
      }
      
      console.error(`❌ Unexpected error processing article ${article.id}: ${error.message}`);
      results.failed++;
    }
  }

  // Summary
  console.log('\n📊 Regeneration Summary');
  console.log('========================');
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📁 Total size: ${Math.round(results.totalSize / 1024 / 1024)}MB`);
  console.log(`🗂️  Images saved to: ${IMAGES_DIR}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed images:');
    results.errors.forEach(({ filename, error }) => {
      console.log(`  - ${filename}: ${error}`);
    });
  }

  if (results.successful > 0) {
    console.log('\n🔄 Next steps:');
    console.log('1. Upload images to R2:');
    console.log(`   cd ${IMAGES_DIR}`);
    console.log('   for f in *.png; do npx wrangler r2 object put "propertyhack-images/articles/$f" --file "$f"; done');
    console.log('\n2. Verify uploads and test image serving');
  }

  console.log('\n🎉 Bulk regeneration complete!');
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});