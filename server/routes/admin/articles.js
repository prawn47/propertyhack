const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { generateSlug } = require('../../utils/slug');
const { generateSocialPosts } = require('../../services/socialPostGenerationService');
const { socialGenerateQueue } = require('../../queues/socialGenerateQueue');
const { articleAuditQueue } = require('../../queues/articleAuditQueue');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

// GET / — List articles with pagination and filters
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(VALID_STATUSES),
    query('category').optional().isString(),
    query('sourceId').optional().isString(),
    query('search').optional().isString(),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('minRelevance').optional().isInt({ min: 1, max: 10 }).toInt(),
    query('maxRelevance').optional().isInt({ min: 1, max: 10 }).toInt(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'desc';

      const where = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.category) where.category = req.query.category;
      if (req.query.sourceId) where.sourceId = req.query.sourceId;
      if (req.query.search) {
        where.title = { contains: req.query.search, mode: 'insensitive' };
      }
      if (req.query.minRelevance !== undefined || req.query.maxRelevance !== undefined) {
        where.relevanceScore = {};
        if (req.query.minRelevance !== undefined) where.relevanceScore.gte = req.query.minRelevance;
        if (req.query.maxRelevance !== undefined) where.relevanceScore.lte = req.query.maxRelevance;
      }

      const [articles, total] = await Promise.all([
        req.prisma.article.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            source: { select: { id: true, name: true, type: true } },
          },
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
      console.error('List articles error:', error);
      res.status(500).json({ error: 'Failed to list articles' });
    }
  }
);

// POST /manual — Manual article entry (before /:id to avoid conflict)
router.post(
  '/manual',
  [
    body('url').optional().isURL(),
    body('title').optional().isString().notEmpty(),
    body('shortBlurb').optional().isString(),
    body('longSummary').optional().isString(),
    body('sourceUrl').optional().isURL(),
    body('category').optional().isString(),
    body('market').optional().isString(),
    body('imageUrl').optional().isURL(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { url, title, shortBlurb, longSummary, sourceUrl, category, market, imageUrl } = req.body;

      if (!url && !title) {
        return res.status(400).json({ error: 'Either url or title is required' });
      }

      let manualSource = await req.prisma.ingestionSource.findFirst({
        where: { type: 'MANUAL' },
      });

      if (!manualSource) {
        manualSource = await req.prisma.ingestionSource.create({
          data: {
            name: 'Manual Entry',
            type: 'MANUAL',
            config: {},
            market: market || 'AU',
            isActive: true,
          },
        });
      }

      let articleData;
      if (url && !title) {
        articleData = {
          sourceId: manualSource.id,
          sourceUrl: url,
          title: '',
          slug: generateSlug('manual-' + Date.now()),
          shortBlurb: '',
          longSummary: '',
          category: category || 'Uncategorised',
          market: market || 'AU',
          status: 'DRAFT',
        };
      } else {
        articleData = {
          sourceId: manualSource.id,
          sourceUrl: sourceUrl || url || '',
          title,
          slug: generateSlug(title),
          shortBlurb: shortBlurb || '',
          longSummary: longSummary || '',
          category: category || 'Uncategorised',
          market: market || 'AU',
          status: 'DRAFT',
          imageUrl: imageUrl || null,
        };
      }

      const article = await req.prisma.article.create({ data: articleData });
      res.status(201).json(article);
    } catch (error) {
      console.error('Manual article creation error:', error);
      res.status(500).json({ error: 'Failed to create article' });
    }
  }
);

// PUT /bulk — Bulk status change (before /:id to avoid conflict)
router.put(
  '/bulk',
  [
    body('ids').isArray({ min: 1 }).withMessage('ids must be a non-empty array'),
    body('ids.*').isString(),
    body('action').isIn(['publish', 'archive', 'delete']).withMessage('action must be publish, archive, or delete'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { ids, action } = req.body;

      if (action === 'delete') {
        const result = await req.prisma.article.deleteMany({ where: { id: { in: ids } } });
        return res.json({ updated: result.count });
      }

      const statusMap = { publish: 'PUBLISHED', archive: 'ARCHIVED' };
      const updateData = { status: statusMap[action] };
      if (action === 'publish') updateData.publishedAt = new Date();

      const result = await req.prisma.article.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });

      res.json({ updated: result.count });
    } catch (error) {
      console.error('Bulk action error:', error);
      res.status(500).json({ error: 'Bulk action failed' });
    }
  }
);

// POST /maintenance/regenerate-images — Re-queue articles with fallback SVGs or missing images
router.post('/maintenance/regenerate-images', async (req, res) => {
  try {
    const { articleImageQueue } = require('../../queues/articleImageQueue');

    const articles = await req.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { imageUrl: null },
          { imageUrl: { startsWith: '/images/fallbacks/' } },
        ],
      },
      select: { id: true },
    });

    for (const article of articles) {
      await articleImageQueue.add('image-article', { articleId: article.id });
    }

    res.json({ queued: articles.length });
  } catch (error) {
    console.error('Regenerate images error:', error);
    res.status(500).json({ error: 'Failed to queue image regeneration' });
  }
});

