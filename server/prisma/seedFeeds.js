const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Category slug mapping per market
// AU uses base slugs, other markets use {slug}-{market}
function catSlug(base, market) {
  return market === 'AU' ? base : `${base}-${market.toLowerCase()}`;
}

// Map design doc categories to existing ArticleCategory slugs
const CAT_MAP = {
  'Portal': 'property-market',
  'Investment': 'investment',
  'Commercial': 'commercial',
  'Data/Government': 'policy',
  'Finance/Mortgage': 'finance',
  'Industry Body': 'property-market',
  'Media': 'property-market',
  'Expert Blog': 'investment',
  'Community': 'property-market',
  'Podcast': 'investment',
};

const feeds = [
  // ── AUSTRALIA ──
  { name: 'realestate.com.au News', url: 'https://www.realestate.com.au/news/feed/', market: 'AU', cat: 'Portal' },
  { name: 'RBA Media Releases', url: 'https://www.rba.gov.au/rss/rss-cb-media-releases.xml', market: 'AU', cat: 'Data/Government' },
  { name: 'RBA Speeches', url: 'https://www.rba.gov.au/rss/rss-cb-speeches.xml', market: 'AU', cat: 'Data/Government' },
  { name: 'RBA Bulletin', url: 'https://www.rba.gov.au/rss/rss-cb-bulletin.xml', market: 'AU', cat: 'Data/Government' },
  { name: 'RBA Financial Stability Review', url: 'https://www.rba.gov.au/rss/rss-cb-fsr.xml', market: 'AU', cat: 'Data/Government' },
  { name: 'RBA Statement on Monetary Policy', url: 'https://www.rba.gov.au/rss/rss-cb-smp.xml', market: 'AU', cat: 'Data/Government' },
  { name: 'PropertyUpdate (Michael Yardney)', url: 'https://propertyupdate.com.au/feed', market: 'AU', cat: 'Investment' },
  { name: 'PropertyUpdate — Investment', url: 'https://propertyupdate.com.au/category/property-investment/feed', market: 'AU', cat: 'Investment' },
  { name: 'Australian Property Update', url: 'https://australianpropertyupdate.com.au/rss', market: 'AU', cat: 'Investment' },
  { name: 'Smart Property Investment', url: 'https://www.smartpropertyinvestment.com.au/feed', market: 'AU', cat: 'Investment' },
  { name: 'API Magazine', url: 'https://apimagazine.com.au/rss', market: 'AU', cat: 'Investment' },
  { name: 'Your Investment Property', url: 'https://yourinvestmentpropertymag.com.au/feed', market: 'AU', cat: 'Investment' },
  { name: 'Pete Wargent Blog', url: 'https://petewargent.blogspot.com/feeds/posts/default', market: 'AU', cat: 'Expert Blog' },
  { name: 'Matusik Property Insights', url: 'https://matusik.com.au/feed', market: 'AU', cat: 'Expert Blog' },
  { name: 'Positive Real Estate', url: 'https://positiverealestate.com.au/feed', market: 'AU', cat: 'Expert Blog' },
  { name: 'Property Markets News', url: 'https://propertymarkets.news/feed', market: 'AU', cat: 'Media' },
  { name: 'REIACT', url: 'https://reiact.com.au/feed', market: 'AU', cat: 'Industry Body' },
  { name: 'Real Estate Investar Blog', url: 'https://blog.realestateinvestar.com.au/feed', market: 'AU', cat: 'Investment' },
  { name: 'SMH Property', url: 'https://www.smh.com.au/rss/property.xml', market: 'AU', cat: 'Media' },
  { name: 'The Age Property', url: 'https://www.theage.com.au/rss/property.xml', market: 'AU', cat: 'Media' },
  { name: 'Brisbane Times', url: 'https://www.brisbanetimes.com.au/rss/feed.xml', market: 'AU', cat: 'Media' },
  { name: 'WA Today', url: 'https://www.watoday.com.au/rss/feed.xml', market: 'AU', cat: 'Media' },
  { name: 'Finder.com.au', url: 'https://www.finder.com.au/rss-feeds', market: 'AU', cat: 'Finance/Mortgage' },
  { name: 'r/AusProperty', url: 'https://www.reddit.com/r/AusProperty/.rss', market: 'AU', cat: 'Community' },
  { name: 'r/AusFinance', url: 'https://www.reddit.com/r/AusFinance/.rss', market: 'AU', cat: 'Community' },
  { name: 'r/AusPropertyChat', url: 'https://www.reddit.com/r/AusPropertyChat/.rss', market: 'AU', cat: 'Community' },
  { name: 'Hotspotting Podcast', url: 'https://hotspotting.libsyn.com/rss', market: 'AU', cat: 'Podcast' },

  // ── UNITED STATES ──
  { name: 'Redfin News', url: 'https://www.redfin.com/blog/feed/', market: 'US', cat: 'Portal' },
  { name: 'HousingWire', url: 'https://www.housingwire.com/feed', market: 'US', cat: 'Media' },
  { name: 'BiggerPockets Blog', url: 'https://www.biggerpockets.com/blog/feed', market: 'US', cat: 'Investment' },
  { name: 'Norada Real Estate', url: 'https://www.noradarealestate.com/blog/feed', market: 'US', cat: 'Investment' },
  { name: 'Calculated Risk', url: 'https://www.calculatedriskblog.com/feeds/posts/default', market: 'US', cat: 'Expert Blog' },
  { name: 'Inman News', url: 'https://www.inman.com/feed/', market: 'US', cat: 'Media' },
  { name: 'RISMedia', url: 'https://rismedia.com/feed/', market: 'US', cat: 'Media' },
  { name: 'Multi-Housing News', url: 'https://multihousingnews.com/feed/', market: 'US', cat: 'Commercial' },
  { name: 'National Mortgage News', url: 'https://www.nationalmortgagenews.com/feed', market: 'US', cat: 'Finance/Mortgage' },
  { name: 'Forbes Real Estate', url: 'https://www.forbes.com/real-estate/feed/', market: 'US', cat: 'Media' },
  { name: 'NAREIT', url: 'https://www.reit.com/rss.xml', market: 'US', cat: 'Investment' },
  { name: 'Mortgage News Daily', url: 'https://www.mortgagenewsdaily.com/rss/news', market: 'US', cat: 'Finance/Mortgage' },
  { name: 'The Close', url: 'https://theclose.com/feed/', market: 'US', cat: 'Media' },
  { name: 'RE Journals', url: 'https://rejournals.com/feed/', market: 'US', cat: 'Commercial' },
  { name: 'r/RealEstate', url: 'https://www.reddit.com/r/RealEstate/.rss', market: 'US', cat: 'Community' },
  { name: 'r/FirstTimeHomeBuyer', url: 'https://www.reddit.com/r/FirstTimeHomeBuyer/.rss', market: 'US', cat: 'Community' },
  { name: 'r/realestateinvesting', url: 'https://www.reddit.com/r/realestateinvesting/.rss', market: 'US', cat: 'Community' },

  // ── UNITED KINGDOM ──
  { name: 'Rightmove News', url: 'https://www.rightmove.co.uk/news/feed', market: 'UK', cat: 'Portal' },
  { name: 'PropertyWire', url: 'https://www.propertywire.com/feed', market: 'UK', cat: 'Media' },
  { name: 'Property Week', url: 'https://www.propertyweek.com/rss-feeds', market: 'UK', cat: 'Commercial' },
  { name: 'Property Investments UK', url: 'https://propertyinvestmentsuk.co.uk/feed', market: 'UK', cat: 'Investment' },
  { name: 'SevenCapital', url: 'https://www.sevencapital.com/feed', market: 'UK', cat: 'Investment' },
  { name: 'The Guardian — Property', url: 'https://www.theguardian.com/money/property/rss', market: 'UK', cat: 'Media' },
  { name: 'The Times — Property', url: 'https://www.thetimes.co.uk/property/rss', market: 'UK', cat: 'Media' },
  { name: 'This is Money — Property', url: 'https://www.thisismoney.co.uk/rss/property.xml', market: 'UK', cat: 'Finance/Mortgage' },
  { name: 'r/HousingUK', url: 'https://www.reddit.com/r/HousingUK/.rss', market: 'UK', cat: 'Community' },
  { name: 'r/UKPersonalFinance', url: 'https://www.reddit.com/r/UKPersonalFinance/.rss', market: 'UK', cat: 'Community' },

  // ── CANADA ──
  { name: 'STOREYS', url: 'https://storeys.com/feeds/feed.rss', market: 'CA', cat: 'Media' },
  { name: 'Better Dwelling', url: 'https://betterdwelling.com/feed', market: 'CA', cat: 'Media' },
  { name: 'Connect CRE Canada', url: 'https://www.connectcre.ca/feed/', market: 'CA', cat: 'Commercial' },
  { name: 'Construction Canada', url: 'https://constructioncanada.net/feed', market: 'CA', cat: 'Commercial' },
  { name: 'Canadian Real Estate Magazine', url: 'https://www.canadianrealestatemagazine.ca/feed', market: 'CA', cat: 'Investment' },
  { name: 'REM (Real Estate Magazine)', url: 'https://realestatemagazine.ca/feed/', market: 'CA', cat: 'Media' },
  { name: 'r/canadahousing', url: 'https://www.reddit.com/r/canadahousing/.rss', market: 'CA', cat: 'Community' },
  { name: 'r/PersonalFinanceCanada', url: 'https://www.reddit.com/r/PersonalFinanceCanada/.rss', market: 'CA', cat: 'Community' },
  { name: 'r/TorontoRealEstate', url: 'https://www.reddit.com/r/TorontoRealEstate/.rss', market: 'CA', cat: 'Community' },
  { name: 'r/VancouverRealEstate', url: 'https://www.reddit.com/r/VancouverRealEstate/.rss', market: 'CA', cat: 'Community' },

  // ── NEW ZEALAND ──
  { name: 'interest.co.nz — Property', url: 'https://www.interest.co.nz/rss/property.xml', market: 'NZ', cat: 'Media' },
  { name: 'Stuff.co.nz — Property', url: 'https://www.stuff.co.nz/rss/property', market: 'NZ', cat: 'Media' },
  { name: 'NZ Herald — Property', url: 'https://www.nzherald.co.nz/property/rss/', market: 'NZ', cat: 'Media' },
  { name: 'Savills NZ', url: 'https://www.savills.co.nz/footer/rss-feeds.aspx', market: 'NZ', cat: 'Commercial' },
  { name: 'r/newzealand', url: 'https://www.reddit.com/r/newzealand/.rss', market: 'NZ', cat: 'Community' },
  { name: 'r/PersonalFinanceNZ', url: 'https://www.reddit.com/r/PersonalFinanceNZ/.rss', market: 'NZ', cat: 'Community' },

  // ── GLOBAL ──
  { name: 'PropertyWire (Global)', url: 'https://www.propertywire.com/feed', market: 'GLOBAL', cat: 'Media' },
  { name: 'Global Property Guide', url: 'https://www.globalpropertyguide.com/rss', market: 'GLOBAL', cat: 'Investment' },
  { name: 'MSCI Real Assets', url: 'https://www.msci.com/rss', market: 'GLOBAL', cat: 'Commercial' },
  { name: 'JLL Global Research', url: 'https://www.jll.com/en/rss/latest-research', market: 'GLOBAL', cat: 'Commercial' },
  { name: 'CBRE Global Insights', url: 'https://www.cbre.com/insights/rss', market: 'GLOBAL', cat: 'Commercial' },
];

