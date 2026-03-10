require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const ai = require('../services/aiProviderService');

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
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

  const { text } = await ai.generateText('relevance-scoring', prompt, { jsonMode: true });

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/"relevanceScore"\s*:\s*(\d+)/);
    if (match) {
      parsed = { relevanceScore: parseInt(match[1], 10) };
    } else {
      console.warn(`  [WARN] Could not parse score from response, defaulting to 5`);
      parsed = { relevanceScore: 5 };
    }
  }

  const score = parseInt(parsed.relevanceScore, 10);
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    console.warn(`  [WARN] Invalid score "${parsed.relevanceScore}", defaulting to 5`);
    return 5;
  }
  return score;
}

async function main() {
  console.log(`Audit article relevance — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${LIMIT ? `, limit: ${LIMIT}` : ''}`);
  console.log(`Thresholds: delete <${REJECT_BELOW}, keep draft ${REJECT_BELOW}-${REVIEW_BELOW - 1}, publish ${REVIEW_BELOW}+\n`);

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
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(`Found ${articles.length} DRAFT articles without a relevance score\n`);

  if (articles.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  let deleted = 0;
  let keptDraft = 0;
  let published = 0;
  let errors = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const progress = `${i + 1}/${articles.length}`;

    process.stdout.write(`[${progress}] "${article.title.substring(0, 70)}" ... `);

    try {
      const score = await scoreArticle(article);

      if (score < REJECT_BELOW) {
        process.stdout.write(`score=${score} → DELETE\n`);
        if (!DRY_RUN) {
          await prisma.article.delete({ where: { id: article.id } });
        }
        deleted++;
      } else if (score < REVIEW_BELOW) {
        process.stdout.write(`score=${score} → DRAFT\n`);
        if (!DRY_RUN) {
          await prisma.article.update({
            where: { id: article.id },
            data: { relevanceScore: score },
          });
        }
        keptDraft++;
      } else {
        process.stdout.write(`score=${score} → PUBLISH\n`);
        if (!DRY_RUN) {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              relevanceScore: score,
              status: 'PUBLISHED',
              publishedAt: new Date(),
            },
          });
        }
        published++;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message.substring(0, 80)}\n`);
      errors++;
    }

    if (i < articles.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const processed = deleted + keptDraft + published;
  console.log('\n─────────────────────────────────');
  console.log(`Final report${DRY_RUN ? ' (DRY RUN — no changes made)' : ''}:`);
  console.log(`  Processed : ${processed}`);
  console.log(`  Deleted   : ${deleted}  (score < ${REJECT_BELOW})`);
  console.log(`  Kept draft: ${keptDraft}  (score ${REJECT_BELOW}–${REVIEW_BELOW - 1})`);
  console.log(`  Published : ${published}  (score ${REVIEW_BELOW}+)`);
  if (errors > 0) console.log(`  Errors    : ${errors}`);
  console.log('─────────────────────────────────');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
