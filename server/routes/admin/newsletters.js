const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const beehiivService = require('../../services/beehiivService');
const { newsletterGenerateQueue } = require('../../queues/newsletterGenerateQueue');

const router = express.Router();

const VALID_JURISDICTIONS = ['AU', 'NZ', 'UK', 'US', 'CA'];
const VALID_STATUSES = ['DRAFT', 'APPROVED', 'SENT'];
const VALID_CADENCES = ['DAILY', 'EDITORIAL', 'WEEKLY_ROUNDUP'];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// POST /generate — Trigger manual newsletter generation
router.post(
  '/generate',
  [
    body('jurisdiction')
      .isIn(VALID_JURISDICTIONS)
      .withMessage('jurisdiction must be one of: AU, NZ, UK, US, CA'),
    body('cadence')
      .optional()
      .isIn(VALID_CADENCES)
      .withMessage('cadence must be one of: DAILY, EDITORIAL, WEEKLY_ROUNDUP'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { jurisdiction, cadence = 'DAILY' } = req.body;
      const job = await newsletterGenerateQueue.add('generate-newsletter', { jurisdiction, cadence });
      res.json({ jobId: job.id, message: `Newsletter generation queued for ${jurisdiction} (${cadence})` });
    } catch (error) {
      console.error('Newsletter generate error:', error);
      res.status(500).json({ error: 'Failed to queue newsletter generation' });
    }
  }
);

// GET /history — List SENT drafts with Beehiiv stats (MUST be before /:id)
router.get(
  '/history',
  [
    query('jurisdiction').optional().isIn(VALID_JURISDICTIONS),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const where = { status: 'SENT' };
      if (req.query.jurisdiction) where.jurisdiction = req.query.jurisdiction;

      const drafts = await req.prisma.newsletterDraft.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          jurisdiction: true,
          subject: true,
          status: true,
          beehiivPostId: true,
          generatedAt: true,
          approvedAt: true,
          sentAt: true,
        },
      });

      const draftsWithStats = await Promise.all(
        drafts.map(async (draft) => {
          let stats = null;
          if (draft.beehiivPostId) {
            stats = await beehiivService.getPostStats(draft.beehiivPostId);
          }
          return { ...draft, stats };
        })
      );

      const totalSent = draftsWithStats.length;
      const draftsWithOpenRate = draftsWithStats.filter(
        (d) => d.stats && d.stats.subscribers_sent_to > 0
      );
      const avgOpenRate =
        draftsWithOpenRate.length > 0
          ? draftsWithOpenRate.reduce((sum, d) => {
              const rate = d.stats.opens / d.stats.subscribers_sent_to;
              return sum + rate;
            }, 0) / draftsWithOpenRate.length
          : null;

      const draftsWithClickRate = draftsWithStats.filter(
        (d) => d.stats && d.stats.subscribers_sent_to > 0
      );
      const avgClickRate =
        draftsWithClickRate.length > 0
          ? draftsWithClickRate.reduce((sum, d) => {
              const rate = d.stats.clicks / d.stats.subscribers_sent_to;
              return sum + rate;
            }, 0) / draftsWithClickRate.length
          : null;

      res.json({
        drafts: draftsWithStats,
        aggregate: {
          totalSent,
          avgOpenRate,
          avgClickRate,
        },
      });
    } catch (error) {
      console.error('Newsletter history error:', error);
      res.status(500).json({ error: 'Failed to load newsletter history' });
    }
  }
);

// GET / — List drafts, filterable by jurisdiction and status, paginated
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('jurisdiction').optional().isIn(VALID_JURISDICTIONS),
    query('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const where = {};
      if (req.query.jurisdiction) where.jurisdiction = req.query.jurisdiction;
      if (req.query.status) where.status = req.query.status;

      const [drafts, total] = await Promise.all([
        req.prisma.newsletterDraft.findMany({
          where,
          skip,
          take: limit,
          orderBy: { generatedAt: 'desc' },
          select: {
            id: true,
            jurisdiction: true,
            subject: true,
            status: true,
            generatedAt: true,
            approvedAt: true,
            sentAt: true,
            beehiivPostId: true,
          },
        }),
        req.prisma.newsletterDraft.count({ where }),
      ]);

      res.json({
        drafts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('List newsletter drafts error:', error);
      res.status(500).json({ error: 'Failed to list newsletter drafts' });
    }
  }
);

// GET /:id — Get single draft with full content
router.get(
  '/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const draft = await req.prisma.newsletterDraft.findUnique({
        where: { id: req.params.id },
      });

      if (!draft) return res.status(404).json({ error: 'Newsletter draft not found' });
      res.json(draft);
    } catch (error) {
      console.error('Get newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to get newsletter draft' });
    }
  }
);

// PUT /:id — Update draft subject and/or htmlContent
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('subject').optional().isString().notEmpty().withMessage('subject cannot be empty'),
    body('htmlContent').optional().isString().notEmpty().withMessage('htmlContent cannot be empty'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.newsletterDraft.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) return res.status(404).json({ error: 'Newsletter draft not found' });

      const updateData = {};
      if (req.body.subject !== undefined) updateData.subject = req.body.subject;
      if (req.body.htmlContent !== undefined) updateData.htmlContent = req.body.htmlContent;

      const draft = await req.prisma.newsletterDraft.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json(draft);
    } catch (error) {
      console.error('Update newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to update newsletter draft' });
    }
  }
);

// DELETE /:id — Delete draft
router.delete(
  '/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.newsletterDraft.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) return res.status(404).json({ error: 'Newsletter draft not found' });

      await req.prisma.newsletterDraft.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to delete newsletter draft' });
    }
  }
);

// POST /:id/approve — Set status to APPROVED
router.post(
  '/:id/approve',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.newsletterDraft.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) return res.status(404).json({ error: 'Newsletter draft not found' });

      if (existing.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Only DRAFT newsletters can be approved' });
      }

      const draft = await req.prisma.newsletterDraft.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });

      res.json(draft);
    } catch (error) {
      console.error('Approve newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to approve newsletter draft' });
    }
  }
);

// POST /:id/send-manual — Mark as SENT without calling Beehiiv (copy-paste workflow)
router.post(
  '/:id/send-manual',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.newsletterDraft.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) return res.status(404).json({ error: 'Newsletter draft not found' });

      if (existing.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Only APPROVED newsletters can be sent' });
      }

      const draft = await req.prisma.newsletterDraft.update({
        where: { id: req.params.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      res.json(draft);
    } catch (error) {
      console.error('Manual send newsletter error:', error);
      res.status(500).json({ error: 'Failed to mark newsletter as sent' });
    }
  }
);

// POST /:id/send — Publish to Beehiiv and mark as SENT
router.post(
  '/:id/send',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.newsletterDraft.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) return res.status(404).json({ error: 'Newsletter draft not found' });

      if (existing.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Only APPROVED newsletters can be sent' });
      }

      const post = await beehiivService.createPost(existing.subject, existing.htmlContent);
      await beehiivService.sendPost(post.id, {
        custom_fields: [{ name: 'country', value: existing.jurisdiction }],
      });

      const draft = await req.prisma.newsletterDraft.update({
        where: { id: req.params.id },
        data: { status: 'SENT', beehiivPostId: post.id, sentAt: new Date() },
      });

      res.json(draft);
    } catch (error) {
      console.error('Send newsletter error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
