const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PropertyHack database...');

  const passwordHash = await bcrypt.hash('changeme123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@propertyhack.com' },
    update: {},
    create: {
      email: 'admin@propertyhack.com',
      passwordHash,
      displayName: 'Admin',
      superAdmin: true,
    },
  });
  console.log('Created admin user: admin@propertyhack.com');

  const markets = [
    { code: 'AU', name: 'Australia', currency: 'AUD' },
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'UK', name: 'United Kingdom', currency: 'GBP' },
    { code: 'CA', name: 'Canada', currency: 'CAD' },
  ];

  for (const m of markets) {
    await prisma.market.upsert({
      where: { code: m.code },
      update: {},
      create: { ...m, isActive: true },
    });
  }
  console.log('Created markets: AU, US, UK, CA');

  const baseCategories = [
    { name: 'Property Market', baseSlug: 'property-market', description: 'Overall property market trends and analysis' },
    { name: 'Residential', baseSlug: 'residential', description: 'Residential property news and sales' },
    { name: 'Commercial', baseSlug: 'commercial', description: 'Commercial property and development news' },
    { name: 'Investment', baseSlug: 'investment', description: 'Property investment strategies and tips' },
    { name: 'Development', baseSlug: 'development', description: 'New developments and construction news' },
    { name: 'Policy', baseSlug: 'policy', description: 'Government policy and regulatory changes' },
    { name: 'Finance', baseSlug: 'finance', description: 'Interest rates, mortgages and property finance' },
  ];

  const categoryMarkets = ['AU', 'US', 'UK', 'CA'];

  for (const market of categoryMarkets) {
    for (const cat of baseCategories) {
      const slug = market === 'AU' ? cat.baseSlug : `${cat.baseSlug}-${market.toLowerCase()}`;
      await prisma.articleCategory.upsert({
        where: { slug },
        update: {},
        create: { name: cat.name, slug, description: cat.description, market, isActive: true },
      });
    }
  }
  console.log('Created 28 article categories (7 per market: AU, US, UK, CA)');

  await prisma.ingestionSource.upsert({
    where: { id: 'seed-domain-rss' },
    update: {},
    create: {
      id: 'seed-domain-rss',
      name: 'Domain.com.au RSS',
      type: 'RSS',
      config: { feedUrl: 'https://www.domain.com.au/rss/news', maxItems: 50 },
      market: 'AU',
      category: 'property-market',
      schedule: '0 */30 * * * *',
      isActive: true,
    },
  });
  console.log('Created sample RSS source: Domain.com.au');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
