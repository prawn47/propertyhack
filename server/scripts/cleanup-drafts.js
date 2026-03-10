require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const SCORE_PASS = process.argv.includes('--score');

const SCORE_SYSTEM_PROMPT = `You are a property news relevance scorer. Given an article title and optional content snippet, return a JSON object with a single field:
- relevanceScore: integer 1-10 — rate the relevance of this article to property and real estate:
  - 9-10: Core property content (sales, auctions, listings, market reports, development)
  - 7-8: Strongly related (housing policy, mortgage rates, construction, investment strategy)
  - 5-6: Moderately related (macro economics affecting property, infrastructure, lifestyle/architecture)
  - 3-4: Loosely related (general finance, broad economics, urban planning without property focus)
  - 1-2: Not related (sports, entertainment, celebrity, unrelated politics)

Return ONLY valid JSON. Example: {"relevanceScore": 7}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scoreArticle(ai, article) {
  const snippet = article.content ? article.content.substring(0, 500) : '';
  const userPrompt = `Title: ${article.title}\n${snippet ? `Content snippet: ${snippet}` : ''}`;

  const { text } = await ai.generateText('relevance-scoring', userPrompt, {
    systemPrompt: SCORE_SYSTEM_PROMPT,
    jsonMode: true,
    maxTokens: 64,
  });

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/"relevanceScore"\s*:\s*(\d+)/);
    if (match) parsed = { relevanceScore: parseInt(match[1], 10) };
    else return null;
  }

  const score = parseInt(parsed.relevanceScore, 10);
  if (Number.isInteger(score) && score >= 1 && score <= 10) return score;
  return null;
}

async function runPass1() {
  console.log(`\nPass 1: Delete drafts with no title and no summary — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
  const targets = await prisma.$queryRaw`
    SELECT id FROM articles
    WHERE status = 'DRAFT'
      AND (title IS NULL OR trim(title) = '')
      AND (short_blurb IS NULL OR trim(short_blurb) = '')
  `;

  console.log(`Found ${targets.length} draft articles with no title and no summary`);

  if (targets.length === 0) {
    console.log('Nothing to delete.');
    return 0;
  }

  if (!DRY_RUN) {
    const ids = targets.map(r => r.id);
    const { count } = await prisma.article.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted: ${count} articles`);
    return count;
  } else {
    console.log(`Would delete: ${targets.length} articles (dry run)`);
    return 0;
  }
}

async function runPass2() {
  const ai = require('../services/aiProviderService');

  console.log(`\nPass 2: Score remaining drafts for relevance — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const drafts = await prisma.article.findMany({
    where: {
      status: 'DRAFT',
      relevanceScore: null,
    },
    select: { id: true, title: true, content: true },
  });

  console.log(`Found ${drafts.length} unscored DRAFT articles to evaluate\n`);

  if (drafts.length === 0) {
    console.log('Nothing to score.');
    return { scored: 0, deleted: 0, promoted: 0, kept: 0 };
  }

  let scored = 0, deleted = 0, promoted = 0, kept = 0, errors = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < drafts.length; i++) {
    const article = drafts[i];

    if (i > 0 && i % BATCH_SIZE === 0) {
      console.log(`  Progress: ${i}/${drafts.length} — deleted ${deleted}, promoted ${promoted}, kept ${kept}, errors ${errors}`);
    }

    let score;
    try {
      score = await scoreArticle(ai, article);
    } catch (err) {
      console.warn(`  [WARN] Failed to score article ${article.id}: ${err.message.substring(0, 80)}`);
      errors++;
      await sleep(2000);
      continue;
    }

    if (score === null) {
      console.warn(`  [WARN] Unparseable score for article ${article.id}`);
      errors++;
      await sleep(1000);
      continue;
    }

    scored++;

    if (!DRY_RUN) {
      if (score < 4) {
        await prisma.article.delete({ where: { id: article.id } });
        deleted++;
        console.log(`  [DELETE] ${article.title?.substring(0, 60)} (score: ${score})`);
      } else if (score >= 7) {
        await prisma.article.update({
          where: { id: article.id },
          data: { relevanceScore: score, status: 'PUBLISHED' },
        });
        promoted++;
        console.log(`  [PUBLISH] ${article.title?.substring(0, 60)} (score: ${score})`);
      } else {
        await prisma.article.update({
          where: { id: article.id },
          data: { relevanceScore: score },
        });
        kept++;
        console.log(`  [KEEP] ${article.title?.substring(0, 60)} (score: ${score})`);
      }
    } else {
      if (score < 4) {
        console.log(`  [DRY-DELETE] ${article.title?.substring(0, 60)} (score: ${score})`);
        deleted++;
      } else if (score >= 7) {
        console.log(`  [DRY-PUBLISH] ${article.title?.substring(0, 60)} (score: ${score})`);
        promoted++;
      } else {
        console.log(`  [DRY-KEEP] ${article.title?.substring(0, 60)} (score: ${score})`);
        kept++;
      }
    }

    await sleep(1000);
  }

  return { scored, deleted, promoted, kept, errors };
}

async function main() {
  console.log('Draft article cleanup script');
  console.log('============================');

  const pass1Deleted = await runPass1();

  if (SCORE_PASS) {
    const { scored, deleted, promoted, kept, errors } = await runPass2();

    const remaining = await prisma.article.count({ where: { status: 'DRAFT' } });

    console.log('\n============================');
    console.log('Summary:');
    console.log(`  Pass 1 deleted:   ${pass1Deleted}`);
    console.log(`  Pass 2 scored:    ${scored}`);
    console.log(`  Pass 2 deleted:   ${deleted}  (score <4)`);
    console.log(`  Pass 2 published: ${promoted} (score 7+)`);
    console.log(`  Pass 2 kept:      ${kept}      (score 4-6)`);
    if (errors > 0) console.log(`  Pass 2 errors:    ${errors}`);
    console.log(`  Remaining drafts: ${remaining}`);
  } else {
    const remainingDrafts = await prisma.article.count({ where: { status: 'DRAFT' } });
    console.log(`\nRemaining DRAFT articles: ${remainingDrafts}`);
    console.log('\nTip: Run with --score to also score remaining drafts for relevance');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
