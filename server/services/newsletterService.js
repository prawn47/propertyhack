'use strict';

const { PrismaClient } = require('@prisma/client');
const { generateEmbedding } = require('./embeddingService');
const aiProviderService = require('./aiProviderService');
const imagenService = require('./imagenService');

const prisma = new PrismaClient();

const DEFAULT_CONFIG = {
  dailyArticleLimit: 20,
  editorialArticleLimit: 50,
  roundupArticleLimit: 30,
  globalArticleLimit: 3,
  historicalLookbackDays: 90,
  similarityThreshold: 0.4,
  editorialMinWordCount: 1500,
  roundupDaysWindow: 6,
};

async function loadConfig() {
  const row = await prisma.newsletterGenerationConfig.findFirst();
  return row || DEFAULT_CONFIG;
}

async function selectTodaysArticles(jurisdiction, { prisma }) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
      a.id,
      a.title,
      a.short_blurb as "shortBlurb",
      a.long_summary as "longSummary",
      a.slug,
      a.category,
      a.published_at as "publishedAt",
      a.source_url as "sourceUrl"
    FROM articles a
    WHERE a.status = 'PUBLISHED'
      AND a.published_at >= NOW() - INTERVAL '24 hours'
      AND (a.market = $1 OR a.is_global = true OR a.is_evergreen = true)
    ORDER BY a.published_at DESC
    LIMIT 20`,
    jurisdiction.toUpperCase()
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    shortBlurb: row.shortBlurb,
    longSummary: row.longSummary,
    slug: row.slug,
    category: row.category,
    publishedAt: row.publishedAt,
    sourceUrl: row.sourceUrl,
  }));
}

async function selectHistoricalContext(jurisdiction, todaysArticleTitles, { prisma }) {
  if (!todaysArticleTitles || todaysArticleTitles.length === 0) {
    return [];
  }

  const concatenatedTitles = todaysArticleTitles.join(' ');
  const embedding = await generateEmbedding(concatenatedTitles);
  const embeddingStr = `[${embedding.join(',')}]`;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
      a.id,
      a.title,
      a.short_blurb as "shortBlurb",
      a.slug,
      a.category,
      a.published_at as "publishedAt",
      1 - (a.embedding <=> $1::vector) as similarity
    FROM articles a
    WHERE a.status = 'PUBLISHED'
      AND a.embedding IS NOT NULL
      AND a.published_at >= NOW() - INTERVAL '90 days'
      AND a.published_at < NOW() - INTERVAL '24 hours'
      AND (a.market = $2 OR a.is_global = true)
      AND 1 - (a.embedding <=> $1::vector) > 0.4
    ORDER BY similarity DESC
    LIMIT 30`,
    embeddingStr,
    jurisdiction.toUpperCase()
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    shortBlurb: row.shortBlurb,
    slug: row.slug,
    category: row.category,
    publishedAt: row.publishedAt,
    similarity: parseFloat(row.similarity),
  }));
}

