const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { articleEmbedQueue } = require('../queues/articleEmbedQueue');
const { generateArticleSummary } = require('../services/articleSummaryService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const articleSummariseWorker = new Worker('article-summarise', async (job) => {
  const { articleId } = job.data;
  console.log(`[article-summarise] Processing article: ${articleId}`);

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      originalContent: true,
      sourceUrl: true,
      source: { select: { name: true } },
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const summary = await generateArticleSummary({
    title: article.title,
    content: article.originalContent,
    sourceUrl: article.sourceUrl,
    sourceName: article.source?.name,
  });

  // Match suggestedCategory slug to ArticleCategory table
  let categorySlug = summary.suggestedCategory;
  const matchedCategory = await prisma.articleCategory.findUnique({
    where: { slug: categorySlug },
  });
  if (!matchedCategory) {
    const fallback = await prisma.articleCategory.findUnique({
      where: { slug: 'uncategorized' },
    });
    categorySlug = fallback ? 'uncategorized' : categorySlug;
  }

  await prisma.article.update({
    where: { id: articleId },
    data: {
      shortBlurb: summary.shortBlurb,
      longSummary: summary.longSummary,
      category: categorySlug,
      location: summary.extractedLocation,
    },
  });

  await articleEmbedQueue.add('embed-article', { articleId });

  console.log(`[article-summarise] Completed article: ${articleId} → category: ${categorySlug}`);
  return { articleId, category: categorySlug };
}, {
  connection,
  concurrency: 2,
});

articleSummariseWorker.on('completed', (job) => {
  console.log(`[article-summarise] Job ${job.id} completed`);
});

articleSummariseWorker.on('failed', (job, err) => {
  console.error(`[article-summarise] Job ${job.id} failed:`, err.message);
});

module.exports = { articleSummariseWorker };
