const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { requireScope } = require('../../../middleware/agentAuth');
const beehiivService = require('../../../services/beehiivService');
const { newsletterGenerateQueue } = require('../../../queues/newsletterGenerateQueue');

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

// GET / — List drafts, filterable by jurisdiction, status, cadence, paginated
router.get(
  '/',
  requireScope('newsletters:read'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('jurisdiction').optional().isIn(VALID_JURISDICTIONS),
    query('status').optional().isIn(VALID_STATUSES),
    query('cadence').optional().isIn(VALID_CADENCES),
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
      if (req.query.cadence) where.cadence = req.query.cadence;

      const [drafts, total] = await Promise.all([
        req.prisma.newsletterDraft.findMany({
          where,
          skip,
          take: limit,
          orderBy: { generatedAt: 'desc' },
          select: {
            id: true,
            jurisdiction: true,
            cadence: true,
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
      console.error('Agent list newsletter drafts error:', error);
      res.status(500).json({ error: 'Failed to list newsletter drafts' });
    }
  }
);

// GET /:id — Get single draft with full content
router.get(
  '/:id',
  requireScope('newsletters:read'),
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
      console.error('Agent get newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to get newsletter draft' });
    }
  }
);

// POST /generate — Enqueue newsletter generation job
router.post(
  '/generate',
  requireScope('newsletters:generate'),
  [
    body('jurisdiction')
      .isIn(VALID_JURISDICTIONS)
      .withMessage('jurisdiction must be one of: AU, NZ, UK, US, CA'),
    body('cadence')
      .isIn(VALID_CADENCES)
      .withMessage('cadence must be one of: DAILY, EDITORIAL, WEEKLY_ROUNDUP'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { jurisdiction, cadence } = req.body;
      const job = await newsletterGenerateQueue.add('generate-newsletter', {
        jurisdiction,
        cadence,
      });

      res.status(202).json({
        jobId: job.id,
        message: `Newsletter generation queued for ${jurisdiction} (${cadence})`,
      });
    } catch (error) {
      console.error('Agent generate newsletter error:', error);
      res.status(500).json({ error: 'Failed to queue newsletter generation' });
    }
  }
);

// PUT /:id — Update draft fields
router.put(
  '/:id',
  requireScope('newsletters:write'),
  [
    param('id').isUUID(),
    body('subject').optional().isString().notEmpty().withMessage('subject cannot be empty'),
    body('htmlContent').optional().isString().notEmpty().withMessage('htmlContent cannot be empty'),
    body('textContent').optional().isString().notEmpty().withMessage('textContent cannot be empty'),
    body('globalSummary').optional().isString().notEmpty().withMessage('globalSummary cannot be empty'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.newsletterDraft.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) return res.status(404).json({ error: 'Newsletter draft not found' });

      if (existing.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Only DRAFT newsletters can be edited' });
      }

      const updateData = {};
      if (req.body.subject !== undefined) updateData.subject = req.body.subject;
      if (req.body.htmlContent !== undefined) updateData.htmlContent = req.body.htmlContent;
      if (req.body.textContent !== undefined) updateData.textContent = req.body.textContent;
      if (req.body.globalSummary !== undefined) updateData.globalSummary = req.body.globalSummary;

      const draft = await req.prisma.newsletterDraft.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json(draft);
    } catch (error) {
      console.error('Agent update newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to update newsletter draft' });
    }
  }
);

// DELETE /:id — Delete draft
router.delete(
  '/:id',
  requireScope('newsletters:write'),
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
      console.error('Agent delete newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to delete newsletter draft' });
    }
  }
);

// POST /:id/approve — DRAFT → APPROVED
router.post(
  '/:id/approve',
  requireScope('newsletters:approve'),
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
      console.error('Agent approve newsletter draft error:', error);
      res.status(500).json({ error: 'Failed to approve newsletter draft' });
    }
  }
);

// POST /:id/send — Send via Beehiiv (APPROVED → SENT)
router.post(
  '/:id/send',
  requireScope('newsletters:send'),
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
      console.error('Agent send newsletter error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
