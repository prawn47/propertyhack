const express = require('express');
const router = express.Router();

// GET /api/markets
router.get('/', async (req, res) => {
  try {
    const markets = await req.prisma.market.findMany({
      where: { isActive: true },
      select: { code: true, name: true, currency: true, flagEmoji: true },
      orderBy: { code: 'asc' },
    });

    return res.json({ markets });
  } catch (error) {
    console.error('[Markets] Error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

module.exports = router;
