const express = require('express');
const router = express.Router();

// GET /api/locations
router.get('/', async (req, res) => {
  try {
    const result = await req.prisma.article.findMany({
      where: { status: 'PUBLISHED', location: { not: null } },
      select: { location: true },
      distinct: ['location'],
      orderBy: { location: 'asc' },
    });

    const locations = result.map((r) => r.location).filter(Boolean);

    return res.json({ locations });
  } catch (error) {
    console.error('[Locations] Error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

module.exports = router;
