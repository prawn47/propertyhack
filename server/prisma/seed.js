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

  const globalSources = [
    {
      id: 'seed-housingwire-rss',
      name: 'HousingWire',
      type: 'RSS',
      config: { feedUrl: 'https://www.housingwire.com/feed' },
      market: 'US',
    },
    {
      id: 'seed-realtor-news-rss',
      name: 'Realtor.com News',
      type: 'RSS',
      config: { feedUrl: 'https://www.realtor.com/news/feed' },
      market: 'US',
    },
    {
      id: 'seed-inman-rss',
      name: 'Inman News',
      type: 'RSS',
      config: { feedUrl: 'https://www.inman.com/feed' },
      market: 'US',
    },
    {
      id: 'seed-nar-economists-rss',
      name: "NAR Economists' Outlook",
      type: 'RSS',
      config: { feedUrl: 'https://www.nar.realtor/blogs/economists-outlook/feed' },
      market: 'US',
    },
    {
      id: 'seed-propertywire-rss',
      name: 'Property Wire',
      type: 'RSS',
      config: { feedUrl: 'https://www.propertywire.com/feed' },
      market: 'UK',
    },
    {
      id: 'seed-propertyreporter-rss',
      name: 'Property Reporter',
      type: 'RSS',
      config: { feedUrl: 'https://www.propertyreporter.co.uk/feed' },
      market: 'UK',
    },
    {
      id: 'seed-estateagenttoday-rss',
      name: 'Estate Agent Today',
      type: 'RSS',
      config: { feedUrl: 'https://www.estateagenttoday.co.uk/rss' },
      market: 'UK',
    },
    {
      id: 'seed-rightmove-blog-rss',
      name: 'Rightmove Blog',
      type: 'RSS',
      config: { feedUrl: 'https://www.rightmove.co.uk/news/feed' },
      market: 'UK',
    },
    {
      id: 'seed-crea-rss',
      name: 'CREA',
      type: 'RSS',
      config: { feedUrl: 'https://creastats.crea.ca/feed' },
      market: 'CA',
    },
    {
      id: 'seed-rew-ca-rss',
      name: 'REW.ca',
      type: 'RSS',
      config: { feedUrl: 'https://www.rew.ca/news.rss' },
      market: 'CA',
    },
    {
      id: 'seed-canadian-re-magazine-rss',
      name: 'Canadian Real Estate Magazine',
      type: 'RSS',
      config: { feedUrl: 'https://www.canadianrealestatemagazine.ca/feed' },
      market: 'CA',
    },
  ];

  for (const source of globalSources) {
    await prisma.ingestionSource.upsert({
      where: { id: source.id },
      update: {},
      create: {
        ...source,
        isActive: false,
      },
    });
  }
  console.log('Created 11 inactive ingestion sources for US, UK, CA markets');

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
