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
    metaTitle: 'Property News Auckland | PropertyHack',
    metaDescription: 'Stay ahead of Auckland\'s property market with the latest news on house prices, auction results, new developments, and suburb trends. Agenda-free coverage from PropertyHack.',
    h1Title: 'Property News in Auckland',
    introContent: 'Auckland is New Zealand\'s largest and most dynamic property market. From the North Shore to Manukau, PropertyHack tracks house prices, development activity, and market trends across the entire Auckland region.',
    focusKeywords: ['auckland property market', 'auckland house prices', 'auckland real estate news', 'auckland property forecast'],
  },
  {
    location: 'Wellington', slug: 'wellington',
    metaTitle: 'Property News Wellington | PropertyHack',
    metaDescription: 'Get the latest Wellington property news covering house prices, suburb trends, and real estate market analysis. Comprehensive coverage from PropertyHack.',
    h1Title: 'Property News in Wellington',
    introContent: 'Wellington\'s property market is shaped by government employment, a strong arts and culture scene, and a compact but vibrant city. PropertyHack covers the latest price movements, listings, and market analysis for the capital.',
    focusKeywords: ['wellington property market', 'wellington house prices', 'wellington real estate news'],
  },
  {
    location: 'Christchurch', slug: 'christchurch',
    metaTitle: 'Property News Christchurch | PropertyHack',
    metaDescription: 'Follow Christchurch property news with coverage of house prices, new builds, and Canterbury real estate market trends from PropertyHack.',
    h1Title: 'Property News in Christchurch',
    introContent: 'Christchurch continues its impressive post-earthquake transformation, with new developments and rising property values reshaping the city. PropertyHack covers the latest Canterbury property news, from inner-city apartments to suburban growth corridors.',
    focusKeywords: ['christchurch property market', 'christchurch house prices', 'christchurch real estate news'],
  },
  {
    location: 'Hamilton', slug: 'hamilton',
    metaTitle: 'Property News Hamilton | PropertyHack',
    metaDescription: 'Keep up with Hamilton property news including house prices, new subdivisions, and Waikato real estate market updates from PropertyHack.',
    h1Title: 'Property News in Hamilton',
    introContent: 'Hamilton and the wider Waikato region are attracting strong buyer interest thanks to relative affordability and a growing local economy. PropertyHack tracks the latest market trends, price movements, and development news.',
    focusKeywords: ['hamilton property market', 'hamilton house prices', 'hamilton nz real estate'],
  },
  {
    location: 'Tauranga', slug: 'tauranga',
    metaTitle: 'Property News Tauranga | PropertyHack',
    metaDescription: 'Tauranga property news covering house prices, coastal lifestyle property, and Bay of Plenty real estate market updates from PropertyHack.',
    h1Title: 'Property News in Tauranga',
    introContent: 'Tauranga and the Bay of Plenty are among New Zealand\'s fastest-growing and most sought-after regions. PropertyHack covers the latest property news, lifestyle trends, and price movements across the area.',
    focusKeywords: ['tauranga property market', 'tauranga house prices', 'bay of plenty real estate'],
  },
  {
    location: 'Dunedin', slug: 'dunedin',
    metaTitle: 'Property News Dunedin | PropertyHack',
    metaDescription: 'Dunedin property news with coverage of house prices, student rental market trends, and Otago real estate updates from PropertyHack.',
    h1Title: 'Property News in Dunedin',
    introContent: 'Dunedin offers some of New Zealand\'s most affordable property, with a diverse market spanning student rentals near the university to lifestyle blocks in Otago. PropertyHack keeps you up to date with the latest market news and investment opportunities.',
    focusKeywords: ['dunedin property market', 'dunedin house prices', 'dunedin real estate'],
  },
  {
    location: 'Queenstown', slug: 'queenstown',
    metaTitle: 'Property News Queenstown | PropertyHack',
    metaDescription: 'Queenstown property news covering luxury real estate, house prices, and Central Otago market trends. Premium coverage from PropertyHack.',
    h1Title: 'Property News in Queenstown',
    introContent: 'Queenstown\'s premium property market is driven by tourism, lifestyle demand, and strong international interest. PropertyHack tracks luxury home prices, development news, and investment trends in one of New Zealand\'s most desirable locations.',
    focusKeywords: ['queenstown property market', 'queenstown house prices', 'queenstown real estate'],
  },
  {
    location: 'Napier', slug: 'napier',
    metaTitle: 'Property News Napier | PropertyHack',
    metaDescription: 'Latest Napier property news, house prices and Hawke\'s Bay real estate market analysis from PropertyHack.',
    h1Title: 'Property News in Napier',
    introContent: 'Napier and the wider Hawke\'s Bay region offer attractive lifestyle property opportunities with a mix of coastal living and rural character. PropertyHack keeps you informed with the latest market news and price trends.',
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

// NZ keywords (~60) — market, investment, regulatory, location, and property type terms
const NZ_EXTRA_KEYWORDS = [
  // Market terms
  { keyword: 'capital value nz property', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'rateable value nz', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'cv vs rv new zealand', market: 'NZ', priority: 1, category: 'market' },
  { keyword: 'asking price new zealand', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'deadline sale nz', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'tender sale new zealand property', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'nz house price median', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'nz property auction results', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'nz property days on market', market: 'NZ', priority: 1, category: 'market' },
  { keyword: 'nz housing inventory listings', market: 'NZ', priority: 1, category: 'market' },
  { keyword: 'reinz house price index', market: 'NZ', priority: 2, category: 'market' },
  { keyword: 'nz property market outlook', market: 'NZ', priority: 2, category: 'market' },
  // Investment terms
  { keyword: 'bright-line test new zealand', market: 'NZ', priority: 3, category: 'investment' },
  { keyword: 'bright-line property rule nz', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'ring-fencing rental losses nz', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'interest deductibility nz property', market: 'NZ', priority: 3, category: 'investment' },
  { keyword: 'healthy homes standards nz', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'nz rental yield', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'nz property investment 2026', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'landlord obligations new zealand', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'residential tenancies act nz', market: 'NZ', priority: 1, category: 'investment' },
  { keyword: 'kiwisaver first home withdrawal', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'nz first home grant', market: 'NZ', priority: 2, category: 'investment' },
  { keyword: 'nz property tax changes', market: 'NZ', priority: 2, category: 'investment' },
  // Regulatory terms
  { keyword: 'overseas investment office nz', market: 'NZ', priority: 3, category: 'regulatory' },
  { keyword: 'OIO overseas buyer rules new zealand', market: 'NZ', priority: 2, category: 'regulatory' },
  { keyword: 'resource consent new zealand', market: 'NZ', priority: 2, category: 'regulatory' },
  { keyword: 'building consent nz', market: 'NZ', priority: 2, category: 'regulatory' },
  { keyword: 'LIM report new zealand', market: 'NZ', priority: 2, category: 'regulatory' },
  { keyword: 'land information memorandum nz', market: 'NZ', priority: 1, category: 'regulatory' },
  { keyword: 'nz national policy statement urban development', market: 'NZ', priority: 1, category: 'regulatory' },
  { keyword: 'resource management act nz property', market: 'NZ', priority: 1, category: 'regulatory' },
  { keyword: 'kiwibuild new zealand', market: 'NZ', priority: 2, category: 'regulatory' },
  { keyword: 'density housing rules nz', market: 'NZ', priority: 2, category: 'regulatory' },
  { keyword: 'managed retreat climate nz property', market: 'NZ', priority: 1, category: 'regulatory' },
  // Location terms
  { keyword: 'north island property market', market: 'NZ', priority: 2, category: 'location' },
  { keyword: 'south island property market', market: 'NZ', priority: 2, category: 'location' },
  { keyword: 'hauraki gulf property', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'wairarapa real estate', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'bay of plenty property market', market: 'NZ', priority: 2, category: 'location' },
  { keyword: 'central otago property', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'hawkes bay real estate', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'marlborough property market', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'nelson tasman real estate', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'waikato property market', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'northland nz property', market: 'NZ', priority: 1, category: 'location' },
  { keyword: 'manawatu whanganui property', market: 'NZ', priority: 1, category: 'location' },
  // Property type terms
  { keyword: 'bach for sale new zealand', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'nz lifestyle block for sale', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'cross-lease property new zealand', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'unit title nz', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'leasehold property nz', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'freehold property new zealand', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'new build nz homes', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'townhouse nz property market', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'nz apartment market', market: 'NZ', priority: 1, category: 'types' },
  { keyword: 'section for sale new zealand', market: 'NZ', priority: 2, category: 'types' },
  { keyword: 'rural property nz', market: 'NZ', priority: 1, category: 'types' },
  { keyword: 'do up property nz', market: 'NZ', priority: 1, category: 'types' },
];

// AU keyword additions — fills gaps in investment, regulatory, location, and property type terms
const AU_EXTRA_KEYWORDS = [
  // Investment language
  { keyword: 'negative gearing australia', market: 'AU', priority: 2, category: 'investment' },
  { keyword: 'capital gains tax property australia', market: 'AU', priority: 2, category: 'investment' },
  { keyword: 'rental yield australia', market: 'AU', priority: 2, category: 'investment' },
  { keyword: 'depreciation schedule investment property', market: 'AU', priority: 1, category: 'investment' },
  { keyword: 'smsf property investment', market: 'AU', priority: 2, category: 'investment' },
  // Regulatory terms
  { keyword: 'stamp duty australia', market: 'AU', priority: 2, category: 'regulatory' },
  { keyword: 'land tax australia', market: 'AU', priority: 1, category: 'regulatory' },
  { keyword: 'first home owner grant', market: 'AU', priority: 2, category: 'regulatory' },
  { keyword: 'foreign investment review board property', market: 'AU', priority: 1, category: 'regulatory' },
  // Location-specific terms
  { keyword: 'off the plan apartment australia', market: 'AU', priority: 1, category: 'market' },
  { keyword: 'auction clearance rate australia', market: 'AU', priority: 2, category: 'market' },
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

  // Seed NZ location configs (upsert for idempotency)
  for (const config of NZ_LOCATION_CONFIGS) {
    const { focusKeywords, ...fields } = config;
    await prisma.locationSeo.upsert({
      where: { slug: config.slug },
      create: { ...fields, country: 'NZ', focusKeywords },
      update: { ...fields, country: 'NZ', focusKeywords },
    });
    console.log(`  Upserted NZ location config: ${config.location}`);
  }

  // Seed national keywords
  for (const keyword of NATIONAL_KEYWORDS) {
    const existing = await prisma.seoKeyword.findFirst({ where: { keyword, location: null } });
    if (existing) continue;
    await prisma.seoKeyword.create({ data: { keyword, priority: 1 } });
    console.log(`  Created national keyword: ${keyword}`);
  }

  // Seed AU extra keywords (investment, regulatory, location, market terms)
  for (const entry of AU_EXTRA_KEYWORDS) {
    const existing = await prisma.seoKeyword.findFirst({ where: { keyword: entry.keyword, market: entry.market ?? null, location: null } });
    if (existing) {
      await prisma.seoKeyword.update({ where: { id: existing.id }, data: { priority: entry.priority, category: entry.category ?? null, isActive: true } });
      console.log(`  Updated AU keyword: ${entry.keyword}`);
    } else {
      await prisma.seoKeyword.create({ data: entry });
      console.log(`  Created AU keyword: ${entry.keyword}`);
    }
  }

  // Seed NZ national keywords
  for (const keyword of NZ_NATIONAL_KEYWORDS) {
    const existing = await prisma.seoKeyword.findFirst({ where: { keyword, location: null } });
    if (existing) continue;
    await prisma.seoKeyword.create({ data: { keyword, priority: 1 } });
    console.log(`  Created NZ national keyword: ${keyword}`);
  }

  // Seed NZ extra keywords (market, investment, regulatory, location, types)
  for (const entry of NZ_EXTRA_KEYWORDS) {
    const existing = await prisma.seoKeyword.findFirst({ where: { keyword: entry.keyword, market: entry.market, location: null } });
    if (existing) {
      await prisma.seoKeyword.update({ where: { id: existing.id }, data: { priority: entry.priority, category: entry.category, isActive: true } });
      console.log(`  Updated NZ keyword: ${entry.keyword}`);
    } else {
      await prisma.seoKeyword.create({ data: entry });
      console.log(`  Created NZ keyword: ${entry.keyword}`);
    }
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
