'use strict';

const { PrismaClient } = require('@prisma/client');
const { articleImageQueue } = require('../queues/articleImageQueue');

const prisma = new PrismaClient();

async function main() {
  // Find published articles with no image or only fallback SVGs
  const missing = await prisma.article.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { imageUrl: null },
        { imageUrl: { startsWith: '/images/fallbacks/' } },
      ],
    },
    select: { id: true, title: true, imageUrl: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${missing.length} published articles with missing/fallback images`);

  // Reset imageGenerationFailed so the worker retries properly
  const ids = missing.map((a) => a.id);
  if (ids.length > 0) {
    await prisma.article.updateMany({
      where: { id: { in: ids } },
      data: { imageGenerationFailed: false },
    });
  }

  for (const article of missing) {
    await articleImageQueue.add('image-article', { articleId: article.id });
    const status = article.imageUrl ? 'fallback' : 'null';
    console.log(`  Enqueued (${status}): ${article.id} — "${article.title.slice(0, 60)}"`);
  }

  console.log(`\nDone. ${missing.length} articles re-enqueued for image generation.`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
