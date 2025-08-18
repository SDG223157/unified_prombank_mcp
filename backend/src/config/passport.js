const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with Google ID
    let user = await prisma.user.findUnique({
      where: { googleId: profile.id }
    });

    if (user) {
      // User exists, return them
      return done(null, user);
    }

    // Check if user exists with the same email
    user = await prisma.user.findUnique({
      where: { email: profile.emails[0].value }
    });

    if (user) {
      // User exists with same email, link Google account
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          authProvider: 'google',
          profilePicture: profile.photos[0]?.value || null,
          // Update name if not set
          firstName: user.firstName || profile.name.givenName,
          lastName: user.lastName || profile.name.familyName
        }
      });
      return done(null, user);
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email: profile.emails[0].value,
        googleId: profile.id,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profilePicture: profile.photos[0]?.value || null,
        authProvider: 'google',
        subscriptionTier: 'free',
        isActive: true
      }
    });

    return done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

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
        firstName: true,
        lastName: true,
        profilePicture: true,
        authProvider: true,
        subscriptionTier: true,
        isActive: true
      }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport; 