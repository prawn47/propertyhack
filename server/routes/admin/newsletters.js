const express = require('express');
const router = express.Router();
const { createPost, sendPost } = require('../../services/beehiivService');

// GET / — list newsletter drafts, filterable by jurisdiction and status
router.get('/', async (req, res) => {
  try {
    const { jurisdiction, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (jurisdiction && jurisdiction !== 'ALL') where.jurisdiction = jurisdiction;
    if (status) where.status = status;

    const [drafts, total] = await Promise.all([
      req.prisma.newsletterDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      req.prisma.newsletterDraft.count({ where }),
    ]);

    res.json({ drafts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:id — get single draft with full content
router.get('/:id', async (req, res) => {
  try {
    const draft = await req.prisma.newsletterDraft.findUnique({
      where: { id: req.params.id },
    });
    if (!draft) return res.status(404).json({ error: 'Not found' });
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — update draft subject and htmlContent
router.put('/:id', async (req, res) => {
  try {
    const { subject, htmlContent } = req.body;
    const draft = await req.prisma.newsletterDraft.update({
      where: { id: req.params.id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(htmlContent !== undefined && { htmlContent }),
      },
    });
    res.json(draft);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — delete a draft
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.newsletterDraft.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/approve — set status to APPROVED
router.post('/:id/approve', async (req, res) => {
  try {
    const draft = await req.prisma.newsletterDraft.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    res.json(draft);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/send — publish to Beehiiv and mark as SENT
router.post('/:id/send', async (req, res) => {
  try {
    const draft = await req.prisma.newsletterDraft.findUnique({
      where: { id: req.params.id },
    });
    if (!draft) return res.status(404).json({ error: 'Not found' });
    if (draft.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only APPROVED newsletters can be sent' });
    }

    const post = await createPost(draft.subject, draft.htmlContent);
    await sendPost(post.id, {
      custom_fields: [{ name: 'country', value: draft.jurisdiction }],
    });

    const updated = await req.prisma.newsletterDraft.update({
      where: { id: req.params.id },
      data: { status: 'SENT', beehiivPostId: post.id, sentAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    console.error('Send newsletter error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /generate — trigger manual newsletter generation for a jurisdiction
router.post('/generate', async (req, res) => {
  try {
    const { jurisdiction } = req.body;
    if (!jurisdiction) return res.status(400).json({ error: 'jurisdiction is required' });

    // Create a placeholder draft — actual generation will be wired in T3.5/T3.6
    const draft = await req.prisma.newsletterDraft.create({
      data: {
        jurisdiction,
        subject: `${jurisdiction} Property Newsletter — ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        htmlContent: '<p>Newsletter content will be generated here.</p>',
        articleIds: [],
        status: 'DRAFT',
      },
    });

    res.json({ message: 'Draft created', draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
