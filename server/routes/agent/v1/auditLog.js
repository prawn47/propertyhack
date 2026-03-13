const express = require('express');
const { query, validationResult } = require('express-validator');
const { requireScope } = require('../../../middleware/agentAuth');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// GET / — List agent audit log entries
router.get(
  '/',
  requireScope('config:read'),
  [
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt().withMessage('limit must be between 1 and 200'),
    query('keyName').optional().isString().trim().withMessage('keyName must be a string'),
    query('from').optional().isISO8601().withMessage('from must be a valid ISO 8601 date'),
    query('to').optional().isISO8601().withMessage('to must be a valid ISO 8601 date'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 50;
      const skip = (page - 1) * limit;

      const where = {};

      if (req.query.keyName) {
        where.agentKeyName = req.query.keyName;
      }

      if (req.query.from || req.query.to) {
        where.createdAt = {};
        if (req.query.from) where.createdAt.gte = new Date(req.query.from);
        if (req.query.to) where.createdAt.lte = new Date(req.query.to);
      }

      const [entries, total] = await Promise.all([
        req.prisma.agentAuditLog.findMany({
          where,
          select: {
            id: true,
            agentKeyName: true,
            method: true,
            path: true,
            requestSummary: true,
            responseStatus: true,
            durationMs: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        req.prisma.agentAuditLog.count({ where }),
      ]);

      res.json({
        entries,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Agent audit log list error:', error);
      res.status(500).json({ error: 'Failed to list audit log entries' });
    }
  }
);

module.exports = router;
