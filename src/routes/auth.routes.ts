import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller';
import * as tokenController from '../controllers/token.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
  updateProfileValidation,
  deleteAccountValidation,
} from '../middleware/validation.middleware';

const router = Router();

// Public routes
router.post('/register', registerValidation, authController.register);

router.post('/login', loginValidation, authController.login);

router.post('/reset-password-request', passwordResetRequestValidation, authController.requestPasswordReset);

router.post('/reset-password', passwordResetValidation, authController.resetPassword);

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  authController.googleCallback
);

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getCurrentUser);

router.put('/me', authenticate, updateProfileValidation, authController.updateProfile);

router.delete('/me', authenticate, deleteAccountValidation, authController.deleteAccount);

router.post('/refresh-token', tokenController.refreshToken);

router.post('/logout', authController.logout);

export default router;