const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const router = express.Router();

const VALID_JURISDICTIONS = ['AU', 'NZ', 'UK', 'US', 'CA'];
const VALID_STATUSES = ['DRAFT', 'APPROVED', 'SENT'];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// POST /generate — Trigger manual newsletter generation (placeholder)
router.post(
  '/generate',
  [
    body('jurisdiction')
      .isIn(VALID_JURISDICTIONS)
      .withMessage('jurisdiction must be one of: AU, NZ, UK, US, CA'),
  ],
  handleValidationErrors,
  async (req, res) => {
    res.status(501).json({ error: 'Newsletter generation not yet implemented' });
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
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
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

module.exports = router;
