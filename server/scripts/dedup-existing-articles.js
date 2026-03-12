require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createHash } = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function normaliseText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateContentHash(title, content) {
  const normalisedTitle = normaliseText(title);
  const normalisedContent = normaliseText((content || '').slice(0, 500));
  return createHash('sha256')
    .update(normalisedTitle + '|' + normalisedContent)
    .digest('hex');
}

const BATCH_SIZE = 100;

async function main() {
  let totalProcessed = 0;
  let hashesBackfilled = 0;
  let duplicatesArchived = 0;
  let imageDuplicatesFound = 0;

  // Step 1: Backfill content hashes for articles missing them
  console.log('--- Backfilling content hashes ---');
  let skip = 0;
  while (true) {
    const articles = await prisma.article.findMany({
      where: { contentHash: null },
      select: { id: true, title: true, originalContent: true, shortBlurb: true },
      take: BATCH_SIZE,
      skip,
    });

    if (articles.length === 0) break;

    for (const article of articles) {
      const content = article.originalContent || article.shortBlurb || '';
      const hash = generateContentHash(article.title, content);
      await prisma.article.update({
        where: { id: article.id },
        data: { contentHash: hash },
      });
      hashesBackfilled++;
    }

    totalProcessed += articles.length;
    console.log(`  Backfilled batch: ${articles.length} articles (total: ${hashesBackfilled})`);
    // Don't increment skip — we're filtering by contentHash: null, so processed records drop out
  }

  // Step 2: Find and archive duplicates by contentHash
  console.log('--- Finding duplicate content hashes ---');
  const duplicateHashes = await prisma.$queryRaw`
    SELECT content_hash, COUNT(*)::int as count
    FROM articles
    WHERE content_hash IS NOT NULL
    GROUP BY content_hash
    HAVING COUNT(*) > 1
  `;

  for (const { content_hash } of duplicateHashes) {
    const dupes = await prisma.article.findMany({
      where: { contentHash: content_hash },
      select: { id: true, title: true, relevanceScore: true, publishedAt: true, status: true },
      orderBy: [
        { relevanceScore: { sort: 'desc', nulls: 'last' } },
        { publishedAt: 'desc' },
      ],
    });

    // Keep the first (highest relevanceScore, then most recent publishedAt), archive the rest
    const keep = dupes[0];
    const toArchive = dupes.slice(1).filter(d => d.status !== 'ARCHIVED');

    if (toArchive.length > 0) {
      await prisma.article.updateMany({
        where: { id: { in: toArchive.map(d => d.id) } },
        data: { status: 'ARCHIVED' },
      });
      duplicatesArchived += toArchive.length;
      console.log(`  Keeping "${keep.title}" (score: ${keep.relevanceScore}), archived ${toArchive.length} duplicate(s)`);
    }
  }

  // Step 3: Report image duplicates
  console.log('--- Checking for duplicate images ---');
  const duplicateImages = await prisma.$queryRaw`
    SELECT image_url, array_agg(id) as ids
    FROM articles
    WHERE image_url IS NOT NULL
      AND image_url NOT LIKE '%.svg'
      AND image_url NOT LIKE '%/fallback%'
    GROUP BY image_url
    HAVING COUNT(*) > 1
  `;

  for (const { image_url, ids } of duplicateImages) {
    imageDuplicatesFound++;
    console.log(`  Duplicate image: ${image_url} shared by articles: ${ids.join(', ')}`);
  }

  // Summary
  console.log('\n=== Deduplication Summary ===');
  console.log(`Total articles processed for hash backfill: ${totalProcessed}`);
  console.log(`Hashes backfilled: ${hashesBackfilled}`);
  console.log(`Duplicates archived: ${duplicatesArchived}`);
  console.log(`Image duplicates found: ${imageDuplicatesFound}`);
}

main()
  .catch((err) => {
    console.error('Deduplication failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
