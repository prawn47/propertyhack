'use strict';

const { generateEmbedding } = require('./embeddingService');

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

module.exports = { selectTodaysArticles, selectHistoricalContext, clusterTrends };
