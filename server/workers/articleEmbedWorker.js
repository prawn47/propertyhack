const { Worker } = require('bullmq')
const { connection } = require('../queues/connection')
const { PrismaClient } = require('@prisma/client')
const { generateEmbedding } = require('../services/embeddingService')

const prisma = new PrismaClient()

const articleEmbedWorker = new Worker('article-embed', async (job) => {
  const { articleId } = job.data

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, shortBlurb: true, longSummary: true }
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
  return { embedded: textContent.trim().length > 0, articleId }
}, {
  connection,
  concurrency: 3,
})

articleEmbedWorker.on('completed', (job) => {
  console.log(`[article-embed] Job ${job.id} completed`)
})

articleEmbedWorker.on('failed', (job, err) => {
  console.error(`[article-embed] Job ${job.id} failed:`, err.message)
})

module.exports = { articleEmbedWorker }
