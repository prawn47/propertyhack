const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/social-config
router.get('/', async (req, res) => {
  try {
    let config = await prisma.socialConfig.findFirst();
    if (!config) {
      config = await prisma.socialConfig.create({
        data: {
          tonePrompt: 'Informative, concise, neutral news tone. Not salesy or clickbaity.',
          defaultHashtags: ['#PropertyNews', '#RealEstate'],
          minPostGapMins: 5,
          maxDelayMins: 60,
        },
      });
    }
    res.json(config);
  } catch (err) {
    console.error('[social-config] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch social config' });
  }
});

// PUT /api/admin/social-config
router.put('/',
  body('tonePrompt').optional().isString().trim().isLength({ min: 1, max: 2000 }),
  body('defaultHashtags').optional().isArray(),
  body('defaultHashtags.*').optional().isString().trim(),
  body('minPostGapMins').optional().isInt({ min: 1, max: 60 }),
  body('maxDelayMins').optional().isInt({ min: 5, max: 1440 }),
  body('fallbackImageUrl').optional({ nullable: true }).isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let config = await prisma.socialConfig.findFirst();
      const updateData = {};

      if (req.body.tonePrompt !== undefined) updateData.tonePrompt = req.body.tonePrompt;
      if (req.body.defaultHashtags !== undefined) updateData.defaultHashtags = req.body.defaultHashtags;
      if (req.body.minPostGapMins !== undefined) updateData.minPostGapMins = req.body.minPostGapMins;
      if (req.body.maxDelayMins !== undefined) updateData.maxDelayMins = req.body.maxDelayMins;
      if (req.body.fallbackImageUrl !== undefined) updateData.fallbackImageUrl = req.body.fallbackImageUrl;

      if (!config) {
        config = await prisma.socialConfig.create({ data: updateData });
      } else {
        config = await prisma.socialConfig.update({
          where: { id: config.id },
          data: updateData,
        });
      }

      res.json(config);
    } catch (err) {
      console.error('[social-config] PUT error:', err);
      res.status(500).json({ error: 'Failed to update social config' });
    }
  }
);

module.exports = router;
