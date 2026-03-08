const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.socialConfig.findFirst();
  if (!existing) {
    await prisma.socialConfig.create({
      data: {
        tonePrompt: 'Informative, concise, neutral news tone. Not salesy or clickbaity. Write like a news outlet sharing stories, not a brand doing marketing.',
        defaultHashtags: ['#PropertyNews', '#RealEstate'],
        minPostGapMins: 5,
        maxDelayMins: 60,
      },
    });
    console.log('Default SocialConfig created');
  } else {
    console.log('SocialConfig already exists, skipping seed');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
