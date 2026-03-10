require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Duplicate Image URL Detection\n');

  // Fetch all articles that have an imageUrl
  const articles = await prisma.article.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, title: true, imageUrl: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total articles with imageUrl: ${articles.length}\n`);

  // Group by imageUrl
  const byImageUrl = {};
  for (const article of articles) {
    const url = article.imageUrl;
    if (!byImageUrl[url]) byImageUrl[url] = [];
    byImageUrl[url].push(article);
  }

  // Find duplicates (imageUrl shared by 2+ articles)
  const duplicates = Object.entries(byImageUrl).filter(([, group]) => group.length >= 2);

  if (duplicates.length === 0) {
    console.log('No duplicate image URLs found.');
    return;
  }

  console.log(`Found ${duplicates.length} image URL(s) shared by multiple articles:\n`);

  for (const [imageUrl, group] of duplicates) {
    console.log(`Image URL: ${imageUrl}`);
    console.log(`Shared by ${group.length} articles:`);
    for (const article of group) {
      console.log(`  - [${article.status}] ${article.id} | ${article.title}`);
    }
    console.log('');
  }

  console.log(`Summary: ${duplicates.length} duplicate image URL(s) across ${duplicates.reduce((sum, [, g]) => sum + g.length, 0)} articles`);
}

main()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
