require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding relevance threshold config...');

  const result = await prisma.systemPrompt.upsert({
    where: { name: 'relevance-thresholds' },
    update: {},
    create: {
      name: 'relevance-thresholds',
      description: 'Configurable thresholds for article relevance scoring — JSON format',
      content: '{ "rejectBelow": 4, "reviewBelow": 7 }',
      isActive: true,
    },
  });

  console.log(`  [${result.createdAt === result.updatedAt ? 'created' : 'already exists'}] 'relevance-thresholds'`);
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
