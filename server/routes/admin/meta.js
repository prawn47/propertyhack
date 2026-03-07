const express = require('express');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation error', details: errors.array() });
  }
  return null;
}

// GET / — List all system prompts
router.get('/', async (req, res) => {
  try {
    const prompts = await req.prisma.systemPrompt.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(prompts);
  } catch (err) {
    console.error('Error listing prompts:', err);
    res.status(500).json({ error: 'Failed to list prompts' });
  }
});

// POST / — Create system prompt
router.post('/', [
  body('name').notEmpty().withMessage('name is required'),
  body('description').notEmpty().withMessage('description is required'),
  body('content').notEmpty().withMessage('content is required'),
  body('isActive').optional().isBoolean(),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { name, description, content, isActive } = req.body;

  try {
    const prompt = await req.prisma.systemPrompt.create({
      data: {
        name,
        description,
        content,
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.status(201).json(prompt);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A prompt with that name already exists' });
    }
    console.error('Error creating prompt:', err);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// GET /:id — Get single system prompt
router.get('/:id', [
  param('id').notEmpty(),
], async (req, res) => {
  try {
    const prompt = await req.prisma.systemPrompt.findUnique({
      where: { id: req.params.id },
    });

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json(prompt);
  } catch (err) {
    console.error('Error fetching prompt:', err);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// PUT /:id — Update system prompt
router.put('/:id', [
  param('id').notEmpty(),
  body('content').optional().notEmpty().withMessage('content cannot be empty'),
  body('description').optional().notEmpty().withMessage('description cannot be empty'),
  body('isActive').optional().isBoolean(),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const existing = await req.prisma.systemPrompt.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const { content, description, isActive } = req.body;
    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const prompt = await req.prisma.systemPrompt.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(prompt);
  } catch (err) {
    console.error('Error updating prompt:', err);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

module.exports = router;
