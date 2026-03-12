const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
console.log(`[Auth] Google OAuth configured — callback URL: ${callbackURL}`);
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const prisma = req.prisma;
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;

        if (!email) {
          console.error('[Google OAuth] No email associated with Google account, profile id:', profile.id);
          return done(null, false, { message: 'No email associated with Google account' });
        }

        const avatarUrl = profile.photos && profile.photos[0] && profile.photos[0].value;
        const googleId = profile.id;
        const displayName = profile.displayName;

        let user = await prisma.user.findUnique({ where: { googleId } });

        if (user) {
          return done(null, user);
        }

        if (email) {
          user = await prisma.user.findUnique({ where: { email } });
        }

        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId, avatarUrl },
          });
          return done(null, user);
        }

        user = await prisma.user.create({
          data: {
            email,
            displayName,
            googleId,
            avatarUrl,
            role: 'user',
            emailVerified: true,
          },
        });

        return done(null, user);
      } catch (err) {
        console.error('[Google OAuth] Verify callback error:', err);
        return done(err);
      }
    }
  )
);
} else {
  console.log('[passport] Google OAuth not configured — GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set');
}

module.exports = passport;
