/**
 * Article Embed Worker — generates vector embeddings via OpenAI
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection')
const { getClient } = require('../lib/prisma')
const { generateEmbedding } = require('../services/embeddingService')
const { pingIndexNow } = require('../services/indexNowService')

async function processJob(data) {
  const prisma = getClient()
  const { articleId } = data

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, shortBlurb: true, longSummary: true, slug: true }
  })

  if (!article) {
    throw new Error(`Article not found: ${articleId}`)
  }

  const textContent = [article.title, article.shortBlurb, article.longSummary]
    .filter(Boolean)
    .join('\n\n')

  if (textContent.trim().length === 0) {
    console.log(`[article-embed] Article ${articleId} has no text content, skipping embedding`)
  } else {
    const embedding = await generateEmbedding(textContent)
    const embeddingStr = `[${embedding.join(',')}]`

    await prisma.$executeRaw`UPDATE articles SET embedding = ${embeddingStr}::vector WHERE id = ${articleId}`
    console.log(`[article-embed] Embedding stored for article ${articleId}`)
  }

  await prisma.article.update({
    where: { id: articleId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  })

  console.log(`[article-embed] Article ${articleId} published`)

  // Ping IndexNow (Bing/Perplexity) for faster crawl pickup
  if (article.slug) {
    pingIndexNow(article.slug).catch(() => {});
  }

  return { embedded: textContent.trim().length > 0, articleId }
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let articleEmbedWorker = null

if (!isCFWorkers) {
  const { Worker } = require('bullmq')
  articleEmbedWorker = new Worker('article-embed', async (job) => {
    return processJob(job.data)
  }, { connection, concurrency: 3 })

  articleEmbedWorker.on('completed', (job) => {
    console.log(`[article-embed] Job ${job.id} completed`)
  })

  articleEmbedWorker.on('failed', (job, err) => {
    console.error(`[article-embed] Job ${job.id} failed:`, err.message)
  })
} else {
  articleEmbedWorker = { close: async () => {} }
}

module.exports = { articleEmbedWorker, processJob }
