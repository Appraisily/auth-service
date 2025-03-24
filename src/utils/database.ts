import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    // Try a simple query to test the connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error });
    return false;
  }
}; 