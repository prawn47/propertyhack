require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

function truncateToWords(text, maxWords) {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();

  const sentences = text.trim().split(/(?<=\.)\s+/);
  let result = '';
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;
    if (wordCount + sentenceWords > maxWords && wordCount > 0) break;
    result += (result ? ' ' : '') + sentence;
    wordCount += sentenceWords;
  }

  if (!result.endsWith('.')) result += '.';
  return result;
}

async function main() {
  console.log(`Shorten summaries — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${LIMIT ? `, limit: ${LIMIT}` : ''}\n`);

  const articles = await prisma.$queryRawUnsafe(
    `SELECT id, title, "shortBlurb", "longSummary"
     FROM articles
     WHERE status = 'PUBLISHED'
       AND "longSummary" IS NOT NULL
       AND array_length(string_to_array(trim("longSummary"), ' '), 1) > 100
     ORDER BY "publishedAt" DESC
     ${LIMIT ? `LIMIT ${LIMIT}` : ''}`
  );

  console.log(`Found ${articles.length} articles with longSummary > 100 words\n`);

  if (articles.length === 0) return;

  let updated = 0;
  for (const article of articles) {
    const oldBlurbWords = article.shortBlurb?.split(/\s+/).length || 0;
    const oldSummaryWords = article.longSummary.split(/\s+/).length;

    const newBlurb = oldBlurbWords > 60 ? truncateToWords(article.shortBlurb, 55) : article.shortBlurb;
    const newSummary = truncateToWords(article.longSummary, 90);
    const newSummaryWords = newSummary.split(/\s+/).length;

    console.log(`[${article.id}] "${article.title.substring(0, 60)}..."`);
    console.log(`  longSummary: ${oldSummaryWords} → ${newSummaryWords} words`);
    if (oldBlurbWords > 60) {
      console.log(`  shortBlurb: ${oldBlurbWords} → ${newBlurb.split(/\s+/).length} words`);
    }

    if (!DRY_RUN) {
      const data = { longSummary: newSummary };
      if (oldBlurbWords > 60) data.shortBlurb = newBlurb;
      await prisma.article.update({ where: { id: article.id }, data });
      updated++;
    }
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'}: ${DRY_RUN ? articles.length : updated} articles`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