// Generate a stable ID from feed name (kebab-case, prefixed)
function feedId(name) {
  return 'rss-' + name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

async function main() {
  console.log(`Seeding ${feeds.length} Tier 1 RSS feeds...\n`);

  let created = 0;
  let updated = 0;

  for (const f of feeds) {
    const id = feedId(f.name);
    const baseCat = CAT_MAP[f.cat] || 'property-market';
    // GLOBAL feeds don't have market-specific category slugs — use AU base slugs
    const category = f.market === 'GLOBAL' ? baseCat : catSlug(baseCat, f.market);

    const data = {
      name: f.name,
      type: 'RSS',
      config: { feedUrl: f.url, maxItems: 50 },
      market: f.market,
      category,
      schedule: '0 */30 * * * *', // every 30 minutes
      isActive: true,
    };

    const existing = await prisma.ingestionSource.findUnique({ where: { id } });
    if (existing) {
      await prisma.ingestionSource.update({ where: { id }, data });
      updated++;
    } else {
      await prisma.ingestionSource.create({ data: { id, ...data } });
      created++;
    }

    console.log(`  ${existing ? '↻' : '✓'} [${f.market}] ${f.name}`);
  }

  console.log(`\nDone: ${created} created, ${updated} updated (${feeds.length} total)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
