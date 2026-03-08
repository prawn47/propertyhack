require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LOCATION_CONFIGS = [
  {
    location: 'Sydney', slug: 'sydney',
    metaTitle: 'Sydney Property News & Market Updates 2026',
    metaDescription: 'Latest Sydney property news, house prices, auction results and real estate market analysis. Stay informed with agenda-free coverage from PropertyHack.',
    h1Title: 'Sydney Property News & Market Updates',
    introContent: 'Stay up to date with the latest Sydney property market news. From auction clearance rates in the eastern suburbs to new developments in western Sydney, PropertyHack covers it all.',
    focusKeywords: ['sydney property market', 'sydney house prices', 'sydney auction results', 'sydney real estate news', 'sydney property forecast'],
  },
  {
    location: 'Melbourne', slug: 'melbourne',
    metaTitle: 'Melbourne Property News & Market Updates 2026',
    metaDescription: 'Latest Melbourne property news, house prices, auction clearance rates and market analysis. Agenda-free coverage from PropertyHack.',
    h1Title: 'Melbourne Property News & Market Updates',
    introContent: 'Get the latest Melbourne property market updates. From inner-city apartment trends to suburban growth corridors, PropertyHack delivers agenda-free news coverage.',
    focusKeywords: ['melbourne property market', 'melbourne house prices', 'melbourne auction clearance rates', 'melbourne real estate news'],
  },
  {
    location: 'Brisbane', slug: 'brisbane',
    metaTitle: 'Brisbane Property News & Market Updates 2026',
    metaDescription: 'Latest Brisbane property news, house prices and real estate market analysis. Covering South East Queensland property trends with PropertyHack.',
    h1Title: 'Brisbane Property News & Market Updates',
    introContent: 'Brisbane continues to be one of Australia\'s fastest-growing property markets. Stay informed with the latest news on house prices, development, and market trends.',
    focusKeywords: ['brisbane property market', 'brisbane house prices', 'brisbane real estate news', 'brisbane property growth'],
  },
  {
    location: 'Perth', slug: 'perth',
    metaTitle: 'Perth Property News & Market Updates 2026',
    metaDescription: 'Latest Perth property news, house prices and Western Australia real estate market analysis from PropertyHack.',
    h1Title: 'Perth Property News & Market Updates',
    introContent: 'Perth\'s property market continues to outperform many eastern states capitals. Get the latest updates on house prices, rental yields, and market forecasts.',
    focusKeywords: ['perth property market', 'perth house prices', 'perth property growth', 'perth real estate news'],
  },
  {
    location: 'Adelaide', slug: 'adelaide',
    metaTitle: 'Adelaide Property News & Market Updates 2026',
    metaDescription: 'Latest Adelaide property news, house prices and South Australia real estate market analysis from PropertyHack.',
    h1Title: 'Adelaide Property News & Market Updates',
    introContent: 'Adelaide\'s affordable property market has attracted national attention. Follow the latest price movements, development news, and market analysis.',
    focusKeywords: ['adelaide property market', 'adelaide house prices', 'adelaide property growth', 'adelaide real estate news'],
  },
  {
    location: 'Canberra', slug: 'canberra',
    metaTitle: 'Canberra Property News & Market Updates 2026',
    metaDescription: 'Latest Canberra property news, house prices and ACT real estate market analysis from PropertyHack.',
    h1Title: 'Canberra Property News & Market Updates',
    introContent: 'Canberra\'s property market is driven by government employment and steady population growth. Stay informed with the latest market updates.',
    focusKeywords: ['canberra property market', 'canberra house prices', 'canberra real estate'],
  },
  {
    location: 'Hobart', slug: 'hobart',
    metaTitle: 'Hobart Property News & Market Updates 2026',
    metaDescription: 'Latest Hobart property news, house prices and Tasmania real estate market analysis from PropertyHack.',
    h1Title: 'Hobart Property News & Market Updates',
    introContent: 'Hobart has seen significant property price growth in recent years. Track the latest movements in Tasmania\'s capital city property market.',
    focusKeywords: ['hobart property market', 'hobart house prices', 'hobart real estate'],
  },
  {
    location: 'Darwin', slug: 'darwin',
    metaTitle: 'Darwin Property News & Market Updates 2026',
    metaDescription: 'Latest Darwin property news, house prices and Northern Territory real estate market analysis from PropertyHack.',
    h1Title: 'Darwin Property News & Market Updates',
    introContent: 'Darwin\'s property market offers unique opportunities with strong rental yields. Stay up to date with NT property news and analysis.',
    focusKeywords: ['darwin property market', 'darwin house prices', 'darwin real estate'],
  },
  {
    location: 'Gold Coast', slug: 'gold-coast',
    metaTitle: 'Gold Coast Property News & Market Updates 2026',
    metaDescription: 'Latest Gold Coast property news, house prices and Queensland coastal real estate market analysis from PropertyHack.',
    h1Title: 'Gold Coast Property News & Market Updates',
    introContent: 'The Gold Coast property market continues to attract interstate migrants and investors. Follow the latest news on prices, developments, and lifestyle trends.',
    focusKeywords: ['gold coast property market', 'gold coast real estate', 'gold coast property prices'],
  },
];

