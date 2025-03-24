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
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const authController = __importStar(require("../controllers/auth.controller"));
const tokenController = __importStar(require("../controllers/token.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', validation_middleware_1.registerValidation, authController.register);
router.post('/login', validation_middleware_1.loginValidation, authController.login);
router.post('/request-reset-password', validation_middleware_1.passwordResetRequestValidation, authController.requestPasswordReset);
router.post('/reset-password', validation_middleware_1.passwordResetValidation, authController.resetPassword);
// Google OAuth routes
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email']
}));
router.get('/google/callback', passport_1.default.authenticate('google', {
    failureRedirect: '/login',
    session: false
}), authController.googleCallback);
// Protected routes (require authentication)
router.get('/me', auth_middleware_1.authenticate, authController.getCurrentUser);
router.put('/me', auth_middleware_1.authenticate, validation_middleware_1.updateProfileValidation, authController.updateProfile);
router.delete('/me', auth_middleware_1.authenticate, validation_middleware_1.deleteAccountValidation, authController.deleteAccount);
router.post('/refresh-token', tokenController.refreshToken);
router.post('/logout', authController.logout);
exports.default = router;
