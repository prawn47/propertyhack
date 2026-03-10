require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const prompt = {
  name: 'feed-quality-criteria',
  description: 'Editorial criteria for content source selection and quality evaluation',
  content: `# PropertyHack Content Quality Criteria

## Content Categories (balanced mix desired)

### 1. Stories & Narratives
Human interest property stories, buyer/seller journeys, renovation stories, neighbourhood profiles, "day in the life" of property professionals. These build emotional connection and shareability.

### 2. Price & Market Data
Median prices, auction results, clearance rates, rental yields, vacancy rates, days on market, market reports from agencies and data providers. Factual, data-driven content.

### 3. Macro & Rates
Interest rate decisions, central bank commentary, inflation data, employment figures, GDP, government budgets — specifically how these affect property markets. Not general economics unless property impact is clear.

### 4. Opinion & Commentary
Industry expert columns, market predictions, investment strategy, policy debate, buyer/seller advice. Credible sources with clear property focus.

### 5. Development & Construction
New developments, planning approvals, construction trends, building costs, material shortages, infrastructure projects affecting property values. Both residential and commercial.

### 6. PropTech & Innovation
Property technology, AI in real estate, new platforms, digital disruption, smart homes, sustainability in construction. Forward-looking content.

## Jurisdiction-Specific Focus

### Australia
Auction culture, negative gearing debate, APRA regulations, state-by-state stamp duty, SMSF property, infrastructure projects (Western Sydney Airport, Cross River Rail, Suburban Rail Loop).

### New Zealand
Bright-line test changes, overseas buyer rules, building consent delays, Kiwibuild, density enablement, managed retreat from climate-vulnerable areas.

### United Kingdom
Leasehold reform, stamp duty bands, EPC requirements, Section 21 abolition, building safety post-Grenfell, planning reform, HS2 and Crossrail effects.

### United States
Fed policy and mortgage rates, state-level property tax variations, 1031 exchanges, institutional landlords, zoning reform, climate risk and insurance.

### Canada
Stress test rules, foreign buyer ban, provincial nominee programs, housing supply action plan, carbon tax on buildings, interprovincial migration.

## Rejection Criteria
Reject content that is: purely celebrity gossip, sports, entertainment, partisan politics without property angle, product reviews unrelated to property, travel/tourism without property investment angle, health/fitness, food/dining.`,
  isActive: true,
};

async function main() {
  console.log('Seeding feed quality criteria system prompt...');

  await prisma.systemPrompt.upsert({
    where: { name: prompt.name },
    update: {
      description: prompt.description,
      content: prompt.content,
      isActive: prompt.isActive,
    },
    create: prompt,
  });

  console.log(`  [upserted] '${prompt.name}'`);
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
