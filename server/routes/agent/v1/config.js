const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireScope } = require('../../../middleware/agentAuth');
const aiProviderService = require('../../../services/aiProviderService');

const router = express.Router();

const VALID_PROVIDERS = ['gemini', 'anthropic', 'openai', 'ollama'];

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation error', details: errors.array() });
  }
  return null;
}

// GET /ai-models — list all AiModelConfig records
router.get('/ai-models', requireScope('config:read'), async (req, res) => {
  try {
    const configs = await req.prisma.aiModelConfig.findMany({
      orderBy: { task: 'asc' },
    });
    res.json(configs);
  } catch (err) {
    console.error('Error listing AI model configs:', err);
    res.status(500).json({ error: 'Failed to list AI model configs' });
  }
});

// PUT /ai-models/:task — update or create model config for a task
router.put('/ai-models/:task', [
  requireScope('config:write'),
  param('task').notEmpty().withMessage('task is required'),
  body('provider').isIn(VALID_PROVIDERS).withMessage(`provider must be one of: ${VALID_PROVIDERS.join(', ')}`),
  body('model').notEmpty().withMessage('model is required'),
  body('fallbackProvider').optional({ nullable: true }).isIn([...VALID_PROVIDERS, null]).withMessage(`fallbackProvider must be one of: ${VALID_PROVIDERS.join(', ')}`),
  body('fallbackModel').optional({ nullable: true }).isString(),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const { provider, model, fallbackProvider, fallbackModel } = req.body;

    const config = await req.prisma.aiModelConfig.upsert({
      where: { task: req.params.task },
      update: {
        provider,
        model,
        ...(fallbackProvider !== undefined && { fallbackProvider }),
        ...(fallbackModel !== undefined && { fallbackModel }),
      },
      create: {
        task: req.params.task,
        provider,
        model,
        fallbackProvider: fallbackProvider || null,
        fallbackModel: fallbackModel || null,
      },
    });

    aiProviderService.invalidateConfigCache(req.params.task);

    res.json(config);
  } catch (err) {
    console.error('Error updating AI model config:', err);
    res.status(500).json({ error: 'Failed to update AI model config' });
  }
});

// GET /generation-params — get NewsletterGenerationConfig singleton
router.get('/generation-params', requireScope('config:read'), async (req, res) => {
  try {
    const config = await req.prisma.newsletterGenerationConfig.findFirst();

    if (!config) {
      return res.json({
        dailyArticleLimit: 20,
        editorialArticleLimit: 50,
        roundupArticleLimit: 30,
        globalArticleLimit: 3,
        historicalLookbackDays: 90,
        similarityThreshold: 0.4,
        editorialMinWordCount: 1500,
        roundupDaysWindow: 6,
      });
    }

    res.json(config);
  } catch (err) {
    console.error('Error fetching generation params:', err);
    res.status(500).json({ error: 'Failed to fetch generation params' });
  }
});

// PUT /generation-params — update generation params singleton
router.put('/generation-params', [
  requireScope('config:write'),
  body('dailyArticleLimit').optional().isInt({ min: 1 }).withMessage('dailyArticleLimit must be a positive integer'),
  body('editorialArticleLimit').optional().isInt({ min: 1 }).withMessage('editorialArticleLimit must be a positive integer'),
  body('roundupArticleLimit').optional().isInt({ min: 1 }).withMessage('roundupArticleLimit must be a positive integer'),
  body('globalArticleLimit').optional().isInt({ min: 0 }).withMessage('globalArticleLimit must be a non-negative integer'),
  body('historicalLookbackDays').optional().isInt({ min: 1 }).withMessage('historicalLookbackDays must be a positive integer'),
  body('similarityThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('similarityThreshold must be between 0 and 1'),
  body('editorialMinWordCount').optional().isInt({ min: 100 }).withMessage('editorialMinWordCount must be at least 100'),
  body('roundupDaysWindow').optional().isInt({ min: 1 }).withMessage('roundupDaysWindow must be a positive integer'),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const {
      dailyArticleLimit,
      editorialArticleLimit,
      roundupArticleLimit,
      globalArticleLimit,
      historicalLookbackDays,
      similarityThreshold,
      editorialMinWordCount,
      roundupDaysWindow,
    } = req.body;

    const updateData = {};
    if (dailyArticleLimit !== undefined) updateData.dailyArticleLimit = dailyArticleLimit;
    if (editorialArticleLimit !== undefined) updateData.editorialArticleLimit = editorialArticleLimit;
    if (roundupArticleLimit !== undefined) updateData.roundupArticleLimit = roundupArticleLimit;
    if (globalArticleLimit !== undefined) updateData.globalArticleLimit = globalArticleLimit;
    if (historicalLookbackDays !== undefined) updateData.historicalLookbackDays = historicalLookbackDays;
    if (similarityThreshold !== undefined) updateData.similarityThreshold = similarityThreshold;
    if (editorialMinWordCount !== undefined) updateData.editorialMinWordCount = editorialMinWordCount;
    if (roundupDaysWindow !== undefined) updateData.roundupDaysWindow = roundupDaysWindow;

    const existing = await req.prisma.newsletterGenerationConfig.findFirst();

    let config;
    if (existing) {
      config = await req.prisma.newsletterGenerationConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      config = await req.prisma.newsletterGenerationConfig.create({
        data: updateData,
      });
    }

    res.json(config);
  } catch (err) {
    console.error('Error updating generation params:', err);
    res.status(500).json({ error: 'Failed to update generation params' });
  }
});

module.exports = router;
