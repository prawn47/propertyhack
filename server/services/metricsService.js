const { getClient } = require('../lib/prisma');

let beehiivService;
try {
  beehiivService = require('./beehiivService');
} catch (err) {
  console.warn('[metricsService] beehiivService not available:', err.message);
}

function getYesterdayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start, end };
}

function getDayBeforeYesterdayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return { start, end };
}

function computeTrend(current, previous) {
  if (previous === 0 && current === 0) return 'flat';
  if (previous === 0) return 'up';
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'flat';
}

async function getNewsletterMetrics(db) {
  try {
    const latestSent = await db.newsletterDraft.findFirst({
      where: { status: 'SENT' },
      orderBy: { sentAt: 'desc' },
    });

    if (!latestSent) {
      return { available: false };
    }

    let openRate = null;
    let clickRate = null;
    let topArticles = [];

    if (latestSent.beehiivPostId && beehiivService) {
      try {
        const stats = await beehiivService.getPostStats(latestSent.beehiivPostId);
        if (stats) {
          openRate = stats.open_rate ?? stats.openRate ?? null;
          clickRate = stats.click_rate ?? stats.clickRate ?? null;
          topArticles = stats.top_clicks || [];
        }
      } catch (err) {
        console.warn('[metricsService] Beehiiv stats fetch failed:', err.message);
      }
    }

    const subscriberCount = await db.subscriber.count({
      where: { unsubscribedAt: null },
    });

    return {
      available: true,
      openRate,
      clickRate,
      subscriberCount,
      topArticles,
      subject: latestSent.subject,
      sentAt: latestSent.sentAt,
    };
  } catch (err) {
    console.error('[metricsService] newsletter metrics error:', err.message);
    return { available: false };
  }
}

async function getSocialMetrics(db) {
  try {
    const yesterday = getYesterdayRange();
    const dayBefore = getDayBeforeYesterdayRange();

    const yesterdayPosts = await db.socialPost.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: yesterday.start, lt: yesterday.end },
      },
    });

    const dayBeforePosts = await db.socialPost.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: dayBefore.start, lt: dayBefore.end },
      },
    });

    function aggregatePosts(posts) {
      const platforms = {};
      let totalEngagement = 0;

      for (const post of posts) {
        const platform = post.platform || (post.platforms && post.platforms[0]) || 'unknown';
        if (!platforms[platform]) {
          platforms[platform] = { posts: 0, reach: 0, engagement: 0 };
        }
        platforms[platform].posts++;

        if (post.platformResults && typeof post.platformResults === 'object') {
          const results = post.platformResults;
          const reach = results.reach || results.impressions || 0;
          const engagement = (results.likes || 0) + (results.comments || 0) +
            (results.shares || 0) + (results.retweets || 0);
          platforms[platform].reach += reach;
          platforms[platform].engagement += engagement;
          totalEngagement += engagement;
        }
      }

      return { totalPosts: posts.length, platforms, totalEngagement };
    }

    const yesterdayAgg = aggregatePosts(yesterdayPosts);
    const dayBeforeAgg = aggregatePosts(dayBeforePosts);

    return {
      totalPosts: yesterdayAgg.totalPosts,
      platforms: yesterdayAgg.platforms,
      trends: {
        posts: computeTrend(yesterdayAgg.totalPosts, dayBeforeAgg.totalPosts),
        engagement: computeTrend(yesterdayAgg.totalEngagement, dayBeforeAgg.totalEngagement),
      },
    };
  } catch (err) {
    console.error('[metricsService] social metrics error:', err.message);
    return { totalPosts: 0, platforms: {}, trends: { posts: 'flat', engagement: 'flat' } };
  }
}

async function getWebsiteMetrics(db) {
  try {
    const yesterday = getYesterdayRange();
    const dayBefore = getDayBeforeYesterdayRange();

    // Articles viewed yesterday (viewCount is cumulative, so we look at articles updated yesterday)
    // Since we don't have per-day view tracking, sum viewCount for articles published yesterday
    // as a proxy, and also get top articles by viewCount overall
    const yesterdayArticles = await db.article.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: yesterday.start, lt: yesterday.end },
      },
      select: { id: true, title: true, slug: true, viewCount: true },
    });

    const dayBeforeArticles = await db.article.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: dayBefore.start, lt: dayBefore.end },
      },
      select: { viewCount: true },
    });

    const yesterdayViews = yesterdayArticles.reduce((sum, a) => sum + (a.viewCount || 0), 0);
    const dayBeforeViews = dayBeforeArticles.reduce((sum, a) => sum + (a.viewCount || 0), 0);

    // Top 3 articles by viewCount (recently published)
    const topArticles = await db.article.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: yesterday.start, lt: yesterday.end },
      },
      orderBy: { viewCount: 'desc' },
      take: 3,
      select: { id: true, title: true, slug: true, viewCount: true },
    });

    // New subscribers yesterday
    const newSignups = await db.subscriber.count({
      where: {
        createdAt: { gte: yesterday.start, lt: yesterday.end },
      },
    });

    const prevSignups = await db.subscriber.count({
      where: {
        createdAt: { gte: dayBefore.start, lt: dayBefore.end },
      },
    });

    return {
      visits: yesterdayViews,
      topArticles,
      newSignups,
      trends: {
        visits: computeTrend(yesterdayViews, dayBeforeViews),
        signups: computeTrend(newSignups, prevSignups),
      },
    };
  } catch (err) {
    console.error('[metricsService] website metrics error:', err.message);
    return { visits: 0, topArticles: [], newSignups: 0, trends: { visits: 'flat', signups: 'flat' } };
  }
}

async function getAggregatedMetrics(prisma) {
  const db = prisma || getClient();

  const [newsletter, social, website] = await Promise.all([
    getNewsletterMetrics(db),
    getSocialMetrics(db),
    getWebsiteMetrics(db),
  ]);

  return { newsletter, social, website };
}

module.exports = { getAggregatedMetrics };
