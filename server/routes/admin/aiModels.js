const express = require('express');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

const VALID_PROVIDERS = ['gemini', 'anthropic', 'openai', 'ollama'];

const PROVIDER_MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', capabilities: ['text'] },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', capabilities: ['text'] },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', capabilities: ['text'] },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', capabilities: ['text'] },
    { id: 'gemini-2.0-flash-exp-image-generation', name: 'Gemini 2.0 Flash Exp Image Generation', capabilities: ['text', 'image'] },
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', capabilities: ['text', 'image'] },
  ],
  anthropic: [
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', capabilities: ['text'] },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', capabilities: ['text'] },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', capabilities: ['text'] },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', capabilities: ['text'] },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', capabilities: ['text'] },
  ],
  ollama: [],
};

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation error', details: errors.array() });
  }
  return null;
}

// GET /providers — list available providers, their models, and API key status
router.get('/providers', async (req, res) => {
  try {
    const providers = [
      {
        id: 'gemini',
        name: 'Google Gemini',
        keyPresent: !!process.env.GEMINI_API_KEY,
        models: PROVIDER_MODELS.gemini,
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        keyPresent: !!process.env.ANTHROPIC_API_KEY,
        models: PROVIDER_MODELS.anthropic,
      },
      {
        id: 'openai',
        name: 'OpenAI',
        keyPresent: !!process.env.OPENAI_API_KEY,
        models: PROVIDER_MODELS.openai,
      },
      {
        id: 'ollama',
        name: 'Ollama (Local)',
        keyPresent: true,
        enabled: process.env.OLLAMA_ENABLED === 'true',
        models: PROVIDER_MODELS.ollama,
      },
    ];

    res.json(providers);
  } catch (err) {
    console.error('Error listing providers:', err);
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

// GET / — list all task configs
router.get('/', async (req, res) => {
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

// GET /:task — get config for specific task
router.get('/:task', [
  param('task').notEmpty().withMessage('task is required'),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const config = await req.prisma.aiModelConfig.findUnique({
      where: { task: req.params.task },
    });

    if (!config) {
      return res.status(404).json({ error: 'Task config not found' });
    }

    res.json(config);
  } catch (err) {
    console.error('Error fetching AI model config:', err);
    res.status(500).json({ error: 'Failed to fetch AI model config' });
  }
});

// PUT /:task — update config for a task
router.put('/:task', [
  param('task').notEmpty().withMessage('task is required'),
  body('provider').isIn(VALID_PROVIDERS).withMessage(`provider must be one of: ${VALID_PROVIDERS.join(', ')}`),
  body('model').notEmpty().withMessage('model is required'),
  body('fallbackProvider').optional({ nullable: true }).isIn([...VALID_PROVIDERS, null]).withMessage(`fallbackProvider must be one of: ${VALID_PROVIDERS.join(', ')}`),
  body('fallbackModel').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const existing = await req.prisma.aiModelConfig.findUnique({
      where: { task: req.params.task },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Task config not found' });
    }

    const { provider, model, fallbackProvider, fallbackModel, isActive } = req.body;

    const updateData = { provider, model };
    if (fallbackProvider !== undefined) updateData.fallbackProvider = fallbackProvider;
    if (fallbackModel !== undefined) updateData.fallbackModel = fallbackModel;
    if (isActive !== undefined) updateData.isActive = isActive;

    const config = await req.prisma.aiModelConfig.update({
      where: { task: req.params.task },
      data: updateData,
    });

    res.json(config);
  } catch (err) {
    console.error('Error updating AI model config:', err);
    res.status(500).json({ error: 'Failed to update AI model config' });
  }
});

// POST /:task/test — test configured model with sample prompt
router.post('/:task/test', [
  param('task').notEmpty().withMessage('task is required'),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const config = await req.prisma.aiModelConfig.findUnique({
      where: { task: req.params.task },
    });

    if (!config) {
      return res.status(404).json({ error: 'Task config not found' });
    }

    // Placeholder — provider abstraction (T1.1) not yet built
    // Returns success if the API key is present for the configured provider
    const keyMap = {
      gemini: process.env.GEMINI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      ollama: process.env.OLLAMA_ENABLED === 'true' ? 'local' : null,
    };

    const key = keyMap[config.provider];
    if (!key) {
      return res.status(400).json({
        success: false,
        error: `No API key configured for provider: ${config.provider}`,
      });
    }

    res.json({
      success: true,
      message: `Provider ${config.provider} is configured. Live test available once provider abstraction is built.`,
      task: config.task,
      provider: config.provider,
      model: config.model,
    });
  } catch (err) {
    console.error('Error testing AI model config:', err);
    res.status(500).json({ error: 'Failed to test AI model config' });
  }
});

module.exports = router;
