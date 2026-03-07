const express = require('express');
const router = express.Router();

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const result = await req.prisma.$queryRaw`
      SELECT DISTINCT category FROM articles
      WHERE status = 'PUBLISHED' AND category IS NOT NULL
      ORDER BY category ASC
    `;

    const categories = result.map((r) => r.category);

    return res.json({ categories });
  } catch (error) {
    console.error('[Categories] Error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
