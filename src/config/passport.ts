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
        const email = profile.emails?.[0]?.value || '';
        if (!email) {
          logger.error('Google authentication failed: No email provided');
          return done(new Error('No email provided from Google'));
        }

        // Check if user exists by email
        const existingUser = await userRepository.findUserByEmail(email);

        if (existingUser) {
          logger.info('User found during Google authentication', {
            userId: existingUser.id,
            email: existingUser.email,
            hasPassword: !!existingUser.password && existingUser.password.length > 0
          });

          // User already exists with this email
          // Update with Google profile info if not already set
          const updateData: Record<string, any> = {};
          let needsUpdate = false;

          if (!existingUser.firstName && profile.name?.givenName) {
            updateData.firstName = profile.name.givenName;
            needsUpdate = true;
          }

          if (!existingUser.lastName && profile.name?.familyName) {
            updateData.lastName = profile.name.familyName;
            needsUpdate = true;
          }

          // Ensure email is verified for Google accounts
          if (!existingUser.isEmailVerified) {
            updateData.isEmailVerified = true;
            needsUpdate = true;
          }

          // Update user if needed
          if (needsUpdate) {
            logger.info('Updating existing user with Google profile data', {
              userId: existingUser.id,
              email: existingUser.email,
              updates: updateData
            });
            
            await userRepository.updateUser(existingUser.id, updateData);
          }

          return done(null, existingUser);
        }

        // Create new user if doesn't exist
        const newUser = await userRepository.createUser({
          email: email,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          isEmailVerified: true, // Google accounts are already verified
          password: '', // Empty password for Google auth users
        });

        logger.info('New user created from Google auth', {
          userId: newUser.id,
          email: newUser.email
        });

        // Mark this as a new user to avoid sending PubSub notifications for existing users
        const userWithFlag = {
          ...newUser,
          _isNewUser: true
        };

        return done(null, userWithFlag);
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