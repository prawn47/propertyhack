require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');
const { connection } = require('../queues/connection');

async function main() {
  const prisma = new PrismaClient();
  const imageQueue = new Queue('article-image', { connection });

  let totalChecked = 0;
  let missingCount = 0;
  let brokenCount = 0;

  try {
    // 1. Find published articles with no image that haven't permanently failed
    const missingImages = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        imageUrl: null,
        imageGenerationFailed: false,
        relevanceScore: { gte: 7 },
      },
      select: { id: true, title: true },
    });

    totalChecked += missingImages.length;
    missingCount = missingImages.length;

    for (const article of missingImages) {
      await imageQueue.add('generate-image', { articleId: article.id });
    }

    if (missingCount > 0) {
      console.log(`[missing] Re-queued ${missingCount} articles with no image`);
    }

    // 2. Find published articles with local file paths and check if files exist
    const localImages = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        imageUrl: { startsWith: '/images/articles/' },
      },
      select: { id: true, title: true, imageUrl: true },
    });

    totalChecked += localImages.length;

    for (const article of localImages) {
      const filePath = path.join(__dirname, '..', 'public', article.imageUrl);
      if (!fs.existsSync(filePath)) {
        brokenCount++;
        await prisma.article.update({
          where: { id: article.id },
          data: { imageUrl: null },
        });
        await imageQueue.add('generate-image', { articleId: article.id });
      }
    }

    if (brokenCount > 0) {
      console.log(`[broken] Cleared and re-queued ${brokenCount} articles with missing files`);
    }

    // 3. Print summary
    console.log('\n--- Image Audit Summary ---');
    console.log(`Total articles checked: ${totalChecked}`);
    console.log(`Missing images (re-queued): ${missingCount}`);
    console.log(`Broken file paths (re-queued): ${brokenCount}`);
  } finally {
    await prisma.$disconnect();
    await imageQueue.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
