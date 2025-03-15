import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as tokenController from '../controllers/token.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
} from '../middleware/validation.middleware';

const router = Router();

// POST /api/auth/register - Register a new user
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login - Login user
router.post('/login', loginValidation, authController.login);

// GET /api/auth/verify-email/:token - Verify email with token
router.get('/verify-email/:token', authController.verifyEmail);

// POST /api/auth/reset-password - Request password reset
router.post('/reset-password', passwordResetRequestValidation, authController.requestPasswordReset);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user profile (protected route)
router.get('/me', authenticate, authController.getCurrentUser);

// POST /api/auth/refresh-token - Refresh access token
router.post('/refresh-token', tokenController.refreshToken);

export default router;