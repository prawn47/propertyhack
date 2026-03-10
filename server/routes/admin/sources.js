const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { sourceFetchQueue } = require('../../queues/sourceFetchQueue');

const router = express.Router();

const VALID_SOURCE_TYPES = ['RSS', 'NEWSAPI_ORG', 'NEWSAPI_AI', 'PERPLEXITY', 'NEWSLETTER', 'SCRAPER', 'SOCIAL', 'MANUAL'];

function validateConfigForType(type, config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return 'config must be a valid JSON object';
  }
  switch (type) {
    case 'RSS':
      if (!config.feedUrl) return 'RSS config requires feedUrl';
      break;
    case 'NEWSAPI_ORG':
      if (!Array.isArray(config.keywords) || config.keywords.length === 0) return 'NEWSAPI_ORG config requires keywords (array)';
      break;
    case 'NEWSAPI_AI':
      if (!Array.isArray(config.keywords) || config.keywords.length === 0) return 'NEWSAPI_AI config requires keywords (array)';
      break;
    case 'PERPLEXITY':
      if (!Array.isArray(config.searchQueries) || config.searchQueries.length === 0) return 'PERPLEXITY config requires searchQueries (array)';
      break;
    case 'SCRAPER':
      if (!config.targetUrl) return 'SCRAPER config requires targetUrl';
      break;
    case 'NEWSLETTER':
      if (!config.inboundEmail) return 'NEWSLETTER config requires inboundEmail';
      break;
    case 'SOCIAL':
      if (!config.platform) return 'SOCIAL config requires platform';
      if (!config.subreddits && !config.hashtags && !config.listId) {
        return 'SOCIAL config requires at least one of: subreddits, hashtags, listId';
      }
      break;
    case 'MANUAL':
      break;
  }
  return null;
}

function normaliseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
}

function extractCanonicalKey(type, config) {
  switch (type) {
    case 'RSS':
      return config.feedUrl ? { field: 'feedUrl', value: normaliseUrl(config.feedUrl) } : null;
    case 'SCRAPER':
      return config.targetUrl ? { field: 'targetUrl', value: normaliseUrl(config.targetUrl) } : null;
    case 'NEWSLETTER':
      return config.inboundEmail ? { field: 'inboundEmail', value: config.inboundEmail.toLowerCase().trim() } : null;
    case 'NEWSAPI_ORG':
    case 'NEWSAPI_AI':
    case 'PERPLEXITY':
      // No single unique URL — skip duplicate check
      return null;
    case 'MANUAL':
    case 'SOCIAL':
      return null;
    default:
      return null;
  }
}

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation error', details: errors.array() });
  }
  return null;
}

// GET / — List all sources
router.get('/', [
  query('type').optional().isIn(VALID_SOURCE_TYPES).withMessage('Invalid source type'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const where = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

    const sources = await req.prisma.ingestionSource.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        config: true,
        market: true,
        category: true,
        schedule: true,
        isActive: true,
        lastFetchAt: true,
        lastError: true,
        errorCount: true,
        articleCount: true,
        createdAt: true,
      },
    });

    res.json(sources);
  } catch (err) {
    console.error('Error listing sources:', err);
    res.status(500).json({ error: 'Failed to list sources' });
  }
});

