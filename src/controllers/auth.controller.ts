import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as userRepository from '../repositories/user.repository';
import { 
  hashPassword, 
  comparePassword, 
  generateVerificationToken,
  generatePasswordResetToken
} from '../utils/crypto';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import logger from '../utils/logger';
import { PubSub } from '@google-cloud/pubsub';
import { pubSubService, NewRegistrationEmailMessage, ResetPasswordRequestMessage } from '../services/pubsub.service';

const pubsub = new PubSub();

// Register a new user
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user (removed verification token)
    const user = await userRepository.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isEmailVerified: true, // Set to true by default since we're not verifying
    });

    // Create CRM notification with correct format
    const message: NewRegistrationEmailMessage = {
      crmProcess: 'newRegistrationEmail',
      customer: {
        email: user.email
      },
      metadata: {
        timestamp: Date.now()
      }
    };

    // Publish to PubSub
    await pubSubService.publishMessage(message);

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    logger.error('Registration error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, rememberMe } = req.body;

    // Find the user
    const user = await userRepository.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if password matches
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    // Generate JWT token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Determine token expiry based on rememberMe flag
    const tokenExpiry = rememberMe ? 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days
      new Date(Date.now() + 24 * 60 * 60 * 1000);       // 1 day

    // Set cookies for tokens
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: tokenExpiry,
      sameSite: 'lax'
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      sameSite: 'lax',
      path: '/api/auth/refresh-token' // Only sent to refresh token endpoint
    });

    // Don't return password
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    logger.error('Login error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Request password reset
export const requestPasswordReset = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await userRepository.findUserByEmail(email);
    
    if (user) {
      // Generate reset token
      const resetToken = generatePasswordResetToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      // Update user with reset token
      await userRepository.updateUser(user.id, {
        resetToken,
        resetTokenExpiry
      });

      // Prepare message for CRM
      const message: ResetPasswordRequestMessage = {
        crmProcess: 'resetPasswordRequest',
        customer: {
          email: user.email
        },
        token: resetToken,
        metadata: {
          timestamp: Date.now()
        }
      };

      // Publish to PubSub
      const subscriptionName = process.env.PUBSUB_SUBSCRIPTION_NAME;
      if (!subscriptionName) {
        throw new Error('PUBSUB_SUBSCRIPTION_NAME environment variable is not set');
      }

      const dataBuffer = Buffer.from(JSON.stringify(message));
      await pubsub.topic(subscriptionName).publish(dataBuffer);
    }

    // Always return same message whether user exists or not
    return res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent' 
    });
  } catch (error) {
    logger.error('Password reset request error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout user
export const logout = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    // req.user is set by auth middleware
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await userRepository.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't return password and sensitive data
    const { password, resetToken, resetTokenExpiry, verificationToken, ...userProfile } = user;

    return res.status(200).json({ user: userProfile });
  } catch (error) {
    logger.error('Get current user error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Complete password reset
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token, password } = req.body;

    // Find user by reset token
    const user = await userRepository.findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user with new password and remove reset token
    await userRepository.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error('Password reset error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { firstName, lastName, currentPassword, newPassword } = req.body;
    const updateData: userRepository.UpdateUserData = {};

    // If updating name fields
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    // If updating password
    if (currentPassword && newPassword) {
      const user = await userRepository.findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      updateData.password = await hashPassword(newPassword);
    }

    // Update user
    const updatedUser = await userRepository.updateUser(userId, updateData);
    const { password, resetToken, resetTokenExpiry, verificationToken, ...userProfile } = updatedUser;

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: userProfile
    });
  } catch (error) {
    logger.error('Update profile error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete user account
export const deleteAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { password } = req.body;

    // Verify password before deletion
    const user = await userRepository.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Delete user
    await userRepository.deleteUser(userId);

    // Clear auth cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};