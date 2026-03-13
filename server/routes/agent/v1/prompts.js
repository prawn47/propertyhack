const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { requireScope } = require('../../../middleware/agentAuth');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// GET / — List all system prompts
router.get(
  '/',
  requireScope('prompts:read'),
  async (req, res) => {
    try {
      const prompts = await req.prisma.systemPrompt.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          content: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      });

      res.json(prompts);
    } catch (error) {
      console.error('Agent list prompts error:', error);
      res.status(500).json({ error: 'Failed to list prompts' });
    }
  }
);

// GET /:name — Get prompt by name
router.get(
  '/:name',
  requireScope('prompts:read'),
  [param('name').isString().notEmpty().withMessage('name is required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const prompt = await req.prisma.systemPrompt.findFirst({
        where: { name: req.params.name },
        select: {
          id: true,
          name: true,
          description: true,
          content: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      res.json(prompt);
    } catch (error) {
      console.error('Agent get prompt error:', error);
      res.status(500).json({ error: 'Failed to get prompt' });
    }
  }
);

// PUT /:name — Update prompt content and/or description
router.put(
  '/:name',
  requireScope('prompts:write'),
  [
    param('name').isString().notEmpty().withMessage('name is required'),
    body('content').optional().isString().withMessage('content must be a string'),
    body('description').optional().isString().withMessage('description must be a string'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const existing = await req.prisma.systemPrompt.findFirst({
        where: { name: req.params.name },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      const updateData = {};
      if (req.body.content !== undefined) updateData.content = req.body.content;
      if (req.body.description !== undefined) updateData.description = req.body.description;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No writable fields provided (content, description)' });
      }

      const updated = await req.prisma.systemPrompt.update({
        where: { id: existing.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          description: true,
          content: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(updated);
    } catch (error) {
      console.error('Agent update prompt error:', error);
      res.status(500).json({ error: 'Failed to update prompt' });
    }
  }
);

module.exports = router;
