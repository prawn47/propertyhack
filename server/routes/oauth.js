const express = require('express');
const passport = require('../config/passport');
const { generateTokens } = require('../middleware/auth');

const router = express.Router();

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // Generate JWT tokens for the authenticated user
      const { accessToken, refreshToken } = generateTokens(req.user.id);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.CORS_ORIGIN}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.CORS_ORIGIN}/auth/error?message=Authentication failed`);
    }
  }
);

// LinkedIn OAuth routes
router.get('/linkedin',
  passport.authenticate('linkedin', { scope: ['r_emailaddress', 'r_liteprofile'] })
);

router.get('/linkedin/callback',
  passport.authenticate('linkedin', { session: false }),
  async (req, res) => {
    try {
      // Generate JWT tokens for the authenticated user
      const { accessToken, refreshToken } = generateTokens(req.user.id);
      
      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.CORS_ORIGIN}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('LinkedIn OAuth callback error:', error);
      res.redirect(`${process.env.CORS_ORIGIN}/auth/error?message=Authentication failed`);
    }
  }
);

module.exports = router;
