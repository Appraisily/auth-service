import { Router } from 'express';
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

router.get('/verify-email/:token', authController.verifyEmail);

router.post('/reset-password-request', passwordResetRequestValidation, authController.requestPasswordReset);

router.post('/reset-password', passwordResetValidation, authController.resetPassword);

router.post('/logout', authController.logout);

router.post('/refresh-token', tokenController.refreshToken);

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getCurrentUser);

router.put('/me', authenticate, updateProfileValidation, authController.updateProfile);

router.delete('/me', authenticate, deleteAccountValidation, authController.deleteAccount);

export default router;