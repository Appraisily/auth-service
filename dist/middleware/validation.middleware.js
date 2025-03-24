"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccountValidation = exports.updateProfileValidation = exports.passwordResetValidation = exports.passwordResetRequestValidation = exports.loginValidation = exports.registerValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation rules for user registration
 */
exports.registerValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('confirmPassword')
        .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
    (0, express_validator_1.body)('firstName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters long'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters long'),
];
/**
 * Validation rules for user login
 */
exports.loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
];
/**
 * Validation rules for password reset request
 */
exports.passwordResetRequestValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Valid email is required')
];
/**
 * Validation rules for password reset (setting new password)
 */
exports.passwordResetValidation = [
    (0, express_validator_1.body)('token')
        .notEmpty()
        .withMessage('Token is required'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('confirmPassword')
        .notEmpty()
        .withMessage('Password confirmation is required')
        .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
];
/**
 * Validation rules for updating user profile
 */
exports.updateProfileValidation = [
    (0, express_validator_1.body)('firstName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters long'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters long'),
    (0, express_validator_1.body)('currentPassword')
        .optional()
        .custom((value, { req }) => {
        if (req.body.newPassword && !value) {
            throw new Error('Current password is required when setting new password');
        }
        return true;
    }),
    (0, express_validator_1.body)('newPassword')
        .optional()
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long'),
];
/**
 * Validation rules for deleting user account
 */
exports.deleteAccountValidation = [
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required to confirm account deletion'),
];
