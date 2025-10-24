const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      
      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
        }
      });

      if (user) {
        // Update email verification if not already verified
        if (!user.emailVerified) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
            select: {
              id: true,
              email: true,
              emailVerified: true,
              createdAt: true,
            }
          });
        }
        return done(null, user);
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: '', // OAuth users don't have passwords
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          emailVerified: true,
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
        profilePictureUrl: profile.photos[0]?.value || null,
        englishVariant: 'American',
      };

      await prisma.userSettings.create({
        data: {
          userId: user.id,
          ...defaultSettings,
        }
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// LinkedIn OAuth Strategy
if (process.env.QUORD_LINKEDIN_CLIENT_SECRET && process.env.QUORD_LINKEDIN_REDIRECT_URI) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID, // You'll need to add this to .env
    clientSecret: process.env.QUORD_LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.QUORD_LINKEDIN_REDIRECT_URI,
    scope: ['r_emailaddress', 'r_liteprofile'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      
      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
        }
      });

      if (user) {
        // Update email verification if not already verified
        if (!user.emailVerified) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
            select: {
              id: true,
              email: true,
              emailVerified: true,
              createdAt: true,
            }
          });
        }
        return done(null, user);
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: '', // OAuth users don't have passwords
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
        }
      });

      // Create default user settings with LinkedIn profile picture
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
        profilePictureUrl: profile.photos[0]?.value || null,
        englishVariant: 'American',
      };

      await prisma.userSettings.create({
        data: {
          userId: user.id,
          ...defaultSettings,
        }
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

module.exports = passport;
