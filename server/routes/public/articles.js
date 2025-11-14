const express = require('express');
const router = express.Router();

/**
 * GET /api/public/articles
 * Fetch published articles for public display (AU market only)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, featured } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {
      status: 'published',
      market: 'AU',
    };
    
    // Optional: filter by featured
    if (featured === 'true') {
      where.featured = true;
    }
    
    // Fetch articles with relations
    const [articles, total] = await Promise.all([
      req.prisma.article.findMany({
        where,
        include: {
          category: true,
          source: true,
          author: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        orderBy: [
          { featured: 'desc' }, // Featured articles first
          { publishedAt: 'desc' }, // Then by date
        ],
        skip,
        take: parseInt(limit),
      }),
      req.prisma.article.count({ where }),
    ]);
    
    // Parse focusKeywords from JSON string
    const articlesWithParsedKeywords = articles.map(article => ({
      ...article,
      focusKeywords: article.focusKeywords ? JSON.parse(article.focusKeywords) : [],
    }));
    
    res.json({
      articles: articlesWithParsedKeywords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
    
  } catch (error) {
    console.error('[Public Articles] Error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

/**
 * GET /api/public/articles/:slug
 * Fetch single article by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const article = await req.prisma.article.findUnique({
      where: { slug },
      include: {
        category: true,
        source: true,
        author: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Only allow published articles
    if (article.status !== 'published') {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Increment view count
    await req.prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });
    
    // Parse focusKeywords
    const articleWithParsedKeywords = {
      ...article,
      focusKeywords: article.focusKeywords ? JSON.parse(article.focusKeywords) : [],
    };
    
    res.json(articleWithParsedKeywords);
    
  } catch (error) {
    console.error('[Public Article Detail] Error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

module.exports = router;
