const express = require('express');
const router = express.Router();

// GET /api/markets — returns active markets
router.get('/', async (req, res) => {
  try {
    const markets = await req.prisma.market.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    res.set('Cache-Control', 'public, s-maxage=86400');
    res.json(markets);
  } catch (error) {
    console.error('[Markets] Error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

module.exports = router;
