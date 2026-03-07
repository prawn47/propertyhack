require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');
const { connection } = require('../queues/connection');

async function main() {
  const prisma = new PrismaClient();
  const imageQueue = new Queue('article-image', { connection });

  try {
    const forceAll = process.argv.includes('--all');
    const where = forceAll
      ? { status: 'PUBLISHED' }
      : { status: 'PUBLISHED', imageUrl: null };
    const articles = await prisma.article.findMany({
      where,
      select: { id: true },
    });

    for (const article of articles) {
      await imageQueue.add('generate-image', { articleId: article.id });
    }

    console.log(`Queued ${articles.length} articles for image generation`);
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
