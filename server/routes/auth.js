const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticateRefreshToken, generateTokens } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail, sendOTPEmail } = require('../services/emailService');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

const otpRequestValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const otpVerifyValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Register new user
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await req.prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        superAdmin: true,
        createdAt: true,
      }
    });

    // Create default user settings
    const defaultSettings = {
      toneOfVoice: 'Professional & Authoritative',
      industry: 'Technology (SaaS)',
      position: 'Senior Product Manager',
      audience: 'Tech executives, product leaders, and investors',
      postGoal: 'To establish thought leadership and drive engagement',
      keywords: 'AI, Product Management, SaaS, Go-to-Market',
      contentExamples: JSON.stringify([
        "The GTM flywheel is spinning faster than ever. What worked 5 years ago is now obsolete. The key? Product-led growth isn't just a buzzword, it's a fundamental shift in how we build and sell. Are you adapting?",
        "Cross-functional alignment is the secret sauce to shipping great products. It's less about fancy tools and more about shared context and radical empathy. Here's my 3-step framework for bridging the gap between Eng, Product, and Design.",
      ]),
      timeZone: 'America/New_York',
      preferredTime: '09:00',
      profilePictureUrl: null,
      englishVariant: 'American',
    };

    await req.prisma.userSettings.create({
      data: {
        userId: user.id,
        ...defaultSettings,
      }
    });

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user.id, type: 'email_verification' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email (don't wait for it to complete)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
      sendVerificationEmail(email, verificationToken).catch(error => {
        console.error('Failed to send verification email:', error);
      });
    }

    // Generate auth tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
      refreshToken,
      emailVerificationSent: process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        superAdmin: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh access token
router.post('/refresh', authenticateRefreshToken, async (req, res) => {
  try {
    const { accessToken, refreshToken } = generateTokens(req.user.id);

    res.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout (client-side token removal, but we can blacklist tokens in future)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    // Update user email verification status
    await req.prisma.user.update({
      where: { id: decoded.userId },
      data: { emailVerified: true }
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Verification token expired' });
    }
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Send reset email (don't wait for it to complete)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
      sendPasswordResetEmail(email, resetToken).catch(error => {
        console.error('Failed to send password reset email:', error);
      });
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// Reset password
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password
    await req.prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Reset token expired' });
    }
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Request OTP for email login
router.post('/otp/request', otpRequestValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, an OTP code has been sent' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in database
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiry
      }
    });

    // Send OTP email (don't wait for it to complete)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
      sendOTPEmail(email, otpCode).catch(error => {
        console.error('Failed to send OTP email:', error);
      });
    }

    res.json({ message: 'If an account with that email exists, an OTP code has been sent' });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ error: 'OTP request failed' });
  }
});

// Verify OTP and login
router.post('/otp/verify', otpVerifyValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user with OTP
    const user = await req.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        superAdmin: true,
        createdAt: true,
        otpCode: true,
        otpExpiry: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid OTP code' });
    }

    // Check if OTP exists and hasn't expired
    if (!user.otpCode || !user.otpExpiry) {
      return res.status(401).json({ error: 'No OTP requested for this account' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(401).json({ error: 'OTP code has expired' });
    }

    // Verify OTP matches
    if (user.otpCode !== otp) {
      return res.status(401).json({ error: 'Invalid OTP code' });
    }

    // Clear OTP from database
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiry: null
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Remove OTP fields from response
    const { otpCode: _, otpExpiry: __, ...userWithoutOTP } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutOTP,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

module.exports = router;
