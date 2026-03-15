/**
 * Re-audit all articles: fix market misassignments across all markets.
 *
 * Strategy:
 * 1. Trust the source's market as primary signal
 * 2. Use content analysis (domains, cities, institutions) for validation
 * 3. Update both `market` (primary) and `markets` (array) fields
 * 4. Ensure markets array always includes the primary market
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Content signals by market
const MARKET_SIGNALS = {
  NZ: {
    strong: [
      /\bnew zealand\b/i, /\baotearoa\b/i,
      /interest\.co\.nz/i, /stuff\.co\.nz/i, /nzherald\.co\.nz/i,
      /newshub\.co\.nz/i, /rnz\.co\.nz/i, /oneroof\.co\.nz/i,
      /\brbnz\b/i, /\breserve bank of new zealand\b/i,
      /\breinz\b/i, /\btrade me property\b/i,
      /\bkainga ora\b/i, /\bk\u0101inga ora\b/i,
      /\bhousing new zealand\b/i,
    ],
    cities: [
      /\bauckland\b/i, /\bwellington\b/i, /\bchristchurch\b/i,
      /\btauranga\b/i, /\bdunedin\b/i, /\bqueenstown\b/i,
      /\brotorua\b/i, /\bnapier\b/i, /\bpalmerston north\b/i,
      /\bwhangarei\b/i, /\binvercargill\b/i,
      /\bwaikato\b/i, /\bbay of plenty\b/i, /\bhawke.s bay\b/i,
      /\bcanterbury\b/i, /\botago\b/i, /\bmanawat/i,
    ],
  },
  AU: {
    strong: [
      /\baustralia\b/i,
      /realestate\.com\.au/i, /domain\.com\.au/i, /\.com\.au/i,
      /\brba\b/i, /\breserve bank of australia\b/i,
      /\bapra\b/i, /\basic\b/i,
    ],
    cities: [
      /\bsydney\b/i, /\bmelbourne\b/i, /\bbrisbane\b/i,
      /\bperth\b/i, /\badelaide\b/i, /\bcanberra\b/i,
      /\bhobart\b/i, /\bdarwin\b/i, /\bgold coast\b/i,
      /\bnsw\b/i, /\bvictoria\b/i, /\bqueensland\b/i,
    ],
  },
  UK: {
    strong: [
      /\bunited kingdom\b/i, /\bbritain\b/i,
      /rightmove\.co\.uk/i, /zoopla\.co\.uk/i, /\.co\.uk/i,
      /\bbank of england\b/i, /\bhm treasury\b/i,
      /\brics\b/i, /\bhm land registry\b/i,
    ],
    cities: [
      /\blondon\b/i, /\bmanchester\b/i, /\bbirmingham\b/i,
      /\bleeds\b/i, /\bbristol\b/i, /\bedinburgh\b/i,
      /\bglasgow\b/i, /\bliverpool\b/i, /\bcardiff\b/i,
    ],
  },
  US: {
    strong: [
      /\bunited states\b/i, /\bamerica\b/i,
      /realtor\.com/i, /zillow\.com/i, /redfin\.com/i,
      /\bfederal reserve\b/i, /\bthe fed\b/i,
      /\bnar\b/i, /\bnational association of realtors\b/i,
      /\bhud\b/i, /\bfannie mae\b/i, /\bfreddie mac\b/i,
    ],
    cities: [
      /\bnew york\b/i, /\blos angeles\b/i, /\bchicago\b/i,
      /\bhouston\b/i, /\bphoenix\b/i, /\bsan francisco\b/i,
      /\bseattle\b/i, /\bdenver\b/i, /\baustin\b/i,
      /\bmiami\b/i, /\bdallas\b/i, /\bboston\b/i,
    ],
  },
  CA: {
    strong: [
      /\bcanada\b/i, /\bcanadian\b/i,
      /\.ca\//i,
      /\bbank of canada\b/i, /\bcmhc\b/i,
      /\bcrea\b/i, /\bcanadian real estate\b/i,
    ],
    cities: [
      /\btoronto\b/i, /\bvancouver\b/i, /\bmontreal\b/i,
      /\bcalgary\b/i, /\bedmonton\b/i, /\bottawa\b/i,
      /\bwinnipeg\b/i, /\bhalifax\b/i,
      /\bontario\b/i, /\bbritish columbia\b/i, /\balberta\b/i,
    ],
  },
};

function detectMarket(text) {
  const scores = {};

  for (const [market, signals] of Object.entries(MARKET_SIGNALS)) {
    let score = 0;
    for (const pattern of signals.strong) {
      if (pattern.test(text)) score += 3;
    }
    for (const pattern of signals.cities) {
      if (pattern.test(text)) score += 1;
    }
    if (score > 0) scores[market] = score;
  }

  return scores;
}

async function main() {
  const articles = await prisma.article.findMany({
    select: {
      id: true, title: true, shortBlurb: true, longSummary: true,
      location: true, sourceUrl: true, market: true, markets: true,
      source: { select: { name: true, market: true } }
    }
  });

  console.log(`Total articles: ${articles.length}`);
  console.log();

  // Phase 1: Assess mismatches
  let sourceMarketMismatch = 0;
  let arrayInconsistent = 0;
  const mismatchBreakdown = {};

  for (const a of articles) {
    const srcMkt = a.source?.market;
    if (srcMkt && srcMkt !== 'ALL' && a.market !== srcMkt && a.market !== 'ALL') {
      if (!a.markets.includes(srcMkt)) {
        sourceMarketMismatch++;
        const key = `${srcMkt} source → ${a.market} article`;
        mismatchBreakdown[key] = (mismatchBreakdown[key] || 0) + 1;
      }
    }
    if (a.market && !a.markets.includes(a.market)) {
      arrayInconsistent++;
    }
  }

  console.log('=== PRE-AUDIT ASSESSMENT ===');
  console.log(`Source/article market mismatch: ${sourceMarketMismatch}`);
  Object.entries(mismatchBreakdown).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log(`Articles where market not in markets array: ${arrayInconsistent}`);
  console.log();

  // Phase 2: Recategorise
  let updated = 0;
  let arrayFixed = 0;
  const changes = { reassigned: {}, arrayOnly: 0 };

  for (const article of articles) {
    // Normalise GLOBAL → ALL
    const srcMkt = article.source?.market === 'GLOBAL' ? 'ALL' : article.source?.market;
    const text = [
      article.title, article.shortBlurb, article.longSummary,
      article.location, article.sourceUrl, article.source?.name
    ].filter(Boolean).join(' ');

    const contentScores = detectMarket(text);

    let newMarket = article.market;
    let newMarkets = [...article.markets];
    let changed = false;

    // Rule 1: If source has a specific market and content confirms it (or doesn't contradict it),
    // the article should include that market
    if (srcMkt && srcMkt !== 'ALL') {
      const srcScore = contentScores[srcMkt] || 0;
      const currentScore = contentScores[article.market] || 0;

      // If article market differs from source, and content doesn't strongly support current market
      if (article.market !== srcMkt && article.market !== 'ALL') {
        if (srcScore >= currentScore || currentScore < 3) {
          // Source market wins — content supports it or doesn't strongly support the current one
          newMarket = srcMkt;
          changed = true;
        }
      }

      // Always ensure source market is in the markets array (unless content clearly contradicts)
      if (!newMarkets.includes(srcMkt) && (srcScore > 0 || currentScore < 3)) {
        newMarkets.push(srcMkt);
        changed = true;
      }
    }

    // Rule 2: If content analysis detects additional markets with strong signals, add them
    for (const [market, score] of Object.entries(contentScores)) {
      if (score >= 3 && !newMarkets.includes(market)) {
        newMarkets.push(market);
        changed = true;
      }
    }

    // Rule 3: Ensure primary market is in markets array
    if (!newMarkets.includes(newMarket)) {
      newMarkets.push(newMarket);
      changed = true;
    }

    // Rule 4: Remove duplicates
    newMarkets = [...new Set(newMarkets)];

    if (changed) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          market: newMarket,
          markets: { set: newMarkets },
        }
      });

      if (newMarket !== article.market) {
        const key = `${article.market} → ${newMarket}`;
        changes.reassigned[key] = (changes.reassigned[key] || 0) + 1;
        updated++;
        if (updated <= 20) {
          console.log(`  [${article.market}→${newMarket}] markets:${JSON.stringify(newMarkets)} "${article.title}"`);
        }
      } else {
        changes.arrayOnly++;
        arrayFixed++;
      }
    }
  }

  if (updated > 20) {
    console.log(`  ... and ${updated - 20} more`);
  }

  console.log();
  console.log('=== RESULTS ===');
  console.log(`Primary market reassigned: ${updated}`);
  Object.entries(changes.reassigned).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log(`Markets array updated (primary unchanged): ${arrayFixed}`);

  // Final counts
  const counts = await prisma.article.groupBy({
    by: ['market'],
    _count: true,
    orderBy: { _count: { market: 'desc' } }
  });
  console.log();
  console.log('=== FINAL MARKET COUNTS ===');
  counts.forEach(r => console.log(`  ${r.market}: ${r._count}`));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
