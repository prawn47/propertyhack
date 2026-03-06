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

  const categories = [
    { name: 'Property Market', slug: 'property-market', description: 'Overall property market trends and analysis', market: 'AU' },
    { name: 'Residential', slug: 'residential', description: 'Residential property news and sales', market: 'AU' },
    { name: 'Commercial', slug: 'commercial', description: 'Commercial property and development news', market: 'AU' },
    { name: 'Investment', slug: 'investment', description: 'Property investment strategies and tips', market: 'AU' },
    { name: 'Development', slug: 'development', description: 'New developments and construction news', market: 'AU' },
    { name: 'Policy', slug: 'policy', description: 'Government policy and regulatory changes', market: 'AU' },
    { name: 'Finance', slug: 'finance', description: 'Interest rates, mortgages and property finance', market: 'AU' },
  ];

  for (const cat of categories) {
    await prisma.articleCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    });
  }
  console.log('Created 7 article categories');

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