async function selectGlobalHighlights(jurisdiction, daysBack, limit, { prisma }) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT a.id, a.title, a.short_blurb as "shortBlurb", a.slug, a.market, a.published_at as "publishedAt"
    FROM articles a
    WHERE a.status = 'PUBLISHED'
      AND a.published_at >= $1
      AND a.market != $2
      AND (a.is_global = true OR a.relevance_score >= 8)
    ORDER BY a.relevance_score DESC NULLS LAST, a.published_at DESC
    LIMIT $3`,
    cutoffDate,
    jurisdiction.toUpperCase(),
    limit
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    shortBlurb: row.shortBlurb,
    slug: row.slug,
    market: row.market,
    publishedAt: row.publishedAt,
  }));
}

async function selectWeekArticles(jurisdiction, daysBack, limit, { prisma }) {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
      a.id,
      a.title,
      a.short_blurb as "shortBlurb",
      a.long_summary as "longSummary",
      a.slug,
      a.category,
      a.published_at as "publishedAt",
      a.source_url as "sourceUrl",
      a.relevance_score as "relevanceScore"
    FROM articles a
    WHERE a.status = 'PUBLISHED'
      AND a.published_at >= $1
      AND (a.market = $2 OR a.is_global = true)
    ORDER BY a.relevance_score DESC NULLS LAST, a.published_at DESC
    LIMIT $3`,
    cutoff,
    jurisdiction.toUpperCase(),
    limit
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    shortBlurb: row.shortBlurb,
    longSummary: row.longSummary,
    slug: row.slug,
    category: row.category,
    publishedAt: row.publishedAt,
    sourceUrl: row.sourceUrl,
    relevanceScore: row.relevanceScore,
  }));
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clusterTrends(historicalArticles) {
  if (!historicalArticles || historicalArticles.length === 0) {
    return [];
  }

  const CLUSTER_THRESHOLD = 0.7;
  const assigned = new Array(historicalArticles.length).fill(-1);
  const clusters = [];

  for (let i = 0; i < historicalArticles.length; i++) {
    if (assigned[i] !== -1) continue;

    const clusterIndices = [i];
    assigned[i] = clusters.length;

    for (let j = i + 1; j < historicalArticles.length; j++) {
      if (assigned[j] !== -1) continue;

      const simA = historicalArticles[i].similarity || 0;
      const simB = historicalArticles[j].similarity || 0;
      const combinedSim = Math.min(simA, simB) / Math.max(simA, simB || 0.001);

      if (combinedSim > CLUSTER_THRESHOLD) {
        clusterIndices.push(j);
        assigned[j] = clusters.length;
      }
    }

    clusters.push(clusterIndices);
  }

  return clusters
    .filter(indices => indices.length > 0)
    .map(indices => {
      const articles = indices.map(i => historicalArticles[i]);
      const dates = articles.map(a => new Date(a.publishedAt)).filter(d => !isNaN(d));
      const earliest = dates.length > 0 ? new Date(Math.min(...dates)) : null;
      const latest = dates.length > 0 ? new Date(Math.max(...dates)) : null;

      let timespan = null;
      if (earliest && latest) {
        const days = Math.round((latest - earliest) / (1000 * 60 * 60 * 24));
        if (days === 0) {
          timespan = '1 day';
        } else if (days < 7) {
          timespan = `${days} days`;
        } else if (days < 30) {
          timespan = `${Math.round(days / 7)} weeks`;
        } else {
          timespan = `${Math.round(days / 30)} months`;
        }
      }

      const keyArticle = articles.reduce((best, a) =>
        (a.similarity || 0) > (best.similarity || 0) ? a : best
      , articles[0]);

      return {
        description: keyArticle.title,
        count: articles.length,
        timespan,
        keyArticle: {
          id: keyArticle.id,
          title: keyArticle.title,
          slug: keyArticle.slug,
          publishedAt: keyArticle.publishedAt,
          similarity: keyArticle.similarity,
        },
      };
    })
    .sort((a, b) => b.count - a.count);
}

const JURISDICTION_NAMES = {
  au: 'Australia',
  nz: 'New Zealand',
  uk: 'United Kingdom',
  us: 'United States',
  ca: 'Canada',
};

