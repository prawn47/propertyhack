'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const beehiivService = require('../../services/beehiivService');

// GET /api/user/profile
router.get('/profile', async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        googleId: true,
        avatarUrl: true,
        emailVerified: true,
        newsletterOptIn: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { savedScenarios: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { _count, ...userFields } = user;
    res.json({ ...userFields, scenarioCount: _count.savedScenarios });
  } catch (err) {
    console.error('GET /profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/user/profile
const updateProfileValidation = [
  body('displayName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  body('preferences.defaultLocation')
    .optional()
    .isString()
    .trim()
    .withMessage('defaultLocation must be a string'),
  body('preferences.defaultCategories')
    .optional()
    .isArray()
    .withMessage('defaultCategories must be an array'),
  body('preferences.defaultCategories.*')
    .optional()
    .isString()
    .withMessage('Each category must be a string'),
  body('preferences.defaultDateRange')
    .optional()
    .isString()
    .isIn(['all', 'today', 'week', 'month'])
    .withMessage('defaultDateRange must be one of: all, today, week, month'),
];

router.put('/profile', updateProfileValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { displayName, preferences } = req.body;

  const updateData = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (preferences !== undefined) {
    const existingUser = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { preferences: true },
    });
    const existing = existingUser?.preferences || {};
    updateData.preferences = { ...existing, ...preferences };
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const updated = await req.prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        newsletterOptIn: true,
        preferences: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('PUT /profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/user/profile/password
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

router.put('/profile/password', changePasswordValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Password change is not available for Google-only accounts' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('PUT /profile/password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// PUT /api/user/profile/newsletter
const newsletterValidation = [
  body('optIn').isBoolean().withMessage('optIn must be a boolean'),
];

router.put('/profile/newsletter', newsletterValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { optIn } = req.body;

  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });

    if (optIn) {
      await beehiivService.subscribe(user.email);
    } else {
      await beehiivService.unsubscribe(user.email);
    }

    const updated = await req.prisma.user.update({
      where: { id: req.user.id },
      data: { newsletterOptIn: optIn },
      select: { id: true, newsletterOptIn: true },
    });

    res.json(updated);
  } catch (err) {
    console.error('PUT /profile/newsletter error:', err);
    res.status(500).json({ error: 'Failed to update newsletter preference' });
  }
});

// DELETE /api/user/profile
const deleteAccountValidation = [
  body('confirmation')
    .equals('DELETE')
    .withMessage('Confirmation must be the string "DELETE"'),
];

router.delete('/profile', deleteAccountValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, newsletterOptIn: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.newsletterOptIn) {
      await beehiivService.unsubscribe(user.email);
    }

    // Cascade delete handles SavedScenarios via Prisma relation
    await req.prisma.user.delete({ where: { id: req.user.id } });

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('DELETE /profile error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
