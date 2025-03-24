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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const userRepository = __importStar(require("../repositories/user.repository"));
const logger_1 = __importDefault(require("../utils/logger"));
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value || '';
        if (!email) {
            logger_1.default.error('Google authentication failed: No email provided');
            return done(new Error('No email provided from Google'));
        }
        // Check if user exists by email
        const existingUser = await userRepository.findUserByEmail(email);
        if (existingUser) {
            logger_1.default.info('User found during Google authentication', {
                userId: existingUser.id,
                email: existingUser.email,
                hasPassword: !!existingUser.password && existingUser.password.length > 0
            });
            // User already exists with this email
            // Update with Google profile info if not already set
            const updateData = {};
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
                logger_1.default.info('Updating existing user with Google profile data', {
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
        logger_1.default.info('New user created from Google auth', {
            userId: newUser.id,
            email: newUser.email
        });
        return done(null, newUser);
    }
    catch (error) {
        logger_1.default.error('Google authentication error', { error });
        return done(error);
    }
}));
// Serialize user for the session
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user from the session
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await userRepository.findUserById(id);
        done(null, user);
    }
    catch (error) {
        done(error);
    }
});