async function buildDailyPrompt(jurisdiction, articleData, { prisma }) {
  const { todaysArticles, historicalArticles, trendClusters, globalHighlights } = articleData;

  const tonePromptName = `newsletter-tone-${jurisdiction.toLowerCase()}`;
  const [toneRecord, criteriaRecord] = await Promise.all([
    prisma.systemPrompt.findUnique({ where: { name: tonePromptName } }),
    prisma.systemPrompt.findUnique({ where: { name: 'feed-quality-criteria' } }),
  ]);

  const systemPrompt = toneRecord ? toneRecord.content : '';

  const jurisdictionName = JURISDICTION_NAMES[jurisdiction.toLowerCase()] || jurisdiction.toUpperCase();

  const topArticles = todaysArticles.slice(0, 8);
  const todaysArticlesBlock = topArticles.length > 0
    ? topArticles.map(a => `- [${a.title}](/article/${a.slug}): ${a.longSummary || a.shortBlurb || ''}`).join('\n')
    : 'No articles available for today.';

  const trendClustersBlock = trendClusters && trendClusters.length > 0
    ? trendClusters.map(cluster => {
        const timespanStr = cluster.timespan ? ` over ${cluster.timespan}` : '';
        const dateStr = cluster.keyArticle.publishedAt
          ? new Date(cluster.keyArticle.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        return `- Theme: "${cluster.description}" — ${cluster.count} article${cluster.count !== 1 ? 's' : ''}${timespanStr}\n  - Key article: [${cluster.keyArticle.title}](/article/${cluster.keyArticle.slug})${dateStr ? ` (${dateStr})` : ''}`;
      }).join('\n')
    : 'No recurring trends identified in the historical data.';

  const backlinksBlock = historicalArticles && historicalArticles.length > 0
    ? historicalArticles.slice(0, 15).map(a => {
        const dateStr = a.publishedAt
          ? new Date(a.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        return `- [${a.title}](/article/${a.slug}): ${a.shortBlurb || ''} (published ${dateStr})`;
      }).join('\n')
    : 'No historical articles available.';

  const editorialGuidelines = criteriaRecord ? criteriaRecord.content : '';

  const globalBlock = globalHighlights && globalHighlights.length > 0
    ? globalHighlights.map(a => `- [${a.title}](/article/${a.slug}) — ${a.market || 'Global'}: ${a.shortBlurb || ''}`).join('\n')
    : 'No global highlights today.';

  const userPrompt = `You are writing the daily PropertyHack newsletter for ${jurisdictionName} subscribers.

## Editorial Guidelines
${editorialGuidelines}

## Today's Top Articles
${todaysArticlesBlock}

## Global Property Pulse
${globalBlock}

## Historical Context & Trends
${trendClustersBlock}

## Related Older Articles (for backlinking)
${backlinksBlock}

## Instructions
Write a newsletter with these sections:
1. Subject line (compelling, 60 chars max)
2. Opening editorial paragraph — set the tone, reference today's key theme
3. 3-5 main story sections — each with a headline, 2-3 paragraph commentary, and link to the full article on PropertyHack
4. **Global Property Pulse** — 1-2 sentences per global highlight with link to article. If the section contains substantive content, mark it with type "global-summary"
5. Trends & Insights — draw on historical data to identify patterns. Weave in backlinks to older articles NATURALLY as hyperlinked words within sentences, not as standalone links
6. "Worth Revisiting" — 3-5 older articles relevant to today's themes, each with title, one-line blurb, and link

ALL links must use PropertyHack URLs: /article/{slug}
Inline backlinks must be woven into narrative text as [hyperlinked phrases](/article/{slug}), not listed separately.
Output as JSON: { subject, sections: [{ type, heading?, html }], articleSlugs: [] }`;

  return { systemPrompt, userPrompt };
}

async function buildRoundupPrompt(jurisdiction, articleData, { prisma }) {
  const { weekArticles, globalHighlights, historicalArticles } = articleData;

  const tonePromptName = `newsletter-tone-${jurisdiction.toLowerCase()}`;
  const [roundupInstructions, toneRecord] = await Promise.all([
    prisma.systemPrompt.findUnique({ where: { name: 'newsletter-roundup-instructions' } }),
    prisma.systemPrompt.findUnique({ where: { name: tonePromptName } }),
  ]);

  const systemPrompt = [
    roundupInstructions ? roundupInstructions.content : '',
    toneRecord ? toneRecord.content : '',
  ].filter(Boolean).join('\n\n');

  const jurisdictionName = JURISDICTION_NAMES[jurisdiction.toLowerCase()] || jurisdiction.toUpperCase();

  const weekArticlesBlock = weekArticles && weekArticles.length > 0
    ? weekArticles.map(a => {
        const score = a.relevanceScore != null ? ` [relevance: ${a.relevanceScore}]` : '';
        return `- [${a.title}](/article/${a.slug}): ${a.shortBlurb || ''}${score} (${a.category || 'General'})`;
      }).join('\n')
    : 'No articles available for the week.';

  const globalBlock = globalHighlights && globalHighlights.length > 0
    ? globalHighlights.map(a => `- [${a.title}](/article/${a.slug}) — ${a.market || 'Global'}`).join('\n')
    : 'No global highlights this week.';

  const historicalBlock = historicalArticles && historicalArticles.length > 0
    ? historicalArticles.slice(0, 15).map(a => {
        const dateStr = a.publishedAt
          ? new Date(a.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        return `- [${a.title}](/article/${a.slug}): ${a.shortBlurb || ''} (published ${dateStr})`;
      }).join('\n')
    : 'No historical articles available for trend analysis.';

  const userPrompt = `You are writing the Sunday Weekly Roundup newsletter for PropertyHack's ${jurisdictionName} subscribers.

## This Week's Articles (sorted by relevance)
${weekArticlesBlock}

## Global Highlights
${globalBlock}

## Historical Context (for trend analysis and backlinking)
${historicalBlock}

## Instructions
Write a weekly roundup newsletter with these sections:
1. **Subject line** — compelling, 60 chars max, should convey "this week in property"
2. **"The Week in Property"** — a summary paragraph (3-5 sentences) capturing the overall theme of the week's property news in ${jurisdictionName}
3. **Top 5 Stories** — the five most important stories of the week, each with a headline, 1-2 paragraph summary, and link to the full article on PropertyHack
4. **Market Data & Stats Callout** — a short section highlighting any notable statistics, price movements, or data points from the week's articles
5. **Emerging Trends** — identify 2-3 emerging trends based on this week's coverage and historical context. Weave in backlinks to older articles NATURALLY as hyperlinked words within sentences
6. **Global Property Pulse** — 1-2 sentences per global highlight with link to article
7. **Notable Backlinks** — 3-5 older articles relevant to this week's themes, each with title, one-line blurb, and link

ALL links must use PropertyHack URLs: /article/{slug}
Inline backlinks must be woven into narrative text as [hyperlinked phrases](/article/{slug}), not listed separately.
Target length: 1000-1500 words.

Output as JSON: { subject, sections: [{ type, heading?, html }], articleSlugs: [] }
The articleSlugs array should contain the slugs of ALL articles referenced in the newsletter.`;

  return { systemPrompt, userPrompt };
}

/**
 * Generate a newsletter for the given jurisdiction and cadence, store as DRAFT.
 *
 * @param {string} jurisdiction - e.g. 'au', 'uk', 'us', 'ca', 'nz'
 * @param {string} cadence - 'DAILY' | 'EDITORIAL' | 'WEEKLY_ROUNDUP'
 * @returns {Promise<object>} The created NewsletterDraft record
 */
async function generateNewsletter(jurisdiction, cadence = 'DAILY') {
  const jur = jurisdiction.toLowerCase();
  const config = await loadConfig();

  let systemPrompt, userPrompt, allArticles, articleSlugs, parsed, topic, globalHighlights;

  switch (cadence) {
    case 'EDITORIAL':
      ({ systemPrompt, userPrompt, allArticles, parsed, topic, globalHighlights } =
        await _generateEditorialData(jur, config));
      break;
    case 'WEEKLY_ROUNDUP':
      ({ systemPrompt, userPrompt, allArticles, parsed, globalHighlights } =
        await _generateRoundupData(jur, config));
      break;
    case 'DAILY':
    default:
      ({ systemPrompt, userPrompt, allArticles, parsed, globalHighlights } =
        await _generateDailyData(jur, config));
      break;
  }

  const { subject, sections = [] } = parsed;
  articleSlugs = parsed.articleSlugs || [];

  if (!subject) {
    throw new Error('[newsletterService] AI output missing required field: subject');
  }

  const htmlContent = sections.map(section => {
    if (section.heading) {
      return `<h2>${section.heading}</h2>\n${section.html || ''}`;
    }
    return section.html || '';
  }).join('\n\n');

  const globalSummarySection = sections.find(s => s.type === 'global-summary');
  const globalSummary = globalSummarySection
    ? (globalSummarySection.heading ? `<h2>${globalSummarySection.heading}</h2>\n` : '') + (globalSummarySection.html || '')
    : null;

  const slugToId = {};
  for (const a of allArticles) {
    if (a.slug) slugToId[a.slug] = a.id;
  }
  const articleIds = [...new Set(
    (articleSlugs || []).map(slug => slugToId[slug]).filter(Boolean)
  )];

  const draft = await prisma.newsletterDraft.create({
    data: {
      jurisdiction: jur.toUpperCase(),
      subject,
      htmlContent,
      articleIds,
      status: 'DRAFT',
      cadence,
      ...(globalSummary && { globalSummary }),
      ...(topic && { topic }),
    },
  });

  // Hero image — try AI generation, fallback to first article image, or skip
  let heroImageUrl = null;
  const firstSectionText = sections[0]?.html || '';
  try {
    heroImageUrl = await imagenService.generateHeroImage(draft.id, subject, firstSectionText);
  } catch (_err) {
    // generateHeroImage returns null on failure, but catch just in case
  }

  if (!heroImageUrl && allArticles.length > 0) {
    // Fallback: use first article's imageUrl if available
    const firstWithImage = allArticles.find(a => a.imageUrl);
    if (firstWithImage) {
      heroImageUrl = firstWithImage.imageUrl;
    }
  }

  if (heroImageUrl) {
    await prisma.newsletterDraft.update({
      where: { id: draft.id },
      data: { heroImageUrl },
    });
    draft.heroImageUrl = heroImageUrl;
  }

  return draft;
}

async function _generateDailyData(jur, config) {
  const todaysArticles = await selectTodaysArticles(jur, { prisma });
  const globalHighlights = await selectGlobalHighlights(jur, 1, config.globalArticleLimit, { prisma });
  const todaysTitles = todaysArticles.map(a => a.title);
  const historicalArticles = await selectHistoricalContext(jur, todaysTitles, { prisma });
  const trendClusters = clusterTrends(historicalArticles);

  const articleData = { todaysArticles, historicalArticles, trendClusters, globalHighlights };
  const { systemPrompt, userPrompt } = await buildDailyPrompt(jur, articleData, { prisma });

  const { text } = await aiProviderService.generateText('newsletter-generation', userPrompt, {
    systemPrompt,
    jsonMode: true,
  });

  const parsed = _parseAiJson(text);
  const allArticles = [...todaysArticles, ...historicalArticles, ...globalHighlights];

  return { systemPrompt, userPrompt, allArticles, parsed, globalHighlights };
}

async function _generateEditorialData(jur, config) {
  const weekArticles = await selectWeekArticles(jur, 5, config.editorialArticleLimit, { prisma });
  const { topic } = await identifyTrendingTopic(weekArticles, { prisma });
  const articleTitles = weekArticles.map(a => a.title);
  const historicalArticles = await selectHistoricalContext(jur, articleTitles, { prisma });
  const globalHighlights = await selectGlobalHighlights(jur, 7, 2, { prisma });
  const trendClusters = clusterTrends(historicalArticles);

  const articleData = { topic, weekArticles, historicalArticles, globalHighlights, trendClusters };
  const { systemPrompt, userPrompt } = await buildEditorialPrompt(jur, articleData, { prisma });

  const { text } = await aiProviderService.generateText('newsletter-editorial', userPrompt, {
    systemPrompt,
    jsonMode: true,
  });

  const parsed = _parseAiJson(text);
  const allArticles = [...weekArticles, ...historicalArticles, ...globalHighlights];

  return { systemPrompt, userPrompt, allArticles, parsed, topic, globalHighlights };
}

async function _generateRoundupData(jur, config) {
  const weekArticles = await selectWeekArticles(jur, config.roundupDaysWindow, config.roundupArticleLimit, { prisma });
  const globalHighlights = await selectGlobalHighlights(jur, 7, 2, { prisma });
  const articleTitles = weekArticles.map(a => a.title);
  const historicalArticles = await selectHistoricalContext(jur, articleTitles, { prisma });

  const articleData = { weekArticles, globalHighlights, historicalArticles };
  const { systemPrompt, userPrompt } = await buildRoundupPrompt(jur, articleData, { prisma });

  const { text } = await aiProviderService.generateText('newsletter-roundup', userPrompt, {
    systemPrompt,
    jsonMode: true,
  });

  const parsed = _parseAiJson(text);
  const allArticles = [...weekArticles, ...historicalArticles, ...globalHighlights];

  return { systemPrompt, userPrompt, allArticles, parsed, globalHighlights };
}

function _parseAiJson(text) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`[newsletterService] Failed to parse AI JSON output: ${err.message}. Raw: ${text.substring(0, 200)}`);
  }
}