// POST /maintenance/backfill-alt-text — Enqueue a single backfill job and return its ID
router.post('/maintenance/backfill-alt-text', async (req, res) => {
  try {
    const { altTextBackfillQueue } = require('../../queues/altTextBackfillQueue');
    const job = await altTextBackfillQueue.add('backfill-alt-text', {});
    res.json({ jobId: job.id });
  } catch (error) {
    console.error('Backfill alt text error:', error);
    res.status(500).json({ error: 'Failed to start alt text backfill' });
  }
});

// GET /maintenance/backfill-alt-text/:jobId — Poll status of a backfill job
router.get('/maintenance/backfill-alt-text/:jobId', async (req, res) => {
  try {
    const { altTextBackfillQueue } = require('../../queues/altTextBackfillQueue');
    const job = await altTextBackfillQueue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const state = await job.getState();
    const progress = job.progress || { total: 0, processed: 0, failures: 0 };
    res.json({ jobId: job.id, state, ...progress });
  } catch (error) {
    console.error('Backfill alt text status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// POST /maintenance/detect-duplicate-images — Find articles sharing the same imageUrl
router.post('/maintenance/detect-duplicate-images', async (req, res) => {
  try {
    const articles = await req.prisma.article.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, title: true, imageUrl: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const byImageUrl = {};
    for (const article of articles) {
      const url = article.imageUrl;
      if (!byImageUrl[url]) byImageUrl[url] = [];
      byImageUrl[url].push(article);
    }

    const duplicates = Object.entries(byImageUrl)
      .filter(([, group]) => group.length >= 2)
      .map(([imageUrl, group]) => ({ imageUrl, articles: group }));

    const totalAffected = duplicates.reduce((sum, d) => sum + d.articles.length, 0);

    res.json({
      duplicateImageUrls: duplicates.length,
      totalAffectedArticles: totalAffected,
      duplicates,
    });
  } catch (error) {
    console.error('Detect duplicate images error:', error);
    res.status(500).json({ error: 'Failed to detect duplicate images' });
  }
});
// POST /maintenance/audit-relevance — Enqueue BullMQ job to score DRAFT articles without relevanceScore
router.post(
  '/maintenance/audit-relevance',
  [
    body('limit').optional().isInt({ min: 1, max: 10000 }).toInt(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await articleAuditQueue.getJobs(['active', 'waiting', 'delayed']);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'An audit job is already running or queued', jobId: existing[0].id });
      }

      const job = await articleAuditQueue.add('audit-relevance', {
        limit: req.body.limit || 0,
      });

      res.json({ jobId: job.id });
    } catch (error) {
      console.error('Audit relevance enqueue error:', error);
      res.status(500).json({ error: 'Failed to enqueue audit job' });
    }
  }
);

// GET /maintenance/audit-relevance/:jobId — Poll progress of an audit job
router.get(
  '/maintenance/audit-relevance/:jobId',
  [param('jobId').isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const job = await articleAuditQueue.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const state = await job.getState();
      const progress = job.progress || {};
      const result = state === 'completed' ? job.returnvalue : null;
      const failedReason = state === 'failed' ? job.failedReason : null;

      res.json({ jobId: job.id, state, progress, result, failedReason });
    } catch (error) {
      console.error('Audit relevance status error:', error);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  }
);

// POST /maintenance/cleanup-drafts — Delete DRAFT articles with no title and no summary
router.post('/maintenance/cleanup-drafts', async (req, res) => {
  try {
    const targets = await req.prisma.$queryRaw`
      SELECT id FROM articles
      WHERE status = 'DRAFT'
        AND (title IS NULL OR trim(title) = '')
        AND (short_blurb IS NULL OR trim(short_blurb) = '')
    `;

    let deletedCount = 0;
    if (targets.length > 0) {
      const ids = targets.map(r => r.id);
      const result = await req.prisma.article.deleteMany({
        where: { id: { in: ids } },
      });
      deletedCount = result.count;
    }

    const remainingDrafts = await req.prisma.article.count({
      where: { status: 'DRAFT' },
    });

    res.json({ deletedCount, remainingDrafts });
  } catch (error) {
    console.error('Cleanup drafts error:', error);
    res.status(500).json({ error: 'Failed to clean up draft articles' });
  }
});

// POST /:id/regenerate-image — Re-queue a single article for image regeneration
router.post(
  '/:id/regenerate-image',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { articleImageQueue } = require('../../queues/articleImageQueue');

      const article = await req.prisma.article.findUnique({ where: { id: req.params.id } });
      if (!article) return res.status(404).json({ error: 'Article not found' });

      await req.prisma.article.update({
        where: { id: req.params.id },
        data: { imageUrl: null, imageAltText: null, imageGenerationFailed: false },
      });

      await articleImageQueue.add('image-article', { articleId: req.params.id });

      res.json({ success: true, message: 'Image regeneration queued' });
    } catch (error) {
      console.error('Regenerate image error:', error);
      res.status(500).json({ error: 'Failed to queue image regeneration' });
    }
  }
);
// GET /:id — Get single article
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const article = await req.prisma.article.findUnique({
        where: { id: req.params.id },
        include: { source: true },
      });

      if (!article) return res.status(404).json({ error: 'Article not found' });
      res.json(article);
    } catch (error) {
      console.error('Get article error:', error);
      res.status(500).json({ error: 'Failed to get article' });
    }
  }
);

