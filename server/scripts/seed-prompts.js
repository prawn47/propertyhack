require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const prompts = [
  {
    name: 'image-generation',
    description: 'Prompt template for AI-generated article thumbnail images. Available variables: {category_elements}, {title}, {shortBlurb}, {camera}, {film}, {look}',
    content: 'Photograph for a property news article. Subject: {category_elements}. Shot on {camera}. {film} film stock. {look}. Wide 16:9 landscape composition, off-centre subject, environmental context. No text, no numbers, no watermarks, no labels. No close-up faces. This should look like a real photograph from a 1990s property magazine, not computer-generated. Article context: {title}. {shortBlurb}',
    isActive: true,
  },
  {
    name: 'article-summarisation',
    description: 'Prompt template for AI article summarisation. Available variables: {title}, {sourceName}, {content}',
    content: `You are a property news editor for PropertyHack, a global property news platform covering Australia, US, UK, and Canada. Your tone is factual and neutral.

Analyse the following article and return a JSON object with these fields:

- isPropertyRelated: boolean — true ONLY if the article is directly about property, real estate, housing, construction, mortgages, interest rates affecting housing, property investment, urban planning, property development, home buying/selling, rental markets, or housing policy. Return false for general news, sports, politics (unless directly about housing policy), entertainment, celebrities, etc.
- shortBlurb: ~50 words, a concise hook suitable for a news card. Do not exceed 60 words. Leave empty string if not property related.
- longSummary: ~80 words, max 100 words. A concise summary with key facts, statistics, and figures from the article. Attribute the source ({sourceName}). Write in a definitive, expert tone. Leave empty string if not property related.
- suggestedCategory: one of exactly these slugs: property-market, residential, commercial, investment, development, policy, finance, uncategorized
- extractedLocation: the primary city/state/region mentioned (e.g. "Sydney, NSW", "London", "New York", "Toronto"), or null if not identifiable
- markets: an array of market codes this article is relevant to. Use ONLY these codes: "AU", "US", "UK", "CA", "ALL". Use "ALL" for content relevant globally (e.g. universal home-buying tips, decorating/landscaping advice, general investment strategy, global housing trends). An article can belong to multiple specific markets (e.g. ["AU", "UK"]) if it compares or discusses both. Most articles will have exactly one market code.
- isEvergreen: boolean — true if the content is timeless advice, tips, guides, or educational content that remains useful regardless of when it was published (e.g. "10 tips to sell your home faster", "how to choose an investment property", "landscaping ideas to boost value"). false for time-sensitive news, market reports, auction results, policy announcements, or anything tied to a specific date/event.
- isGlobal: boolean — true if the content discusses macro trends, cross-market analysis, global housing data, worldwide interest rate commentary, or comparative international property analysis that is relevant to readers in ALL markets (e.g. "global housing bubble fears grow", "how rising rates are cooling markets worldwide", "international property investment trends"). false for country-specific news or timeless tips (those are isEvergreen). An article can be both isGlobal and isEvergreen if it is both timeless AND globally relevant, but most articles will be one or neither.

Respond with valid JSON only. Do not wrap in markdown code fences.

ARTICLE:
{content}`,
    isActive: true,
  },
  {
    name: 'social-generation',
    description: 'Prompt template for AI social media post generation. Available variables: {title}, {shortBlurb}, {longSummary}, {sourceUrl}, {category}, {platforms}',
    content: `Generate social media posts for the following Australian property news article. Return a JSON object with keys for each requested platform.

Article title: {title}
Summary: {shortBlurb}
Full context: {longSummary}
Article URL: {sourceUrl}
Category: {category}

Generate posts for: {platforms}

Platform requirements:
- twitter: Max 280 characters total (including URL and hashtags). Punchy, newsworthy. 2-3 relevant property/real estate hashtags. Must include article URL.
- facebook: 1-2 short paragraphs. Conversational, shareable tone. Question or hook to drive engagement. Article URL at end.
- linkedin: Professional, industry-insight tone. 1-2 paragraphs targeting property professionals and investors. Article URL at end.
- instagram: Engaging caption with relevant emojis. 5-8 property/real estate hashtags at end. Say "Link in bio" instead of including URL.

Only generate posts for the platforms listed in {platforms}. Return ONLY valid JSON.`,
    isActive: true,
  },
];

async function main() {
  console.log('Seeding system prompts...');

  for (const promptData of prompts) {
    const existing = await prisma.systemPrompt.findUnique({
      where: { name: promptData.name },
    });

    if (existing) {
      console.log(`  [skip] '${promptData.name}' already exists`);
    } else {
      await prisma.systemPrompt.create({ data: promptData });
      console.log(`  [created] '${promptData.name}'`);
    }
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
