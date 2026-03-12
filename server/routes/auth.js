const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateRefreshToken, generateTokens } = require('../middleware/auth');
const passport = require('../passport');
const emailService = require('../services/emailService');
const beehiivService = require('../services/beehiivService');

const router = express.Router();

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sensitiveOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation chains
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Display name must be 1–100 characters'),
  body('newsletterOptIn').optional().isBoolean().withMessage('newsletterOptIn must be boolean'),
];

const verifyEmailValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otpCode').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit code'),
];

const resendOtpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otpCode').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be a 6-digit code'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Generate a random 6-digit OTP
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /register
router.post('/register', authLimiter, registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, displayName, newsletterOptIn = false } = req.body;

    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otpCode = generateOtp();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await req.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || null,

        emailVerified: false,
        otpCode: otpHash,
        otpExpiresAt,
        otpPurpose: 'verification',
        newsletterOptIn: Boolean(newsletterOptIn),
      },
      select: {
        id: true,
        email: true,
        displayName: true,

        emailVerified: true,
        newsletterOptIn: true,
        avatarUrl: true,
        preferences: true,
        createdAt: true,
      },
    });

    // Send welcome + verification OTP emails (non-blocking failures)
    try {
      await emailService.sendVerificationEmail(email, otpCode);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    // Subscribe to newsletter if opted in
    if (newsletterOptIn) {
      beehiivService.subscribe(email).catch((err) =>
        console.error('Beehiiv subscribe error:', err.message)
      );
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({ message: 'Registration successful', user, accessToken, refreshToken });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /login
router.post('/login', authLimiter, loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,

        superAdmin: true,
        emailVerified: true,
        avatarUrl: true,
        preferences: true,
        newsletterOptIn: true,
        createdAt: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({ message: 'Login successful', user: userWithoutPassword, accessToken, refreshToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /verify-email
router.post('/verify-email', authLimiter, verifyEmailValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, otpCode: true, otpExpiresAt: true, otpPurpose: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (!user.otpCode || user.otpPurpose !== 'verification') {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const otpValid = await bcrypt.compare(otpCode, user.otpCode);
    if (!otpValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpPurpose: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /resend-otp
router.post('/resend-otp', sensitiveOtpLimiter, resendOtpValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      // Return success to prevent email enumeration
      return res.json({ message: 'If an account exists, a new code has been sent' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const otpCode = generateOtp();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otpHash,
        otpExpiresAt,
        otpPurpose: 'verification',
      },
    });

    try {
      await emailService.sendVerificationEmail(email, otpCode);
    } catch (emailErr) {
      console.error('Failed to resend OTP email:', emailErr.message);
    }

    res.json({ message: 'If an account exists, a new code has been sent' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// POST /forgot-password
router.post('/forgot-password', sensitiveOtpLimiter, forgotPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists, a reset code has been sent' });
    }

    const otpCode = generateOtp();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otpHash,
        otpExpiresAt,
        otpPurpose: 'reset',
      },
    });

    try {
      await emailService.sendPasswordResetEmail(email, otpCode);
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message);
    }

    res.json({ message: 'If an account exists, a reset code has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /reset-password
router.post('/reset-password', authLimiter, resetPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email },
      select: { id: true, otpCode: true, otpExpiresAt: true, otpPurpose: true },
    });

    if (!user || !user.otpCode || user.otpPurpose !== 'reset') {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    const otpValid = await bcrypt.compare(otpCode, user.otpCode);
    if (!otpValid) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null,
        otpPurpose: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// POST /refresh
router.post('/refresh', authenticateRefreshToken, async (req, res) => {
  try {
    const { accessToken, refreshToken } = generateTokens(req.user.id);
    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// POST /logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3004';

    if (err) {
      console.error('[Google OAuth] Callback error:', err);
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    if (!user) {
      console.error('[Google OAuth] Authentication failed:', info?.message || 'Unknown reason');
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    res.redirect(`${frontendUrl}/auth/google/callback#access_token=${accessToken}&refresh_token=${refreshToken}`);
  })(req, res, next);
});

module.exports = router;
