const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { PrismaClient } = require('@prisma/client');
const { fetchCuratedNews } = require('../services/perplexityService');

const prisma = new PrismaClient();
const userNewsLastFetch = new Map(); // Track last fetch time per user

/**
 * Process news curation for a user
 */
async function processNewsCuration(job) {
  const { userId } = job.data;
  
  console.log(`[news-curation-worker] Processing news for user ${userId}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });

  if (!user || !user.settings) {
    console.log(`[news-curation-worker] User ${userId} not found or has no settings, skipping`);
    return;
  }

  const now = new Date();
  
  // Check if we already fetched news for this user recently
  const lastFetch = userNewsLastFetch.get(userId);
  if (lastFetch) {
    const hoursSinceLastFetch = (now - lastFetch) / (1000 * 60 * 60);
    if (hoursSinceLastFetch < 23) {
      console.log(`[news-curation-worker] Already fetched news for user ${userId} within last 23 hours, skipping`);
      return;
    }
  }

  // Fetch and save news articles
  const articles = await fetchCuratedNews(user.settings);
  
  if (articles.length > 0) {
    // Delete old articles (keep last 50)
    const existingCount = await prisma.newsArticle.count({ where: { userId } });
    if (existingCount > 50) {
      const toDelete = await prisma.newsArticle.findMany({
        where: { userId },
        orderBy: { fetchedAt: 'desc' },
        skip: 50,
        select: { id: true },
      });
      await prisma.newsArticle.deleteMany({
        where: { id: { in: toDelete.map(a => a.id) } },
      });
    }

    // Save new articles
    await Promise.all(
      articles.map(article =>
        prisma.newsArticle.create({
          data: {
            userId,
            title: article.title,
            summary: article.summary,
            content: article.content,
            url: article.url,
            source: article.source,
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
            category: article.category,
            relevanceScore: article.relevanceScore,
          },
        })
      )
    );

    console.log(`[news-curation-worker] Saved ${articles.length} articles for user ${userId}`);
    userNewsLastFetch.set(userId, now);
  } else {
    console.log(`[news-curation-worker] No articles fetched for user ${userId}`);
  }
}

// Create the worker
const newsCurationWorker = new Worker('news-curation', processNewsCuration, {
  connection,
  concurrency: 3, // Process up to 3 users concurrently
  limiter: {
    max: 5, // Max 5 jobs
    duration: 60000, // per 60 seconds (rate limit for API calls)
  },
});

// Worker event handlers
newsCurationWorker.on('completed', (job) => {
  console.log(`[news-curation-worker] Job ${job.id} completed`);
});

newsCurationWorker.on('failed', (job, err) => {
  console.error(`[news-curation-worker] Job ${job?.id} failed:`, err.message);
});

newsCurationWorker.on('error', (err) => {
  console.error('[news-curation-worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[news-curation-worker] SIGTERM received, closing worker');
  await newsCurationWorker.close();
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('[news-curation-worker] SIGINT received, closing worker');
  await newsCurationWorker.close();
  await prisma.$disconnect();
});

module.exports = { newsCurationWorker };
