import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as userRepository from '../repositories/user.repository';
import logger from '../utils/logger';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        const existingUser = await userRepository.findUserByEmail(profile.emails?.[0]?.value || '');

        if (existingUser) {
          logger.info('Existing user logged in with Google', {
            userId: existingUser.id,
            email: existingUser.email
          });
          return done(null, existingUser);
        }

        // Create new user if doesn't exist
        const newUser = await userRepository.createUser({
          email: profile.emails?.[0]?.value || '',
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          isEmailVerified: true, // Google accounts are already verified
          password: '', // No password for Google auth users
        });

        logger.info('New user created from Google auth', {
          userId: newUser.id,
          email: newUser.email
        });

        return done(null, newUser);
      } catch (error) {
        logger.error('Google authentication error', { error });
        return done(error as Error);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userRepository.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
}); 