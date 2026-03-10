require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const tones = [
  {
    name: 'newsletter-tone-au',
    description: 'Newsletter tone of voice for Australian subscribers',
    content: "Write in a direct, no-nonsense Australian voice. Conversational but informed. Use plain language, avoid jargon unless it's industry-standard (negative gearing, clearance rate). Reference Australian specifics naturally — state differences, auction culture, seasonal patterns. Slight humour is fine but don't force it. Think: smart friend who works in property, not a sales agent.",
    isActive: true,
  },
  {
    name: 'newsletter-tone-uk',
    description: 'Newsletter tone of voice for UK subscribers',
    content: "Write in a measured, informed British voice. Dry observations welcome. Reference UK-specific property concepts naturally — leasehold vs freehold, council tax bands, EPC ratings. Acknowledge regional differences (London vs rest of UK, Scotland's separate system). Authoritative without being stuffy. Think: quality broadsheet property section.",
    isActive: true,
  },
  {
    name: 'newsletter-tone-us',
    description: 'Newsletter tone of voice for US subscribers',
    content: "Write in an energetic, opportunity-aware American voice. Data-driven and actionable. Reference US specifics — Fed policy, state variations, 1031 exchanges, housing starts. Acknowledge the diversity of US markets (coastal vs Sun Belt vs Midwest). Optimistic but honest about challenges. Think: smart financial newsletter with a property focus.",
    isActive: true,
  },
  {
    name: 'newsletter-tone-ca',
    description: 'Newsletter tone of voice for Canadian subscribers',
    content: "Write in a balanced, informative Canadian voice. Acknowledge the unique challenges — stress test, interprovincial differences, housing affordability crisis. Reference Canadian specifics — CMHC, provincial rules, GTA vs GVA dynamics. Inclusive and practical. Think: trusted national property news source.",
    isActive: true,
  },
  {
    name: 'newsletter-tone-nz',
    description: 'Newsletter tone of voice for NZ subscribers',
    content: "Write in a relaxed, community-minded New Zealand voice. Practical and grounded. Reference NZ specifics — bright-line test, building consent challenges, Kiwibuild. Acknowledge the small market reality — everyone knows everyone. Honest about challenges, hopeful about solutions. Think: informed local voice with national perspective.",
    isActive: true,
  },
];

async function main() {
  console.log('Seeding newsletter tone prompts...');

  for (const tone of tones) {
    await prisma.systemPrompt.upsert({
      where: { name: tone.name },
      update: tone,
      create: tone,
    });
    console.log(`  [upserted] '${tone.name}'`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
