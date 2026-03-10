require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`Draft article cleanup — Pass 1 — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Count DRAFT articles with no title AND no summary (broken ingestion artifacts)
  const targets = await prisma.$queryRaw`
    SELECT id FROM articles
    WHERE status = 'DRAFT'
      AND (title IS NULL OR trim(title) = '')
      AND (short_blurb IS NULL OR trim(short_blurb) = '')
  `;

  console.log(`Found ${targets.length} draft articles with no title and no summary`);

  if (targets.length === 0) {
    console.log('Nothing to delete.');
  } else if (!DRY_RUN) {
    const ids = targets.map(r => r.id);
    const { count } = await prisma.article.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`Deleted: ${count} articles`);
  } else {
    console.log(`Would delete: ${targets.length} articles (dry run)`);
  }

  // Report remaining drafts
  const remainingDrafts = await prisma.article.count({
    where: { status: 'DRAFT' },
  });
  console.log(`\nRemaining DRAFT articles: ${remainingDrafts}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
