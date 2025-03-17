"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePasswordResetToken = exports.generateVerificationToken = exports.generateRandomToken = exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
// Hash password using bcrypt
const hashPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(12);
    return bcryptjs_1.default.hash(password, salt);
};
exports.hashPassword = hashPassword;
// Compare password with hashed password
const comparePassword = async (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
// Generate a random token
const generateRandomToken = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateRandomToken = generateRandomToken;
// Generate verification token
const generateVerificationToken = () => {
    return (0, exports.generateRandomToken)();
};
exports.generateVerificationToken = generateVerificationToken;
// Generate password reset token
const generatePasswordResetToken = () => {
    return (0, exports.generateRandomToken)();
};
exports.generatePasswordResetToken = generatePasswordResetToken;
