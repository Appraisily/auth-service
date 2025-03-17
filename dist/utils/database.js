"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseConnection = void 0;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("./logger"));
const prisma = new client_1.PrismaClient();
const testDatabaseConnection = async () => {
    try {
        // Try a simple query to test the connection
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        logger_1.default.error('Database connection test failed', { error });
        return false;
    }
};
exports.testDatabaseConnection = testDatabaseConnection;
