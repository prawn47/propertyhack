const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Property Hack data...');

  // Create AU market
  const auMarket = await prisma.market.upsert({
    where: { code: 'AU' },
    update: {},
    create: {
      code: 'AU',
      name: 'Australia',
      currency: 'AUD',
      isActive: true,
    },
  });
  console.log('✅ Created market:', auMarket.name);

  // Create default categories for AU market
  const categories = [
    { name: 'Market Analysis', slug: 'market-analysis', description: 'In-depth analysis of property market trends' },
    { name: 'Investment Tips', slug: 'investment-tips', description: 'Advice and strategies for property investors' },
    { name: 'Policy & Regulation', slug: 'policy-regulation', description: 'Government policy and regulatory updates' },
    { name: 'Auction Results', slug: 'auction-results', description: 'Latest auction clearance rates and results' },
    { name: 'Regional Markets', slug: 'regional-markets', description: 'News from regional property markets' },
    { name: 'Finance & Rates', slug: 'finance-rates', description: 'Interest rates and property finance news' },
  ];

  for (const cat of categories) {
    const category = await prisma.articleCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        market: 'AU',
      },
    });
    console.log('✅ Created category:', category.name);
  }

  // Create example sources (you can add more later)
  const sources = [
    {
      name: 'Domain',
      url: 'https://www.domain.com.au',
      feedType: 'manual',
      market: 'AU',
    },
    {
      name: 'realestate.com.au',
      url: 'https://www.realestate.com.au',
      feedType: 'manual',
      market: 'AU',
    },
    {
      name: 'Property Observer',
      url: 'https://www.propertyobserver.com.au',
      feedType: 'manual',
      market: 'AU',
    },
  ];

  for (const src of sources) {
    const source = await prisma.articleSource.upsert({
      where: { name: src.name },
      update: {},
      create: src,
    });
    console.log('✅ Created source:', source.name);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