// POST / — Create source
router.post('/', [
  body('name').notEmpty().withMessage('name is required'),
  body('type').isIn(VALID_SOURCE_TYPES).withMessage(`type must be one of: ${VALID_SOURCE_TYPES.join(', ')}`),
  body('config').notEmpty().withMessage('config is required'),
  body('market').optional().isString(),
  body('category').optional().isString(),
  body('schedule').optional().isString(),
  body('isActive').optional().isBoolean(),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { name, type, config, market, category, schedule, isActive } = req.body;

  const configError = validateConfigForType(type, config);
  if (configError) {
    return res.status(400).json({ error: 'Validation error', details: [{ msg: configError, path: 'config' }] });
  }

  try {
    const canonical = extractCanonicalKey(type, config);
    if (canonical) {
      const existingSources = await req.prisma.ingestionSource.findMany({
        where: { type },
        select: { id: true, name: true, type: true, config: true },
      });
      const duplicate = existingSources.find((s) => {
        const val = s.config && s.config[canonical.field];
        if (!val) return false;
        const normVal = canonical.field === 'inboundEmail'
          ? val.toLowerCase().trim()
          : normaliseUrl(val);
        return normVal === canonical.value;
      });
      if (duplicate) {
        return res.status(409).json({
          duplicate: true,
          existingSource: { id: duplicate.id, name: duplicate.name, type: duplicate.type },
        });
      }
    }

    const source = await req.prisma.ingestionSource.create({
      data: {
        name,
        type,
        config,
        ...(market !== undefined && { market }),
        ...(category !== undefined && { category }),
        ...(schedule !== undefined && { schedule }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(201).json(source);
  } catch (err) {
    console.error('Error creating source:', err);
    res.status(500).json({ error: 'Failed to create source' });
  }
});

// GET /:id — Get single source with recent logs
router.get('/:id', [
  param('id').notEmpty(),
], async (req, res) => {
  try {
    const source = await req.prisma.ingestionSource.findUnique({
      where: { id: req.params.id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    res.json(source);
  } catch (err) {
    console.error('Error fetching source:', err);
    res.status(500).json({ error: 'Failed to fetch source' });
  }
});

// PUT /:id — Update source
router.put('/:id', [
  param('id').notEmpty(),
  body('name').optional().notEmpty().withMessage('name cannot be empty'),
  body('config').optional(),
  body('market').optional().isString(),
  body('category').optional().isString(),
  body('schedule').optional().isString(),
  body('isActive').optional().isBoolean(),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const existing = await req.prisma.ingestionSource.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const { name, config, market, category, schedule, isActive } = req.body;

    if (config !== undefined) {
      const configError = validateConfigForType(existing.type, config);
      if (configError) {
        return res.status(400).json({ error: 'Validation error', details: [{ msg: configError, path: 'config' }] });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (config !== undefined) updateData.config = config;
    if (market !== undefined) updateData.market = market;
    if (category !== undefined) updateData.category = category;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (isActive !== undefined) updateData.isActive = isActive;

    const source = await req.prisma.ingestionSource.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(source);
  } catch (err) {
    console.error('Error updating source:', err);
    res.status(500).json({ error: 'Failed to update source' });
  }
});

// DELETE /:id — Delete source
router.delete('/:id', [
  param('id').notEmpty(),
], async (req, res) => {
  try {
    const existing = await req.prisma.ingestionSource.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Source not found' });
    }

    await req.prisma.ingestionLog.deleteMany({ where: { sourceId: req.params.id } });
    await req.prisma.ingestionSource.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting source:', err);
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// POST /:id/fetch — Trigger immediate fetch
router.post('/:id/fetch', [
  param('id').notEmpty(),
], async (req, res) => {
  try {
    const source = await req.prisma.ingestionSource.findUnique({
      where: { id: req.params.id },
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    if (!source.isActive) {
      return res.status(400).json({ error: 'Source is not active' });
    }

    await sourceFetchQueue.add('manual-fetch', {
      sourceId: source.id,
      sourceType: source.type,
      config: source.config,
    });

    res.json({ queued: true, message: 'Fetch job queued' });
  } catch (err) {
    console.error('Error queuing fetch job:', err);
    res.status(500).json({ error: 'Failed to queue fetch job' });
  }
});

// GET /:id/logs — Get paginated ingestion logs
router.get('/:id/logs', [
  param('id').notEmpty(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const source = await req.prisma.ingestionSource.findUnique({
      where: { id: req.params.id },
    });

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      req.prisma.ingestionLog.findMany({
        where: { sourceId: req.params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      req.prisma.ingestionLog.count({ where: { sourceId: req.params.id } }),
    ]);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
