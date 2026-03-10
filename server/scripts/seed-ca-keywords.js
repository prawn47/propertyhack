require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CA_KEYWORDS = [
  // Market terms
  { keyword: 'firm offer Canada', market: 'CA', location: null, category: 'market', priority: 8 },
  { keyword: 'conditional offer real estate Canada', market: 'CA', location: null, category: 'market', priority: 8 },
  { keyword: 'bidding war Canada', market: 'CA', location: null, category: 'market', priority: 9 },
  { keyword: 'assignment sale Canada', market: 'CA', location: null, category: 'market', priority: 8 },
  { keyword: 'pre-construction condo Canada', market: 'CA', location: null, category: 'market', priority: 8 },
  { keyword: 'bully offer Canada', market: 'CA', location: null, category: 'market', priority: 7 },
  { keyword: 'holdback real estate Canada', market: 'CA', location: null, category: 'market', priority: 6 },
  { keyword: 'offer presentation night', market: 'CA', location: null, category: 'market', priority: 6 },
  { keyword: 'sold over asking Canada', market: 'CA', location: null, category: 'market', priority: 7 },
  { keyword: 'Canadian housing market 2026', market: 'CA', location: null, category: 'market', priority: 9 },
  { keyword: 'Canada home prices', market: 'CA', location: null, category: 'market', priority: 9 },
  { keyword: 'Canadian real estate market', market: 'CA', location: null, category: 'market', priority: 9 },
  { keyword: 'MLS Canada', market: 'CA', location: null, category: 'market', priority: 8 },
  { keyword: 'realtor.ca listings', market: 'CA', location: null, category: 'market', priority: 7 },

  // Investment terms
  { keyword: 'Smith Maneuver Canada', market: 'CA', location: null, category: 'investment', priority: 8 },
  { keyword: 'HELOC Canada', market: 'CA', location: null, category: 'investment', priority: 9 },
  { keyword: 'rental income rules Canada', market: 'CA', location: null, category: 'investment', priority: 8 },
  { keyword: 'principal residence exemption Canada', market: 'CA', location: null, category: 'investment', priority: 9 },
  { keyword: 'rental property Canada investment', market: 'CA', location: null, category: 'investment', priority: 8 },
  { keyword: 'Canadian REIT', market: 'CA', location: null, category: 'investment', priority: 7 },
  { keyword: 'capital gains tax Canada real estate', market: 'CA', location: null, category: 'investment', priority: 9 },
  { keyword: 'flipping houses Canada', market: 'CA', location: null, category: 'investment', priority: 7 },
  { keyword: 'RRSP home buyers plan', market: 'CA', location: null, category: 'investment', priority: 8 },
  { keyword: 'FHSA first home savings account', market: 'CA', location: null, category: 'investment', priority: 9 },
  { keyword: 'short-term rental Canada regulations', market: 'CA', location: null, category: 'investment', priority: 7 },

  // Regulatory terms
  { keyword: 'mortgage stress test Canada', market: 'CA', location: null, category: 'regulatory', priority: 9 },
  { keyword: 'land transfer tax Ontario', market: 'CA', location: 'Toronto', category: 'regulatory', priority: 9 },
  { keyword: 'land transfer tax Canada', market: 'CA', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'foreign buyer ban Canada', market: 'CA', location: null, category: 'regulatory', priority: 9 },
  { keyword: 'CMHC mortgage insurance', market: 'CA', location: null, category: 'regulatory', priority: 9 },
  { keyword: 'provincial nominee program Canada', market: 'CA', location: null, category: 'regulatory', priority: 7 },
  { keyword: 'anti-flipping tax Canada', market: 'CA', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'underused housing tax Canada', market: 'CA', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'OSFI mortgage rules', market: 'CA', location: null, category: 'regulatory', priority: 7 },
  { keyword: 'first-time home buyer incentive Canada', market: 'CA', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'Bank of Canada rate decision', market: 'CA', location: null, category: 'regulatory', priority: 9 },
  { keyword: 'FINTRAC real estate Canada', market: 'CA', location: null, category: 'regulatory', priority: 6 },
  { keyword: 'AML real estate Canada', market: 'CA', location: null, category: 'regulatory', priority: 6 },

  // Location terms — national / regional
  { keyword: 'GTA real estate', market: 'CA', location: null, category: 'location', priority: 9 },
  { keyword: 'Greater Toronto Area housing market', market: 'CA', location: null, category: 'location', priority: 9 },
  { keyword: 'GVA real estate', market: 'CA', location: null, category: 'location', priority: 9 },
  { keyword: 'Greater Vancouver Area housing', market: 'CA', location: null, category: 'location', priority: 9 },
  { keyword: 'Golden Horseshoe real estate', market: 'CA', location: null, category: 'location', priority: 8 },
  { keyword: 'Prairies housing market', market: 'CA', location: null, category: 'location', priority: 7 },
  { keyword: 'Atlantic Canada real estate', market: 'CA', location: null, category: 'location', priority: 7 },
  { keyword: 'Toronto housing market', market: 'CA', location: 'Toronto', category: 'location', priority: 9 },
  { keyword: 'Vancouver housing market', market: 'CA', location: 'Vancouver', category: 'location', priority: 9 },
  { keyword: 'Calgary real estate market', market: 'CA', location: 'Calgary', category: 'location', priority: 8 },
  { keyword: 'Edmonton housing market', market: 'CA', location: null, category: 'location', priority: 8 },
  { keyword: 'Ottawa real estate', market: 'CA', location: null, category: 'location', priority: 8 },
  { keyword: 'Montreal housing market', market: 'CA', location: null, category: 'location', priority: 8 },
  { keyword: 'suburban Toronto real estate', market: 'CA', location: 'Toronto', category: 'location', priority: 7 },
  { keyword: 'Fraser Valley housing market', market: 'CA', location: 'Vancouver', category: 'location', priority: 7 },

  // Property types
  { keyword: 'detached home Canada', market: 'CA', location: null, category: 'types', priority: 8 },
  { keyword: 'semi-detached house Canada', market: 'CA', location: null, category: 'types', priority: 8 },
  { keyword: 'row house Canada', market: 'CA', location: null, category: 'types', priority: 7 },
  { keyword: 'stacked townhouse Canada', market: 'CA', location: null, category: 'types', priority: 7 },
  { keyword: 'laneway house', market: 'CA', location: null, category: 'types', priority: 8 },
  { keyword: 'condo apartment Canada', market: 'CA', location: null, category: 'types', priority: 8 },
  { keyword: 'preconstruction townhouse Canada', market: 'CA', location: null, category: 'types', priority: 7 },
  { keyword: 'garden suite Canada', market: 'CA', location: null, category: 'types', priority: 7 },
  { keyword: 'multiplex Canada', market: 'CA', location: null, category: 'types', priority: 7 },
  { keyword: 'purpose-built rental Canada', market: 'CA', location: null, category: 'types', priority: 7 },
  { keyword: 'new build Canada', market: 'CA', location: null, category: 'types', priority: 7 },
  { keyword: 'luxury condo Toronto', market: 'CA', location: 'Toronto', category: 'types', priority: 7 },
];

async function main() {
  console.log('Seeding CA SEO keywords...');
  let count = 0;

  for (const kw of CA_KEYWORDS) {
    const existing = await prisma.seoKeyword.findFirst({
      where: { keyword: kw.keyword, market: kw.market, location: kw.location ?? null },
    });

    if (existing) {
      await prisma.seoKeyword.update({
        where: { id: existing.id },
        data: { priority: kw.priority, category: kw.category, isActive: true },
      });
    } else {
      await prisma.seoKeyword.create({ data: kw });
    }

    count++;
    console.log(`  [${count}] ${kw.keyword}`);
  }

  console.log(`\nCA keyword seed complete! Total: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
