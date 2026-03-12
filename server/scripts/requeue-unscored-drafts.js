'use strict';

const { PrismaClient } = require('@prisma/client');
const { articleSummariseQueue } = require('../queues/articleSummariseQueue');

const prisma = new PrismaClient();

async function main() {
  const unscored = await prisma.article.findMany({
    where: { status: 'DRAFT', relevanceScore: null },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${unscored.length} unscored DRAFT articles to re-enqueue`);

  for (const article of unscored) {
    await articleSummariseQueue.add('summarise', { articleId: article.id });
    console.log(`  Enqueued: ${article.id} — "${article.title.slice(0, 60)}"`);
  }

  console.log(`\nDone. ${unscored.length} articles re-enqueued for summarisation.`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
