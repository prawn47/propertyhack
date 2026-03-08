const express = require('express');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();

const CALCULATOR_TYPES = ['MORTGAGE', 'STAMP_DUTY', 'RENTAL_YIELD', 'BORROWING_POWER', 'RENT_VS_BUY'];

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
};

// GET /api/scenarios — list user's scenarios
router.get(
  '/',
  [
    query('type').optional().isIn(CALCULATOR_TYPES).withMessage('Invalid calculator type'),
    query('search').optional().isString().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { type, search } = req.query;

      const where = { userId: req.user.id };
      if (type) where.calculatorType = type;
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const scenarios = await req.prisma.savedScenario.findMany({
        where,
        select: {
          id: true,
          name: true,
          calculatorType: true,
          headlineLabel: true,
          headlineValue: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(scenarios);
    } catch (err) {
      console.error('GET /api/scenarios error:', err);
      res.status(500).json({ error: 'Failed to fetch scenarios' });
    }
  }
);

// POST /api/scenarios — create scenario
router.post(
  '/',
  [
    body('name').notEmpty().isString().trim().isLength({ max: 200 }).withMessage('Name is required and must be at most 200 characters'),
    body('calculatorType').isIn(CALCULATOR_TYPES).withMessage('Invalid calculator type'),
    body('inputs').notEmpty().isObject().withMessage('inputs must be an object'),
    body('outputs').notEmpty().isObject().withMessage('outputs must be an object'),
    body('headlineLabel').notEmpty().isString().withMessage('headlineLabel is required'),
    body('headlineValue').notEmpty().isString().withMessage('headlineValue is required'),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const count = await req.prisma.savedScenario.count({
        where: { userId: req.user.id },
      });

      if (count >= 100) {
        return res.status(429).json({ error: 'Scenario limit reached. Maximum 100 scenarios per user.' });
      }

      const { name, calculatorType, inputs, outputs, headlineLabel, headlineValue } = req.body;

      const scenario = await req.prisma.savedScenario.create({
        data: {
          userId: req.user.id,
          name,
          calculatorType,
          inputs,
          outputs,
          headlineLabel,
          headlineValue,
        },
      });

      res.status(201).json(scenario);
    } catch (err) {
      console.error('POST /api/scenarios error:', err);
      res.status(500).json({ error: 'Failed to create scenario' });
    }
  }
);

// GET /api/scenarios/:id — get single scenario
router.get('/:id', async (req, res) => {
  try {
    const scenario = await req.prisma.savedScenario.findUnique({
      where: { id: req.params.id },
    });

    if (!scenario || scenario.userId !== req.user.id) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(scenario);
  } catch (err) {
    console.error('GET /api/scenarios/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

// PUT /api/scenarios/:id — rename scenario
router.put(
  '/:id',
  [
    body('name').notEmpty().isString().trim().isLength({ max: 200 }).withMessage('Name is required and must be at most 200 characters'),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const existing = await req.prisma.savedScenario.findUnique({
        where: { id: req.params.id },
      });

      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: 'Scenario not found' });
      }

      const updated = await req.prisma.savedScenario.update({
        where: { id: req.params.id },
        data: { name: req.body.name },
      });

      res.json(updated);
    } catch (err) {
      console.error('PUT /api/scenarios/:id error:', err);
      res.status(500).json({ error: 'Failed to update scenario' });
    }
  }
);

// POST /api/scenarios/:id/duplicate — duplicate scenario
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await req.prisma.savedScenario.findUnique({
      where: { id: req.params.id },
    });

    if (!original || original.userId !== req.user.id) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    const count = await req.prisma.savedScenario.count({
      where: { userId: req.user.id },
    });

    if (count >= 100) {
      return res.status(429).json({ error: 'Scenario limit reached. Maximum 100 scenarios per user.' });
    }

    const copy = await req.prisma.savedScenario.create({
      data: {
        userId: req.user.id,
        name: `${original.name} (copy)`,
        calculatorType: original.calculatorType,
        inputs: original.inputs,
        outputs: original.outputs,
        headlineLabel: original.headlineLabel,
        headlineValue: original.headlineValue,
      },
    });

    res.status(201).json(copy);
  } catch (err) {
    console.error('POST /api/scenarios/:id/duplicate error:', err);
    res.status(500).json({ error: 'Failed to duplicate scenario' });
  }
});

// DELETE /api/scenarios/:id — delete scenario
router.delete('/:id', async (req, res) => {
  try {
    const existing = await req.prisma.savedScenario.findUnique({
      where: { id: req.params.id },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    await req.prisma.savedScenario.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/scenarios/:id error:', err);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

module.exports = router;