async function buildEditorialPrompt(jurisdiction, articleData, { prisma }) {
  const { topic, weekArticles, historicalArticles, globalHighlights, trendClusters } = articleData;

  const tonePromptName = `newsletter-tone-${jurisdiction.toLowerCase()}`;
  const [editorialInstructions, toneRecord] = await Promise.all([
    prisma.systemPrompt.findUnique({ where: { name: 'newsletter-editorial-instructions' } }),
    prisma.systemPrompt.findUnique({ where: { name: tonePromptName } }),
  ]);

  const systemPrompt = [
    editorialInstructions ? editorialInstructions.content : '',
    toneRecord ? toneRecord.content : '',
  ].filter(Boolean).join('\n\n');

  const jurisdictionName = JURISDICTION_NAMES[jurisdiction.toLowerCase()] || jurisdiction.toUpperCase();

  const weekArticlesBlock = weekArticles && weekArticles.length > 0
    ? weekArticles.map(a => `- [${a.title}](/article/${a.slug}): ${a.longSummary || a.shortBlurb || ''} (${a.category || 'General'})`).join('\n')
    : 'No articles available for the week.';

  const historicalBlock = historicalArticles && historicalArticles.length > 0
    ? historicalArticles.slice(0, 15).map(a => {
        const dateStr = a.publishedAt
          ? new Date(a.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        return `- [${a.title}](/article/${a.slug}): ${a.shortBlurb || ''} (published ${dateStr})`;
      }).join('\n')
    : 'No historical articles available for backlinking.';

  const globalBlock = globalHighlights && globalHighlights.length > 0
    ? globalHighlights.map(a => `- [${a.title}](/article/${a.slug}) — ${a.market || 'Global'}`).join('\n')
    : 'No global highlights this week.';

  const trendClustersBlock = trendClusters && trendClusters.length > 0
    ? trendClusters.map(cluster => {
        const timespanStr = cluster.timespan ? ` over ${cluster.timespan}` : '';
        return `- "${cluster.description}" — ${cluster.count} article${cluster.count !== 1 ? 's' : ''}${timespanStr}`;
      }).join('\n')
    : '';

  const trendSection = trendClustersBlock
    ? `\n## Trend Clusters\n${trendClustersBlock}\n`
    : '';

  const userPrompt = `You are writing the Saturday Editorial deep-dive for PropertyHack's ${jurisdictionName} subscribers.

## Editorial Topic
${topic}

## Source Articles From This Week (related to topic)
${weekArticlesBlock}

## Historical Articles (for backlinking)
${historicalBlock}

## Global Highlights
${globalBlock}
${trendSection}
## Instructions
Write a long-form editorial (1500–2500 words) on the topic above. This is a deep-dive analysis piece — not a news summary. Provide:
1. Expert-style analysis and commentary on the topic
2. Historical context drawn from the older articles listed above
3. Forward-looking insights and implications for the ${jurisdictionName} property market
4. Global perspective using the highlights provided

Weave backlinks to older articles NATURALLY into the narrative as [hyperlinked phrases](/article/{slug}). Do not list backlinks separately — they must appear as part of flowing sentences.

ALL links must use PropertyHack URLs: /article/{slug}

Output as JSON:
{
  "subject": "Compelling subject line, 60 chars max",
  "topic": "${topic}",
  "sections": [
    { "type": "editorial-intro", "html": "..." },
    { "type": "analysis", "heading": "...", "html": "..." },
    { "type": "analysis", "heading": "...", "html": "..." },
    { "type": "global-perspective", "heading": "Global Property Pulse", "html": "..." },
    { "type": "conclusion", "heading": "...", "html": "..." }
  ],
  "articleSlugs": ["slug1", "slug2"]
}

The articleSlugs array must contain the slugs of ALL articles referenced in the editorial.`;

  return { systemPrompt, userPrompt };
}

async function identifyTrendingTopic(weekArticles, { prisma }) {
  if (!weekArticles || weekArticles.length === 0) {
    return { topic: 'Property Market This Week', sourceArticles: [] };
  }

  const categoryMap = new Map();
  for (const article of weekArticles) {
    const cat = article.category || 'General';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat).push(article);
  }

  let topCategory = null;
  let topScore = -1;
  for (const [category, articles] of categoryMap) {
    const avgRelevance = articles.reduce((sum, a) => sum + (a.relevanceScore ?? 5), 0) / articles.length;
    const score = articles.length * avgRelevance;
    if (score > topScore) {
      topScore = score;
      topCategory = category;
    }
  }

  const sourceArticles = categoryMap.get(topCategory);

  const articleList = sourceArticles
    .map(a => `- "${a.title}"${a.shortBlurb ? `: ${a.shortBlurb}` : ''}`)
    .join('\n');

  const prompt = `You are an editorial assistant for PropertyHack, a property news platform.

Below are the top articles from the "${topCategory}" category this week:

${articleList}

Pick and phrase a single compelling editorial topic suitable for a Saturday deep-dive editorial newsletter. The topic should tie together the key themes from these articles into one engaging title.

Respond with JSON only: { "topic": "Your topic title here" }`;

  try {
    const { text } = await aiProviderService.generateText('newsletter-editorial', prompt, {
      jsonMode: true,
    });
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.topic && typeof parsed.topic === 'string') {
      return { topic: parsed.topic, sourceArticles };
    }
  } catch (_err) {
    // AI call failed — fall back to category name
  }

  return { topic: `This Week in ${topCategory}`, sourceArticles };
}

module.exports = { selectTodaysArticles, selectHistoricalContext, selectGlobalHighlights, selectWeekArticles, clusterTrends, buildDailyPrompt, buildRoundupPrompt, buildEditorialPrompt, generateNewsletter, identifyTrendingTopic };