// PUT /:id — Update article
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('title').optional().notEmpty().withMessage('title cannot be empty'),
    body('status').optional().isIn(VALID_STATUSES).withMessage('Invalid status'),
    body('shortBlurb').optional().isString(),
    body('longSummary').optional().isString(),
    body('category').optional().isString(),
    body('location').optional().isString(),
    body('market').optional().isString(),
    body('isFeatured').optional().isBoolean(),
    body('isEvergreen').optional().isBoolean(),
    body('isGlobal').optional().isBoolean(),
    body('imageUrl').optional({ nullable: true }).isURL(),
    body('imageAltText').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.article.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Article not found' });

      const { title, shortBlurb, longSummary, category, location, market, isFeatured, isEvergreen, isGlobal, status, imageUrl, imageAltText } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (shortBlurb !== undefined) updateData.shortBlurb = shortBlurb;
      if (longSummary !== undefined) updateData.longSummary = longSummary;
      if (category !== undefined) updateData.category = category;
      if (location !== undefined) updateData.location = location;
      if (market !== undefined) updateData.market = market;
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
      if (isEvergreen !== undefined) updateData.isEvergreen = isEvergreen;
      if (isGlobal !== undefined) updateData.isGlobal = isGlobal;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'PUBLISHED' && !existing.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (imageAltText !== undefined) updateData.imageAltText = imageAltText;

      const needsReembedding =
        (shortBlurb !== undefined && shortBlurb !== existing.shortBlurb) ||
        (longSummary !== undefined && longSummary !== existing.longSummary);

      const article = await req.prisma.article.update({
        where: { id: req.params.id },
        data: updateData,
        include: { source: { select: { id: true, name: true, type: true } } },
      });

      if (req.body.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
        try {
          await socialGenerateQueue.add('social-generate', { articleId: article.id });
          console.log(`[admin-articles] Queued social posts for manually published article: ${article.id}`);
        } catch (err) {
          console.error(`[admin-articles] Failed to queue social generation:`, err.message);
        }
      }

      res.json({ ...article, needsReembedding });
    } catch (error) {
      console.error('Update article error:', error);
      res.status(500).json({ error: 'Failed to update article' });
    }
  }
);

// DELETE /:id — Archive article
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.article.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Article not found' });

      await req.prisma.article.update({
        where: { id: req.params.id },
        data: { status: 'ARCHIVED' },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Archive article error:', error);
      res.status(500).json({ error: 'Failed to archive article' });
    }
  }
);

const VALID_PLATFORMS = ['twitter', 'facebook', 'linkedin', 'instagram'];

// POST /:id/generate-social-posts — AI-generate social posts for an article
router.post(
  '/:id/generate-social-posts',
  [
    param('id').isString().notEmpty(),
    body('platforms').optional().isArray(),
    body('platforms.*').optional().isIn(VALID_PLATFORMS),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const platforms = req.body.platforms && req.body.platforms.length > 0
        ? req.body.platforms
        : VALID_PLATFORMS;

      const article = await req.prisma.article.findUnique({
        where: { id: req.params.id },
        select: { id: true, title: true, shortBlurb: true, longSummary: true, sourceUrl: true, category: true, imageUrl: true },
      });

      if (!article) return res.status(404).json({ error: 'Article not found' });

      const generated = await generateSocialPosts(article, platforms);

      if (!generated) {
        return res.status(500).json({ error: 'Social post generation failed — AI service unavailable' });
      }

      const createPromises = platforms
        .filter((platform) => generated[platform])
        .map((platform) =>
          req.prisma.socialPost.create({
            data: {
              content: generated[platform],
              platforms: [platform],
              articleId: article.id,
              imageUrl: article.imageUrl || null,
              status: 'DRAFT',
            },
          })
        );

      const posts = await Promise.all(createPromises);

      res.status(201).json({ posts });
    } catch (error) {
      console.error('Generate social posts error:', error);
      res.status(500).json({ error: 'Failed to generate social posts' });
    }
  }
);

module.exports = router;
