const express = require('express');
const { body, param, validationResult } = require('express-validator');
const agentKeyService = require('../../services/agentKeyService');

const router = express.Router();

const VALID_SCOPES = [
  'newsletters:read',
  'newsletters:write',
  'newsletters:generate',
  'newsletters:approve',
  'newsletters:send',
  'prompts:read',
  'prompts:write',
  'config:read',
  'config:write',
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// GET / — List all keys (without keyHash)
router.get('/', async (req, res) => {
  try {
    const keys = await agentKeyService.listKeys();
    res.json(keys);
  } catch (error) {
    console.error('List agent keys error:', error);
    res.status(500).json({ error: 'Failed to list agent keys' });
  }
});

// POST / — Create a new key
router.post(
  '/',
  [
    body('name').isString().notEmpty().withMessage('name is required'),
    body('scopes')
      .isArray({ min: 1 })
      .withMessage('scopes must be a non-empty array'),
    body('scopes.*')
      .isIn(VALID_SCOPES)
      .withMessage(`each scope must be one of: ${VALID_SCOPES.join(', ')}`),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('expiresAt must be a valid ISO 8601 date string'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, scopes, expiresAt } = req.body;
      const result = await agentKeyService.createKey(
        name,
        scopes,
        expiresAt ? new Date(expiresAt) : undefined
      );
      res.status(201).json(result);
    } catch (error) {
      console.error('Create agent key error:', error);
      res.status(500).json({ error: 'Failed to create agent key' });
    }
  }
);

// DELETE /:id — Revoke a key
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      await agentKeyService.revokeKey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Revoke agent key error:', error);
      res.status(500).json({ error: 'Failed to revoke agent key' });
    }
  }
);

module.exports = router;
