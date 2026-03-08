const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { socialPublishQueue } = require('../../queues/socialPublishQueue');
const { previewAll } = require('../../services/social');

const router = express.Router();

const VALID_PLATFORMS = ['twitter', 'facebook', 'linkedin', 'instagram'];
const EDITABLE_STATUSES = ['DRAFT', 'SCHEDULED'];

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation error', details: errors.array() });
    return true;
  }
  return false;
}

// GET /stats — Quick stats (must be before /:id route)
router.get('/stats', async (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [weeklyCount, monthlyCount, failedCount, platformCounts] = await Promise.all([
    req.prisma.socialPost.count({ where: { status: 'PUBLISHED', publishedAt: { gte: weekAgo } } }),
    req.prisma.socialPost.count({ where: { status: 'PUBLISHED', publishedAt: { gte: monthAgo } } }),
    req.prisma.socialPost.count({ where: { status: 'FAILED' } }),
    req.prisma.socialPost.groupBy({ by: ['platform'], where: { status: 'PUBLISHED', publishedAt: { gte: weekAgo } }, _count: true }),
  ]);

  res.json({
    thisWeek: weeklyCount,
    thisMonth: monthlyCount,
    failed: failedCount,
    byPlatform: Object.fromEntries(platformCounts.map(p => [p.platform, p._count])),
  });
});

// GET / — List social posts with pagination and filters
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'PENDING_APPROVAL']),
    query('platform').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('search').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const andClauses = [];
    if (req.query.status) andClauses.push({ status: req.query.status });
    if (req.query.platform) andClauses.push({ platform: req.query.platform });
    if (req.query.dateFrom || req.query.dateTo) {
      const createdAt = {};
      if (req.query.dateFrom) createdAt.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) createdAt.lte = new Date(req.query.dateTo);
      andClauses.push({ createdAt });
    }
    if (req.query.search) {
      const search = req.query.search;
      andClauses.push({
        OR: [
          { content: { contains: search, mode: 'insensitive' } },
          { headline: { contains: search, mode: 'insensitive' } },
          { article: { title: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    const [posts, total] = await Promise.all([
      req.prisma.socialPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          article: { select: { id: true, title: true, slug: true } },
        },
      }),
      req.prisma.socialPost.count({ where }),
    ]);

    res.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }
);

// POST / — Create social post
router.post(
  '/',
  [
    body('content').notEmpty().withMessage('Content is required'),
    body('platforms')
      .isArray({ min: 1 })
      .withMessage('Platforms must be a non-empty array')
      .custom((platforms) => {
        const invalid = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
        if (invalid.length > 0) {
          throw new Error(`Invalid platforms: ${invalid.join(', ')}. Valid: ${VALID_PLATFORMS.join(', ')}`);
        }
        return true;
      }),
    body('imageUrl').optional().isURL().withMessage('imageUrl must be a valid URL'),
    body('articleId').optional().isString(),
    body('scheduledFor').optional().isISO8601().withMessage('scheduledFor must be a valid ISO 8601 date'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { content, imageUrl, platforms, articleId, scheduledFor } = req.body;

    if (articleId) {
      const article = await req.prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
      if (!article) {
        return res.status(400).json({ error: 'Article not found' });
      }
    }

    const status = scheduledFor ? 'SCHEDULED' : 'DRAFT';

    const post = await req.prisma.socialPost.create({
      data: {
        content,
        imageUrl: imageUrl || null,
        platforms,
        articleId: articleId || null,
        status,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
      include: {
        article: { select: { id: true, title: true, slug: true } },
      },
    });

    res.status(201).json(post);
  }
);

// POST /:id/retry — Retry a failed post
router.post('/:id/retry', async (req, res) => {
  const post = await req.prisma.socialPost.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.status !== 'FAILED') return res.status(400).json({ error: 'Only failed posts can be retried' });

  await req.prisma.socialPost.update({
    where: { id: post.id },
    data: { status: 'SCHEDULED', retryCount: { increment: 1 }, errorReason: null },
  });

  await socialPublishQueue.add('social-publish', { postId: post.id });
  res.json({ message: 'Post queued for retry' });
});

// POST /:id/approve — Approve a pending post
router.post('/:id/approve', async (req, res) => {
  const post = await req.prisma.socialPost.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Only pending posts can be approved' });

  const scheduledFor = post.scheduledFor || new Date(Date.now() + 5 * 60 * 1000);
  const delay = Math.max(0, scheduledFor.getTime() - Date.now());

  await req.prisma.socialPost.update({
    where: { id: post.id },
    data: { status: 'SCHEDULED', scheduledFor },
  });

  await socialPublishQueue.add('social-publish', { postId: post.id }, { delay });
  res.json({ message: 'Post approved and scheduled' });
});

// GET /:id — Get single social post
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const post = await req.prisma.socialPost.findUnique({
      where: { id: req.params.id },
      include: {
        article: { select: { id: true, title: true, slug: true, imageUrl: true, status: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Social post not found' });
    }

    res.json(post);
  }
);

// PUT /:id — Update social post
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('content').optional().notEmpty().withMessage('Content cannot be empty'),
    body('platforms')
      .optional()
      .isArray({ min: 1 })
      .withMessage('Platforms must be a non-empty array')
      .custom((platforms) => {
        if (!platforms) return true;
        const invalid = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
        if (invalid.length > 0) {
          throw new Error(`Invalid platforms: ${invalid.join(', ')}`);
        }
        return true;
      }),
    body('imageUrl').optional({ nullable: true }).custom((v) => {
      if (v === null || v === '') return true;
      const url = new URL(v);
      return !!url;
    }).withMessage('imageUrl must be a valid URL or null'),
    body('articleId').optional({ nullable: true }).isString(),
    body('scheduledFor').optional({ nullable: true }).custom((v) => {
      if (v === null) return true;
      if (isNaN(Date.parse(v))) throw new Error('scheduledFor must be a valid ISO 8601 date');
      return true;
    }),
    body('status').optional().isIn(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED']),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const existing = await req.prisma.socialPost.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Social post not found' });
    }

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return res.status(400).json({ error: `Cannot edit a post with status ${existing.status}` });
    }

    const { content, imageUrl, platforms, articleId, scheduledFor, status } = req.body;

    if (articleId !== undefined && articleId !== null) {
      const article = await req.prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
      if (!article) {
        return res.status(400).json({ error: 'Article not found' });
      }
    }

    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (platforms !== undefined) updateData.platforms = platforms;
    if (articleId !== undefined) updateData.articleId = articleId;
    if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    if (status !== undefined) updateData.status = status;

    const post = await req.prisma.socialPost.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        article: { select: { id: true, title: true, slug: true } },
      },
    });

    res.json(post);
  }
);

