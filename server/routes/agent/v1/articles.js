const express = require('express');
const { query, validationResult } = require('express-validator');
const { requireScope } = require('../../../middleware/agentAuth');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// GET / — List recent published articles for agent context
router.get(
  '/',
  requireScope('newsletters:read'),
  [
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('limit must be 1-100'),
    query('jurisdiction').optional().isString().isIn(['AU', 'NZ', 'UK', 'US', 'CA']).withMessage('jurisdiction must be AU, NZ, UK, US, or CA'),
    query('category').optional().isString().notEmpty().withMessage('category must be a non-empty string'),
    query('from').optional().isISO8601().withMessage('from must be an ISO 8601 date'),
    query('to').optional().isISO8601().withMessage('to must be an ISO 8601 date'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      const where = { status: 'PUBLISHED' };

      if (req.query.jurisdiction) {
        where.market = req.query.jurisdiction;
      }

      if (req.query.category) {
        where.category = req.query.category;
      }

      if (req.query.from || req.query.to) {
        where.publishedAt = {};
        if (req.query.from) where.publishedAt.gte = new Date(req.query.from);
        if (req.query.to) where.publishedAt.lte = new Date(req.query.to);
      }

      const [articles, total] = await Promise.all([
        req.prisma.article.findMany({
          where,
          select: {
            id: true,
            title: true,
            shortBlurb: true,
            slug: true,
            category: true,
            market: true,
            publishedAt: true,
            relevanceScore: true,
            isGlobal: true,
            sourceUrl: true,
          },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
        }),
        req.prisma.article.count({ where }),
      ]);

      res.json({
        articles,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Agent list articles error:', error);
      res.status(500).json({ error: 'Failed to list articles' });
    }
  }
);

module.exports = router;
