"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCallback = exports.deleteAccount = exports.updateProfile = exports.resetPassword = exports.getCurrentUser = exports.logout = exports.requestPasswordReset = exports.login = exports.register = void 0;
const express_validator_1 = require("express-validator");
const userRepository = __importStar(require("../repositories/user.repository"));
const crypto_1 = require("../utils/crypto");
const jwt_1 = require("../utils/jwt");
const logger_1 = __importDefault(require("../utils/logger"));
const pubsub_1 = require("@google-cloud/pubsub");
const pubsub_service_1 = require("../services/pubsub.service");
const pubsub = new pubsub_1.PubSub();
// Register a new user
const register = async (req, res) => {
    try {
        logger_1.default.info('Registration attempt', {
            email: req.body.email,
            hasFirstName: !!req.body.firstName,
            hasLastName: !!req.body.lastName,
            hasPassword: !!req.body.password
        });
        // Check validation results
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            logger_1.default.warn('Registration validation failed', {
                errors: errors.array(),
                email: req.body.email
            });
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, firstName, lastName } = req.body;
        // Log required fields
        if (!email || !password) {
            logger_1.default.warn('Missing required fields', {
                hasEmail: !!email,
                hasPassword: !!password
            });
            return res.status(400).json({
                message: 'Missing required fields',
                errors: [
                    ...(!email ? [{ msg: 'Email is required', param: 'email' }] : []),
                    ...(!password ? [{ msg: 'Password is required', param: 'password' }] : [])
                ]
            });
        }
        // Check if user already exists
        const existingUser = await userRepository.findUserByEmail(email);
        if (existingUser) {
            logger_1.default.warn('User already exists', { email });
            return res.status(409).json({ message: 'User with this email already exists' });
        }
        // Hash the password
        const hashedPassword = await (0, crypto_1.hashPassword)(password);
        // Create the user (removed verification token)
        const user = await userRepository.createUser({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            isEmailVerified: true, // Set to true by default since we're not verifying
        });
        logger_1.default.info('User created successfully', {
            userId: user.id,
            email: user.email,
            hasFirstName: !!user.firstName,
            hasLastName: !!user.lastName
        });
        // Create CRM notification with correct format
        const message = {
            crmProcess: 'newRegistrationEmail',
            customer: {
                email: user.email
            },
            metadata: {
                timestamp: Date.now()
            }
        };
        // Publish to PubSub
        try {
            await pubsub_service_1.pubSubService.publishMessage(message);
            logger_1.default.info('CRM notification sent successfully', {
                userId: user.id,
                email: user.email
            });
        }
        catch (pubsubError) {
            logger_1.default.error('Failed to send CRM notification', {
                error: pubsubError,
                userId: user.id,
                email: user.email
            });
            // Continue with registration even if PubSub fails
        }
        // Don't return password in response
        const { password: _, ...userWithoutPassword } = user;
        logger_1.default.info('Registration completed successfully', {
            userId: user.id,
            email: user.email
        });
        return res.status(201).json({
            message: 'User registered successfully',
            user: userWithoutPassword,
        });
    }
    catch (error) {
        logger_1.default.error('Registration error', {
            error,
            requestBody: {
                email: req.body.email,
                hasPassword: !!req.body.password,
                hasFirstName: !!req.body.firstName,
                hasLastName: !!req.body.lastName
            }
        });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
// Login user
const login = async (req, res) => {
    try {
        // Check validation results
        const errors = (0, express_validator_1.validationResult)(req);
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
        const isPasswordValid = await (0, crypto_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(403).json({ message: 'Please verify your email before logging in' });
        }
        // Generate JWT token
        const token = (0, jwt_1.generateToken)(user);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user);
        // Determine token expiry based on rememberMe flag
        const tokenExpiry = rememberMe ?
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days
            new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
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
    }
    catch (error) {
        logger_1.default.error('Login error', { error });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email } = req.body;
        const user = await userRepository.findUserByEmail(email);
        if (user) {
            // Generate reset token
            const resetToken = (0, crypto_1.generatePasswordResetToken)();
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
            // Update user with reset token
            await userRepository.updateUser(user.id, {
                resetToken,
                resetTokenExpiry
            });
            // Prepare message for CRM
            const message = {
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
    }
    catch (error) {
        logger_1.default.error('Password reset request error', { error });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.requestPasswordReset = requestPasswordReset;
// Logout user
const logout = async (req, res) => {
    try {
        // Clear cookies
        res.clearCookie('token');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });
        return res.status(200).json({ message: 'Logout successful' });
    }
    catch (error) {
        logger_1.default.error('Logout error', { error });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.logout = logout;
// Get current user profile
const getCurrentUser = async (req, res) => {
    try {
        // req.user is set by auth middleware
        const userId = req.user?.userId;
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
    }
    catch (error) {
        logger_1.default.error('Get current user error', { error });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getCurrentUser = getCurrentUser;
// Complete password reset
const resetPassword = async (req, res) => {
    try {
        logger_1.default.info('Password reset attempt', {
            hasToken: !!req.body.token,
            hasPassword: !!req.body.password,
            hasConfirmPassword: !!req.body.confirmPassword
        });
        // Check validation results
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            logger_1.default.warn('Password reset validation failed', {
                errors: errors.array()
            });
            return res.status(400).json({ errors: errors.array() });
        }
        const { token, password, confirmPassword } = req.body;
        // Log required fields
        if (!token || !password || !confirmPassword) {
            logger_1.default.warn('Missing required fields for password reset', {
                hasToken: !!token,
                hasPassword: !!password,
                hasConfirmPassword: !!confirmPassword
            });
            return res.status(400).json({
                message: 'Missing required fields',
                errors: [
                    ...(!token ? [{ msg: 'Reset token is required', param: 'token' }] : []),
                    ...(!password ? [{ msg: 'New password is required', param: 'password' }] : []),
                    ...(!confirmPassword ? [{ msg: 'Password confirmation is required', param: 'confirmPassword' }] : [])
                ]
            });
        }
        // Verify passwords match
        if (password !== confirmPassword) {
            logger_1.default.warn('Passwords do not match');
            return res.status(400).json({
                message: 'Validation failed',
                errors: [{ msg: 'Passwords do not match', param: 'confirmPassword' }]
            });
        }
        // Find user by reset token
        const user = await userRepository.findUserByResetToken(token);
        if (!user) {
            logger_1.default.warn('Invalid or expired reset token attempt');
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        // Additional check for token expiry
        if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            logger_1.default.warn('Reset token has expired', {
                tokenExpiry: user.resetTokenExpiry
            });
            return res.status(400).json({ message: 'Reset token has expired' });
        }
        logger_1.default.info('Valid reset token found', {
            userId: user.id,
            email: user.email
        });
        // Hash the new password
        const hashedPassword = await (0, crypto_1.hashPassword)(password);
        // Update user with new password and remove reset token
        await userRepository.updateUser(user.id, {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
        });
        logger_1.default.info('Password reset completed successfully', {
            userId: user.id,
            email: user.email
        });
        return res.status(200).json({ message: 'Password reset successful' });
    }
    catch (error) {
        logger_1.default.error('Password reset error', {
            error,
            requestBody: {
                hasToken: !!req.body.token,
                hasPassword: !!req.body.password,
                hasConfirmPassword: !!req.body.confirmPassword
            }
        });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.resetPassword = resetPassword;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { firstName, lastName, currentPassword, newPassword } = req.body;
        const updateData = {};
        // If updating name fields
        if (firstName)
            updateData.firstName = firstName;
        if (lastName)
            updateData.lastName = lastName;
        // If updating password
        if (currentPassword && newPassword) {
            const user = await userRepository.findUserById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Verify current password
            const isPasswordValid = await (0, crypto_1.comparePassword)(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
            // Hash new password
            updateData.password = await (0, crypto_1.hashPassword)(newPassword);
        }
        // Update user
        const updatedUser = await userRepository.updateUser(userId, updateData);
        const { password, resetToken, resetTokenExpiry, verificationToken, ...userProfile } = updatedUser;
        return res.status(200).json({
            message: 'Profile updated successfully',
            user: userProfile
        });
    }
    catch (error) {
        logger_1.default.error('Update profile error', { error });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
// Delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { password } = req.body;
        // Verify password before deletion
        const user = await userRepository.findUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await (0, crypto_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        // Delete user
        await userRepository.deleteUser(userId);
        // Clear auth cookies
        res.clearCookie('token');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });
        return res.status(200).json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        logger_1.default.error('Delete account error', { error });
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteAccount = deleteAccount;
// Google OAuth callback
const googleCallback = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            logger_1.default.error('Google callback: No user data');
            return res.status(401).json({ message: 'Authentication failed' });
        }
        // Generate tokens
        const token = (0, jwt_1.generateToken)(user);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user);
        // Set cookies
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
        const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: tokenExpiry,
            sameSite: 'lax'
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: refreshTokenExpiry,
            sameSite: 'lax',
            path: '/api/auth/refresh-token'
        });
        // Create CRM notification
        const message = {
            crmProcess: 'newRegistrationEmail',
            customer: {
                email: user.email
            },
            metadata: {
                timestamp: Date.now()
            }
        };
        // Publish to PubSub if this is a new user
        try {
            await pubsub_service_1.pubSubService.publishMessage(message);
            logger_1.default.info('CRM notification sent successfully for Google auth user', {
                userId: user.id,
                email: user.email
            });
        }
        catch (pubsubError) {
            logger_1.default.error('Failed to send CRM notification for Google auth user', {
                error: pubsubError,
                userId: user.id,
                email: user.email
            });
        }
        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/success`);
        return res.status(302).end(); // This line will not be reached, but satisfies TypeScript
    }
    catch (error) {
        logger_1.default.error('Google callback error', { error });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/error`);
        return res.status(302).end(); // This line will not be reached, but satisfies TypeScript
    }
};
exports.googleCallback = googleCallback;
