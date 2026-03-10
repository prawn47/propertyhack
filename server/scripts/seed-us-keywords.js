require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const US_KEYWORDS = [
  // Market terms
  { keyword: 'closing costs', market: 'US', location: null, category: 'market', priority: 8 },
  { keyword: 'MLS listing', market: 'US', location: null, category: 'market', priority: 8 },
  { keyword: 'pending sale real estate', market: 'US', location: null, category: 'market', priority: 7 },
  { keyword: 'contingency offer', market: 'US', location: null, category: 'market', priority: 7 },
  { keyword: 'earnest money deposit', market: 'US', location: null, category: 'market', priority: 7 },
  { keyword: 'days on market', market: 'US', location: null, category: 'market', priority: 6 },
  { keyword: 'listing price vs sale price', market: 'US', location: null, category: 'market', priority: 6 },
  { keyword: 'buyer agent commission', market: 'US', location: null, category: 'market', priority: 7 },
  { keyword: 'seller concessions', market: 'US', location: null, category: 'market', priority: 6 },
  { keyword: 'mortgage pre-approval', market: 'US', location: null, category: 'market', priority: 7 },
  { keyword: 'home inspection contingency', market: 'US', location: null, category: 'market', priority: 6 },
  { keyword: 'appraisal gap', market: 'US', location: null, category: 'market', priority: 6 },
  { keyword: 'multiple offer situation', market: 'US', location: null, category: 'market', priority: 6 },
  { keyword: 'US housing market 2026', market: 'US', location: null, category: 'market', priority: 9 },
  { keyword: 'US home prices', market: 'US', location: null, category: 'market', priority: 8 },

  // Investment terms
  { keyword: 'cap rate', market: 'US', location: null, category: 'investment', priority: 8 },
  { keyword: '1031 exchange', market: 'US', location: null, category: 'investment', priority: 9 },
  { keyword: 'cash-on-cash return', market: 'US', location: null, category: 'investment', priority: 8 },
  { keyword: 'DSCR loan', market: 'US', location: null, category: 'investment', priority: 8 },
  { keyword: 'house hacking', market: 'US', location: null, category: 'investment', priority: 7 },
  { keyword: 'real estate syndication', market: 'US', location: null, category: 'investment', priority: 7 },
  { keyword: 'short-term rental investment', market: 'US', location: null, category: 'investment', priority: 7 },
  { keyword: 'passive income real estate', market: 'US', location: null, category: 'investment', priority: 7 },
  { keyword: 'BRRRR strategy', market: 'US', location: null, category: 'investment', priority: 7 },
  { keyword: 'net operating income', market: 'US', location: null, category: 'investment', priority: 6 },
  { keyword: 'gross rent multiplier', market: 'US', location: null, category: 'investment', priority: 6 },
  { keyword: 'real estate limited partnership', market: 'US', location: null, category: 'investment', priority: 6 },
  { keyword: 'opportunity zone investment', market: 'US', location: null, category: 'investment', priority: 7 },
  { keyword: 'turnkey rental property', market: 'US', location: null, category: 'investment', priority: 6 },

  // Regulatory terms
  { keyword: 'property tax US', market: 'US', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'HOA fees', market: 'US', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'Dodd-Frank Act real estate', market: 'US', location: null, category: 'regulatory', priority: 7 },
  { keyword: 'FHA loan', market: 'US', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'conforming loan limit', market: 'US', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'VA loan', market: 'US', location: null, category: 'regulatory', priority: 8 },
  { keyword: 'mortgage interest deduction', market: 'US', location: null, category: 'regulatory', priority: 7 },
  { keyword: 'homestead exemption', market: 'US', location: null, category: 'regulatory', priority: 6 },
  { keyword: 'fair housing act', market: 'US', location: null, category: 'regulatory', priority: 7 },
  { keyword: 'CFPB mortgage rules', market: 'US', location: null, category: 'regulatory', priority: 6 },
  { keyword: 'Fannie Mae Freddie Mac', market: 'US', location: null, category: 'regulatory', priority: 7 },
  { keyword: 'USDA loan', market: 'US', location: null, category: 'regulatory', priority: 6 },
  { keyword: 'jumbo loan limit', market: 'US', location: null, category: 'regulatory', priority: 7 },
  { keyword: 'rent control laws', market: 'US', location: null, category: 'regulatory', priority: 7 },

  // Location terms
  { keyword: 'tri-state area real estate', market: 'US', location: null, category: 'location', priority: 7 },
  { keyword: 'Sun Belt housing market', market: 'US', location: null, category: 'location', priority: 8 },
  { keyword: 'Rust Belt real estate', market: 'US', location: null, category: 'location', priority: 7 },
  { keyword: 'Bay Area housing market', market: 'US', location: null, category: 'location', priority: 8 },
  { keyword: 'DMV real estate', market: 'US', location: null, category: 'location', priority: 7 },
  { keyword: 'New York real estate', market: 'US', location: 'New York', category: 'location', priority: 8 },
  { keyword: 'Los Angeles housing market', market: 'US', location: 'Los Angeles', category: 'location', priority: 8 },
  { keyword: 'Texas real estate market', market: 'US', location: null, category: 'location', priority: 8 },
  { keyword: 'Florida housing market', market: 'US', location: null, category: 'location', priority: 8 },
  { keyword: 'Pacific Northwest real estate', market: 'US', location: null, category: 'location', priority: 6 },
  { keyword: 'Midwest housing market', market: 'US', location: null, category: 'location', priority: 6 },
  { keyword: 'Southeast US property', market: 'US', location: null, category: 'location', priority: 6 },

  // Property types
  { keyword: 'condo vs co-op', market: 'US', location: null, category: 'types', priority: 7 },
  { keyword: 'townhome for sale', market: 'US', location: null, category: 'types', priority: 7 },
  { keyword: 'single-family home', market: 'US', location: null, category: 'types', priority: 8 },
  { keyword: 'multi-family property investment', market: 'US', location: null, category: 'types', priority: 8 },
  { keyword: 'manufactured home financing', market: 'US', location: null, category: 'types', priority: 6 },
  { keyword: 'duplex for sale', market: 'US', location: null, category: 'types', priority: 7 },
  { keyword: 'ADU accessory dwelling unit', market: 'US', location: null, category: 'types', priority: 7 },
  { keyword: 'new construction homes', market: 'US', location: null, category: 'types', priority: 7 },
  { keyword: 'foreclosure homes for sale', market: 'US', location: null, category: 'types', priority: 7 },
  { keyword: 'luxury home market US', market: 'US', location: null, category: 'types', priority: 7 },
  { keyword: 'mobile home park investment', market: 'US', location: null, category: 'types', priority: 6 },
  { keyword: 'mixed-use property', market: 'US', location: null, category: 'types', priority: 6 },
];

async function main() {
  console.log('Seeding US SEO keywords...');
  let count = 0;

  for (const kw of US_KEYWORDS) {
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

  console.log(`\nUS keyword seed complete! Total: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
