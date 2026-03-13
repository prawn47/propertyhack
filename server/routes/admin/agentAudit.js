const express = require('express');
const router = express.Router();

// GET / — List agent audit log entries with pagination, filterable by keyName and date range
router.get('/', async (req, res) => {
  try {
    const { keyName, from, to, page = 1, limit = 50 } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {};
    if (keyName) where.agentKeyName = keyName;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      req.prisma.agentAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      req.prisma.agentAuditLog.count({ where }),
    ]);

    res.json({
      entries,
      pagination: {
        page: Math.floor(skip / take) + 1,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('Agent audit log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
