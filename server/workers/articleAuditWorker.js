/**
 * Article Audit Worker — re-scores article relevance via Gemini
 * Dual-mode: CF Queue consumer (via processJob) or BullMQ worker (local dev)
 * Ref: Beads workspace-8i6
 */
const { connection, isCFWorkers } = require('../queues/connection');
const { getClient } = require('../lib/prisma');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const RATE_LIMIT_MS = 1000;
const REJECT_BELOW = 4;
const REVIEW_BELOW = 7;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scoreArticle(article) {
  const content = article.originalContent
    ? article.originalContent.substring(0, 500)
    : 'No content';
  const summary = article.shortBlurb || 'No summary';

  const prompt = `Rate the relevance of this article to property and real estate on a scale of 1-10.

Title: ${article.title}
Summary: ${summary}
Content: ${content}

Scoring guide:
- 9-10: Core property content (sales, auctions, listings, market reports, development)
- 7-8: Strongly related (housing policy, mortgage rates, construction, investment strategy)
- 5-6: Moderately related (macro economics affecting property, infrastructure, lifestyle)
- 3-4: Loosely related (general finance, broad economics, urban planning)
- 1-2: Not related (sports, entertainment, celebrity, unrelated politics)

Respond with JSON only: { "relevanceScore": <integer 1-10>, "reason": "<brief reason>" }`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/"relevanceScore"\s*:\s*(\d+)/);
    if (match) {
      parsed = { relevanceScore: parseInt(match[1], 10) };
    } else {
      parsed = { relevanceScore: 5 };
    }
  }

  const score = parseInt(parsed.relevanceScore, 10);
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    return 5;
  }
  return score;
}

async function processJob(data, job) {
  const prisma = getClient();
  const { limit = 0 } = data || {};

  const articles = await prisma.article.findMany({
    where: {
      status: 'DRAFT',
      relevanceScore: null,
    },
    select: {
      id: true,
      title: true,
      shortBlurb: true,
      originalContent: true,
    },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });

  const total = articles.length;
  let deleted = 0;
  let keptDraft = 0;
  let published = 0;
  let errors = 0;

  if (job?.updateProgress) await job.updateProgress({ total, processed: 0, deleted, keptDraft, published, errors });

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    try {
      const score = await scoreArticle(article);

      if (score < REJECT_BELOW) {
        await prisma.article.delete({ where: { id: article.id } });
        deleted++;
      } else if (score < REVIEW_BELOW) {
        await prisma.article.update({
          where: { id: article.id },
          data: { relevanceScore: score },
        });
        keptDraft++;
      } else {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            relevanceScore: score,
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });
        published++;
      }
    } catch (err) {
      console.error(`[article-audit] Error scoring article ${article.id}: ${err.message}`);
      errors++;
    }

    if (job?.updateProgress) await job.updateProgress({ total, processed: i + 1, deleted, keptDraft, published, errors });

    if (i < articles.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  return { total, deleted, keptDraft, published, errors };
}

// ── BullMQ Worker (local dev only) ─────────────────────────────────
let articleAuditWorker = null;

if (!isCFWorkers) {
  const { Worker } = require('bullmq');
  articleAuditWorker = new Worker('article-audit', async (job) => {
    return processJob(job.data, job);
  }, { connection, concurrency: 1, lockDuration: 3600000, stalledInterval: 60000 });

  articleAuditWorker.on('completed', (job, result) => {
    console.log(`[article-audit] Job ${job.id} completed:`, result);
  });

  articleAuditWorker.on('failed', (job, err) => {
    console.error(`[article-audit] Job ${job.id} failed:`, err.message);
  });
} else {
  articleAuditWorker = { close: async () => {} };
}

module.exports = { articleAuditWorker, processJob };
