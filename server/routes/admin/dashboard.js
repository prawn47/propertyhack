const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  const prisma = req.prisma;

  try {
    const now = new Date();
    const ago24h = new Date(now - 24 * 60 * 60 * 1000);
    const ago7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const ago30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalArticles,
      articles24h,
      articles7d,
      articles30d,
      articlesByStatus,
      articlesByCategory,
      totalSources,
      activeSources,
      pausedSources,
      sourcesWithErrors,
      articlesBySources,
      ingestionHealth,
      recentLogs,
      staleSources,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { createdAt: { gte: ago24h } } }),
      prisma.article.count({ where: { createdAt: { gte: ago7d } } }),
      prisma.article.count({ where: { createdAt: { gte: ago30d } } }),
      prisma.article.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.article.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 10,
      }),
      prisma.ingestionSource.count(),
      prisma.ingestionSource.count({ where: { isActive: true } }),
      prisma.ingestionSource.count({ where: { isActive: false } }),
      prisma.ingestionSource.count({ where: { errorCount: { gt: 0 } } }),
      prisma.ingestionSource.findMany({
        select: {
          id: true,
          name: true,
          articleCount: true,
        },
        orderBy: { articleCount: 'desc' },
        take: 10,
      }),
      prisma.ingestionSource.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          lastFetchAt: true,
          lastError: true,
          errorCount: true,
          articleCount: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.ingestionLog.findMany({
        select: {
          id: true,
          sourceId: true,
          status: true,
          articlesFound: true,
          articlesNew: true,
          errorMessage: true,
          duration: true,
          createdAt: true,
          source: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.ingestionSource.findMany({
        where: {
          isActive: true,
          OR: [
            { lastFetchAt: { lt: ago24h } },
            { lastFetchAt: null },
          ],
        },
        select: { id: true, name: true, lastFetchAt: true },
      }),
    ]);

    const statusMap = {};
    for (const row of articlesByStatus) {
      statusMap[row.status] = row._count.status;
    }

    res.json({
      articles: {
        total: totalArticles,
        last24h: articles24h,
        last7d: articles7d,
        last30d: articles30d,
        byStatus: {
          DRAFT: statusMap.DRAFT || 0,
          PUBLISHED: statusMap.PUBLISHED || 0,
          ARCHIVED: statusMap.ARCHIVED || 0,
        },
        byCategory: articlesByCategory.map((r) => ({
          category: r.category,
          count: r._count.category,
        })),
      },
      sources: {
        total: totalSources,
        active: activeSources,
        paused: pausedSources,
        withErrors: sourcesWithErrors,
        topByArticleCount: articlesBySources,
      },
      ingestionHealth: {
        perSource: ingestionHealth.map((s) => ({
          id: s.id,
          name: s.name,
          isActive: s.isActive,
          lastFetchAt: s.lastFetchAt,
          consecutiveFailures: s.errorCount,
          lastError: s.lastError,
          articleCount: s.articleCount,
        })),
        recentLogs: recentLogs.map((l) => ({
          id: l.id,
          sourceId: l.sourceId,
          sourceName: l.source.name,
          status: l.status,
          articlesFound: l.articlesFound,
          articlesNew: l.articlesNew,
          errorMessage: l.errorMessage,
          duration: l.duration,
          createdAt: l.createdAt,
        })),
      },
      health: {
        staleSources: staleSources.map((s) => ({
          id: s.id,
          name: s.name,
          lastFetchAt: s.lastFetchAt,
        })),
        sourcesWithErrors: sourcesWithErrors,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
