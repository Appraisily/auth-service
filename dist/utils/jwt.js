"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
    };
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    // Skip type checking by using any
    const options = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
    return jsonwebtoken_1.default.sign(payload, jwtSecret, options);
};
exports.generateToken = generateToken;
const generateRefreshToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
    };
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret';
    // Skip type checking by using any
    const options = {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
    };
    return jsonwebtoken_1.default.sign(payload, refreshSecret, options);
};
exports.generateRefreshToken = generateRefreshToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
};
exports.verifyToken = verifyToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret');
};
exports.verifyRefreshToken = verifyRefreshToken;
