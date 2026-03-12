const { Worker } = require('bullmq');
const { connection } = require('../queues/connection');
const { articleEmbedQueue } = require('../queues/articleEmbedQueue');
const { socialGenerateQueue } = require('../queues/socialGenerateQueue');
const { generateArticleImage } = require('../services/imageGenerationService');
const { generateImageAltText } = require('../services/articleSummaryService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getSeoKeywords(category, location) {
  const where = { isActive: true };
  const conditions = [];
  if (category) conditions.push({ category });
  if (location) conditions.push({ location });
  conditions.push({ category: null, location: null });

  where.OR = conditions;

  const keywords = await prisma.seoKeyword.findMany({
    where,
    select: { keyword: true },
    orderBy: { priority: 'desc' },
    take: 5,
  });
  return keywords.map(k => k.keyword);
}

const articleImageWorker = new Worker('article-image', async (job) => {
  const { articleId } = job.data;
  console.log(`[article-image] Processing article: ${articleId}`);

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      shortBlurb: true,
      category: true,
      slug: true,
      imageUrl: true,
      location: true,
    },
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const updateData = {};

  const hasExistingRealImage = article.imageUrl && !article.imageUrl.startsWith('/images/fallbacks/');

  let imageResult = null;
  if (!hasExistingRealImage) {
    imageResult = await generateArticleImage(
      article.title,
      article.shortBlurb,
      article.category || 'uncategorized',
      article.slug,
      job.attemptsMade,
      article.id,
    );
  } else {
    console.log(`[article-image] Article ${articleId} already has image — skipping generation`);
  }

  if (imageResult) {
    updateData.imageUrl = imageResult.publicPath;
    if (imageResult.isFallback) {
      updateData.imageGenerationFailed = true;
      console.log(`[article-image] Image generation failed for article ${articleId}, marked as failed`);
    } else {
      console.log(`[article-image] Image generated for article ${articleId}: ${imageResult.publicPath}`);
    }
  } else {
    console.log(`[article-image] Image generation returned null for article ${articleId} — skipping`);
  }

  const hasImage = !!(imageResult || hasExistingRealImage);
  if (hasImage && !article.imageAltText) {
    try {
      const focusKeywords = await getSeoKeywords(article.category, article.location);
      const altText = await generateImageAltText(article.title, article.shortBlurb || '', focusKeywords);
      updateData.imageAltText = altText;
      console.log(`[article-image] Alt text generated for article ${articleId}`);
    } catch (err) {
      console.warn(`[article-image] Alt text generation failed for ${articleId}: ${err.message}`);
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.article.update({
      where: { id: articleId },
      data: updateData,
    });
  }

  await articleEmbedQueue.add('embed-article', { articleId });

  // Trigger social post generation for published articles
  try {
    const publishedArticle = await prisma.article.findUnique({
      where: { id: articleId },
      select: { status: true },
    });
    if (publishedArticle?.status === 'PUBLISHED') {
      await socialGenerateQueue.add('social-generate', { articleId });
      console.log(`[article-image] Queued social post generation for article: ${articleId}`);
    }
  } catch (err) {
    // Don't fail the image job if social queueing fails
    console.error(`[article-image] Failed to queue social generation:`, err.message);
  }

  console.log(`[article-image] Completed: ${articleId}`);
  return { articleId, hasImage: !!imageResult };
}, {
  connection,
  concurrency: 1,
  lockDuration: 120000,
  stalledInterval: 120000,
});

articleImageWorker.on('completed', (job) => {
  console.log(`[article-image] Job ${job.id} completed`);
});

articleImageWorker.on('failed', (job, err) => {
  console.error(`[article-image] Job ${job.id} failed:`, err.message);
});

module.exports = { articleImageWorker };