const NZ_LOCATION_CONFIGS = [
  {
    location: 'Auckland', slug: 'auckland',
    metaTitle: 'Auckland Property News & Market Updates 2026',
    metaDescription: 'Latest Auckland property news, house prices and real estate market analysis. Stay informed with agenda-free coverage from PropertyHack.',
    h1Title: 'Auckland Property News & Market Updates',
    introContent: 'Auckland is New Zealand\'s largest property market. Stay up to date with the latest news on house prices, development, and market trends across the Auckland region.',
    focusKeywords: ['auckland property market', 'auckland house prices', 'auckland real estate news', 'auckland property forecast'],
  },
  {
    location: 'Wellington', slug: 'wellington',
    metaTitle: 'Wellington Property News & Market Updates 2026',
    metaDescription: 'Latest Wellington property news, house prices and real estate market analysis from PropertyHack.',
    h1Title: 'Wellington Property News & Market Updates',
    introContent: 'Wellington\'s property market is shaped by government employment and a vibrant culture scene. Follow the latest price movements and market analysis.',
    focusKeywords: ['wellington property market', 'wellington house prices', 'wellington real estate news'],
  },
  {
    location: 'Christchurch', slug: 'christchurch',
    metaTitle: 'Christchurch Property News & Market Updates 2026',
    metaDescription: 'Latest Christchurch property news, house prices and Canterbury real estate market analysis from PropertyHack.',
    h1Title: 'Christchurch Property News & Market Updates',
    introContent: 'Christchurch continues its post-earthquake rebuild transformation. Stay informed with the latest property market news and development updates.',
    focusKeywords: ['christchurch property market', 'christchurch house prices', 'christchurch real estate news'],
  },
  {
    location: 'Hamilton', slug: 'hamilton',
    metaTitle: 'Hamilton Property News & Market Updates 2026',
    metaDescription: 'Latest Hamilton property news, house prices and Waikato real estate market analysis from PropertyHack.',
    h1Title: 'Hamilton Property News & Market Updates',
    introContent: 'Hamilton and the wider Waikato region offer growing property opportunities. Track the latest market trends and price movements.',
    focusKeywords: ['hamilton property market', 'hamilton house prices', 'hamilton nz real estate'],
  },
  {
    location: 'Tauranga', slug: 'tauranga',
    metaTitle: 'Tauranga Property News & Market Updates 2026',
    metaDescription: 'Latest Tauranga property news, house prices and Bay of Plenty real estate market analysis from PropertyHack.',
    h1Title: 'Tauranga Property News & Market Updates',
    introContent: 'Tauranga and the Bay of Plenty are among New Zealand\'s fastest-growing regions. Stay informed with property news, prices, and lifestyle trends.',
    focusKeywords: ['tauranga property market', 'tauranga house prices', 'bay of plenty real estate'],
  },
  {
    location: 'Dunedin', slug: 'dunedin',
    metaTitle: 'Dunedin Property News & Market Updates 2026',
    metaDescription: 'Latest Dunedin property news, house prices and Otago real estate market analysis from PropertyHack.',
    h1Title: 'Dunedin Property News & Market Updates',
    introContent: 'Dunedin offers some of New Zealand\'s most affordable property. Follow the latest market updates and investment opportunities in Otago.',
    focusKeywords: ['dunedin property market', 'dunedin house prices', 'dunedin real estate'],
  },
  {
    location: 'Queenstown', slug: 'queenstown',
    metaTitle: 'Queenstown Property News & Market Updates 2026',
    metaDescription: 'Latest Queenstown property news, house prices and Central Otago real estate market analysis from PropertyHack.',
    h1Title: 'Queenstown Property News & Market Updates',
    introContent: 'Queenstown\'s premium property market is driven by tourism and lifestyle demand. Track luxury home prices, development news, and investment trends.',
    focusKeywords: ['queenstown property market', 'queenstown house prices', 'queenstown real estate'],
  },
  {
    location: 'Napier', slug: 'napier',
    metaTitle: 'Napier Property News & Market Updates 2026',
    metaDescription: 'Latest Napier property news, house prices and Hawke\'s Bay real estate market analysis from PropertyHack.',
    h1Title: 'Napier Property News & Market Updates',
    introContent: 'Napier and the wider Hawke\'s Bay region offer lifestyle property opportunities. Stay informed with the latest market news and price trends.',
    focusKeywords: ['napier property market', 'napier house prices', "hawke's bay real estate"],
  },
];

