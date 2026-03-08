const express = require('express');
const router = express.Router();

// GET /api/locations
// Optional query param: ?country=AU|US|UK|CA  — filter by market code
// Pass GLOBAL or omit to return all locations
router.get('/', async (req, res) => {
  try {
    const { country } = req.query;
    const where = { status: 'PUBLISHED', location: { not: null } };
    if (country && country !== 'GLOBAL') {
      where.market = country.toUpperCase();
    }

    const result = await req.prisma.article.findMany({
      where,
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
