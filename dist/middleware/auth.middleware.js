"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationErrorHandler = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware to authenticate requests
 */
const authenticate = (req, res, next) => {
    try {
        // Get token from cookie or authorization header
        let token;
        // Check for token in cookies first (preferred method)
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // Fallback to Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        // Verify token
        const decoded = (0, jwt_1.verifyToken)(token);
        // Add user data to request
        req.user = decoded;
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error', { error });
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
/**
 * Middleware for validation error handling
 */
const validationErrorHandler = (req, res, next) => {
    next();
};
exports.validationErrorHandler = validationErrorHandler;