const NZ_NATIONAL_KEYWORDS = [
  'new zealand property news', 'property market new zealand', 'nz real estate news',
  'house prices new zealand', 'nz property market forecast 2026', 'nz interest rate property impact',
  'first home buyer nz', 'property investment new zealand', 'nz rental market',
  'housing affordability new zealand', 'nz property market update',
];

const NATIONAL_KEYWORDS = [
  'australian property news', 'property market australia', 'real estate news australia',
  'house prices australia', 'property market forecast 2026', 'interest rate property impact',
  'first home buyer news', 'property investment australia', 'auction results australia',
  'rental market australia', 'property market update', 'housing affordability australia',
];

async function main() {
  console.log('Seeding SEO data...');

  // Backfill any existing AU LocationSeo records that may lack the country field
  const backfilled = await prisma.locationSeo.updateMany({
    where: { country: '' },
    data: { country: 'AU' },
  });
  if (backfilled.count > 0) {
    console.log(`  Backfilled country='AU' on ${backfilled.count} LocationSeo records`);
  }

  // Seed location configs
  for (const config of LOCATION_CONFIGS) {
    const existing = await prisma.locationSeo.findUnique({ where: { slug: config.slug } });
    if (existing) {
      console.log(`  Location ${config.location} already exists, skipping`);
      continue;
    }
    await prisma.locationSeo.create({ data: { ...config, country: 'AU' } });
    console.log(`  Created location config: ${config.location}`);
  }

  // Seed NZ location configs
  for (const config of NZ_LOCATION_CONFIGS) {
    const existing = await prisma.locationSeo.findUnique({ where: { slug: config.slug } });
    if (existing) {
      console.log(`  Location ${config.location} already exists, skipping`);
      continue;
    }
    await prisma.locationSeo.create({ data: { ...config, country: 'NZ' } });
    console.log(`  Created NZ location config: ${config.location}`);
  }

  // Seed national keywords
  for (const keyword of NATIONAL_KEYWORDS) {
    const existing = await prisma.seoKeyword.findFirst({ where: { keyword, location: null } });
    if (existing) continue;
    await prisma.seoKeyword.create({ data: { keyword, priority: 1 } });
    console.log(`  Created national keyword: ${keyword}`);
  }

  // Seed NZ national keywords
  for (const keyword of NZ_NATIONAL_KEYWORDS) {
    const existing = await prisma.seoKeyword.findFirst({ where: { keyword, location: null } });
    if (existing) continue;
    await prisma.seoKeyword.create({ data: { keyword, priority: 1 } });
    console.log(`  Created NZ national keyword: ${keyword}`);
  }

  // Seed per-city keywords
  for (const config of LOCATION_CONFIGS) {
    for (const keyword of config.focusKeywords) {
      const existing = await prisma.seoKeyword.findFirst({ where: { keyword, location: config.location } });
      if (existing) continue;
      await prisma.seoKeyword.create({ data: { keyword, location: config.location, priority: 1 } });
      console.log(`  Created keyword: ${keyword} (${config.location})`);
    }
  }

  // Seed NZ per-city keywords
  for (const config of NZ_LOCATION_CONFIGS) {
    for (const keyword of config.focusKeywords) {
      const existing = await prisma.seoKeyword.findFirst({ where: { keyword, location: config.location } });
      if (existing) continue;
      await prisma.seoKeyword.create({ data: { keyword, location: config.location, priority: 1 } });
      console.log(`  Created NZ keyword: ${keyword} (${config.location})`);
    }
  }

  console.log('SEO seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
