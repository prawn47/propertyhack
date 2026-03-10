require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const configs = [
  {
    task: 'article-summarisation',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  },
  {
    task: 'image-alt-text',
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
  },
  {
    task: 'image-generation',
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp-image-generation',
  },
  {
    task: 'newsletter-generation',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  },
  {
    task: 'relevance-scoring',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
  },
];

async function main() {
  console.log('Seeding AiModelConfig records...');

  for (const config of configs) {
    await prisma.aiModelConfig.upsert({
      where: { task: config.task },
      update: {},
      create: config,
    });
    console.log(`  [upserted] '${config.task}' → ${config.provider}/${config.model}`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
