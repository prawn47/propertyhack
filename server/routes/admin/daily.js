const express = require('express');
const wizardService = require('../../services/wizardService');
const metricsService = require('../../services/metricsService');

const router = express.Router();

// GET /today — get or create today's wizard run
router.get('/today', async (req, res) => {
  try {
    const run = await wizardService.getOrCreateToday(req.prisma);
    res.json(run);
  } catch (error) {
    console.error('Get today wizard run error:', error);
    res.status(500).json({ error: 'Failed to get today\'s wizard run' });
  }
});

// PATCH /today — update today's wizard run
router.patch('/today', async (req, res) => {
  try {
    const run = await wizardService.getOrCreateToday(req.prisma);
    const updated = await wizardService.updateRun(run.id, req.body, req.prisma);
    res.json(updated);
  } catch (error) {
    console.error('Update wizard run error:', error);
    res.status(500).json({ error: 'Failed to update wizard run' });
  }
});

// POST /today/complete — mark today's run as complete
router.post('/today/complete', async (req, res) => {
  try {
    const run = await wizardService.getOrCreateToday(req.prisma);
    const completed = await wizardService.completeRun(run.id, req.prisma);
    res.json(completed);
  } catch (error) {
    console.error('Complete wizard run error:', error);
    res.status(500).json({ error: 'Failed to complete wizard run' });
  }
});

// GET /streak — streak count + calendar data for current month
router.get('/streak', async (req, res) => {
  try {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const [streak, completedDates] = await Promise.all([
      wizardService.getStreak(req.prisma),
      wizardService.getCalendarData(month, year, req.prisma),
    ]);

    res.json({
      streak,
      calendar: { month, year, completedDates },
    });
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({ error: 'Failed to get streak data' });
  }
});

// GET /metrics — aggregated metrics for the daily wizard
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getAggregatedMetrics(req.prisma);
    res.json(metrics);
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to get aggregated metrics' });
  }
});

module.exports = router;