// DELETE /:id — Delete social post
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const existing = await req.prisma.socialPost.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Social post not found' });
    }

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return res.status(400).json({ error: `Cannot delete a post with status ${existing.status}` });
    }

    await req.prisma.socialPost.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  }
);

// POST /:id/publish — Publish social post
router.post(
  '/:id/publish',
  [param('id').isString().notEmpty()],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const existing = await req.prisma.socialPost.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Social post not found' });
    }

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return res.status(400).json({ error: `Cannot publish a post with status ${existing.status}` });
    }

    await socialPublishQueue.add('publish-post', { postId: req.params.id });

    res.json({ queued: true, postId: req.params.id });
  }
);

// POST /preview — Preview post on selected platforms
router.post(
  '/preview',
  [
    body('content').notEmpty().withMessage('Content is required'),
    body('platforms')
      .isArray({ min: 1 })
      .withMessage('Platforms must be a non-empty array')
      .custom((platforms) => {
        const invalid = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
        if (invalid.length > 0) {
          throw new Error(`Invalid platforms: ${invalid.join(', ')}. Valid: ${VALID_PLATFORMS.join(', ')}`);
        }
        return true;
      }),
    body('imageUrl').optional().isURL().withMessage('imageUrl must be a valid URL'),
  ],
  (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { content, imageUrl, platforms } = req.body;
    const previews = previewAll({ content, imageUrl }, platforms);
    res.json({ previews });
  }
);

module.exports = router;
