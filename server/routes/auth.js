const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { authenticateRefreshToken, generateTokens } = require('../middleware/auth');

const router = express.Router();

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        superAdmin: true,
        createdAt: true,
      }
    });

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.superAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({ message: 'Login successful', user: userWithoutPassword, accessToken, refreshToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', authenticateRefreshToken, async (req, res) => {
  try {
    const { accessToken, refreshToken } = generateTokens(req.user.id);
    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
