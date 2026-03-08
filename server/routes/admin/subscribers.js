const express = require('express');

const router = express.Router();

router.get('/stats', async (req, res) => {
  const prisma = req.prisma;

  try {
    const byCountryRegion = await prisma.subscriber.groupBy({
      by: ['country', 'region'],
      _count: { id: true },
      where: { unsubscribedAt: null },
      orderBy: [{ country: 'asc' }, { region: 'asc' }],
    });

    const total = await prisma.subscriber.count({ where: { unsubscribedAt: null } });
    const totalUnsubscribed = await prisma.subscriber.count({ where: { unsubscribedAt: { not: null } } });

    res.json({
      total,
      totalUnsubscribed,
      byCountryRegion: byCountryRegion.map((r) => ({
        country: r.country,
        region: r.region,
        count: r._count.id,
      })),
    });
  } catch (err) {
    console.error('Subscriber stats error:', err);
    res.status(500).json({ error: 'Failed to fetch subscriber stats' });
  }
});

router.get('/', async (req, res) => {
  const prisma = req.prisma;

  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscriber.count(),
    ]);

    const byCountry = await prisma.subscriber.groupBy({
      by: ['country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    res.json({
      subscribers,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      byCountry: byCountry.map((r) => ({ country: r.country, count: r._count.id })),
    });
  } catch (err) {
    console.error('Subscriber list error:', err);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

router.delete('/:id', async (req, res) => {
  const prisma = req.prisma;

  try {
    await prisma.subscriber.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    console.error('Subscriber delete error:', err);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

module.exports = router;
