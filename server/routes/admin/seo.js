const express = require('express');
const router = express.Router();

// ===== SEO Keywords CRUD =====

// GET /api/admin/seo/keywords
router.get('/keywords', async (req, res) => {
  try {
    const { location, category, market, national } = req.query;
    const where = {};
    if (market) where.market = market;
    if (national === 'true') where.location = null;
    else if (location) where.location = location;
    if (category) where.category = category;

    const keywords = await req.prisma.seoKeyword.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { keyword: 'asc' }],
    });
    res.json({ keywords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/seo/keywords
router.post('/keywords', async (req, res) => {
  try {
    const { keyword, market, location, category, volume, priority } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword is required' });

    const created = await req.prisma.seoKeyword.create({
      data: {
        keyword,
        market: market || null,
        location: location || null,
        category: category || null,
        volume: volume || null,
        priority: priority || 0,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/seo/keywords/bulk
router.post('/keywords/bulk', async (req, res) => {
  try {
    const { keywords, market, location, category } = req.body;
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array is required' });
    }
    const data = keywords
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter(Boolean)
      .map((keyword) => ({
        keyword,
        market: market || null,
        location: location || null,
        category: category || null,
        volume: null,
        priority: 0,
      }));
    const result = await req.prisma.seoKeyword.createMany({ data, skipDuplicates: true });
    res.status(201).json({ created: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/seo/keywords/bulk
router.delete('/keywords/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await req.prisma.seoKeyword.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/seo/keywords/:id
router.put('/keywords/:id', async (req, res) => {
  try {
    const { keyword, market, location, category, volume, priority, isActive } = req.body;
    const updated = await req.prisma.seoKeyword.update({
      where: { id: req.params.id },
      data: {
        ...(keyword !== undefined && { keyword }),
        ...(market !== undefined && { market: market || null }),
        ...(location !== undefined && { location: location || null }),
        ...(category !== undefined && { category: category || null }),
        ...(volume !== undefined && { volume }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/seo/keywords/:id
router.delete('/keywords/:id', async (req, res) => {
  try {
    await req.prisma.seoKeyword.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Location SEO CRUD =====

// GET /api/admin/seo/locations
router.get('/locations', async (req, res) => {
  try {
    const { country } = req.query;
    const where = country ? { country } : {};
    const locations = await req.prisma.locationSeo.findMany({
      where,
      orderBy: { location: 'asc' },
    });
    res.json({ locations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/seo/locations
router.post('/locations', async (req, res) => {
  try {
    const { location, slug, metaTitle, metaDescription, h1Title, introContent, focusKeywords } = req.body;
    if (!location || !slug || !metaTitle || !metaDescription || !h1Title) {
      return res.status(400).json({ error: 'location, slug, metaTitle, metaDescription, and h1Title are required' });
    }

    const created = await req.prisma.locationSeo.create({
      data: {
        location,
        slug,
        metaTitle,
        metaDescription,
        h1Title,
        introContent: introContent || null,
        focusKeywords: focusKeywords || [],
      },
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/seo/locations/:id
router.put('/locations/:id', async (req, res) => {
  try {
    const { metaTitle, metaDescription, h1Title, introContent, focusKeywords, isActive } = req.body;
    const updated = await req.prisma.locationSeo.update({
      where: { id: req.params.id },
      data: {
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(h1Title !== undefined && { h1Title }),
        ...(introContent !== undefined && { introContent }),
        ...(focusKeywords !== undefined && { focusKeywords }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
