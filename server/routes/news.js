const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { fetchCuratedNews } = require('../services/perplexityService');

/**
 * GET /api/news
 * Fetch user's curated news articles
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';

    const where = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const articles = await req.prisma.newsArticle.findMany({
      where,
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });

    res.json(articles);
  } catch (error) {
    console.error('Error fetching news articles:', error);
    res.status(500).json({ error: 'Failed to fetch news articles' });
  }
});

/**
 * POST /api/news/refresh
 * Manually trigger news refresh for current user
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user settings
    const userSettings = await req.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!userSettings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    // Fetch news from Perplexity
    const articles = await fetchCuratedNews(userSettings);

    if (articles.length === 0) {
      return res.json({ message: 'No new articles found', articles: [] });
    }

    // Delete old articles (keep last 50)
    const existingCount = await req.prisma.newsArticle.count({ where: { userId } });
    if (existingCount > 50) {
      const toDelete = await req.prisma.newsArticle.findMany({
        where: { userId },
        orderBy: { fetchedAt: 'desc' },
        skip: 50,
        select: { id: true },
      });
      await req.prisma.newsArticle.deleteMany({
        where: { id: { in: toDelete.map(a => a.id) } },
      });
    }

    // Save new articles to database
    const savedArticles = await Promise.all(
      articles.map(article => 
        req.prisma.newsArticle.create({
          data: {
            userId,
            title: article.title,
            summary: article.summary,
            content: article.content,
            url: article.url,
            source: article.source,
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
            category: article.category,
            relevanceScore: article.relevanceScore,
          },
        })
      )
    );

    res.json({ message: 'News refreshed successfully', articles: savedArticles });
  } catch (error) {
    console.error('Error refreshing news:', error);
    res.status(500).json({ error: 'Failed to refresh news' });
  }
});

/**
 * PATCH /api/news/:id/read
 * Mark an article as read
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const articleId = req.params.id;

    const article = await req.prisma.newsArticle.findFirst({
      where: { id: articleId, userId },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const updated = await req.prisma.newsArticle.update({
      where: { id: articleId },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking article as read:', error);
    res.status(500).json({ error: 'Failed to mark article as read' });
  }
});

/**
 * DELETE /api/news/:id
 * Delete a news article
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const articleId = req.params.id;

    const article = await req.prisma.newsArticle.findFirst({
      where: { id: articleId, userId },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await req.prisma.newsArticle.delete({
      where: { id: articleId },
    });

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;
