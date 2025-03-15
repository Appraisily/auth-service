import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Get database connection status
export const getDatabaseStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    // Get database information
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    
    // Get table information
    const tables = await prisma.$queryRaw`
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count 
      FROM information_schema.tables t 
      WHERE table_schema = 'public'
    `;
    
    return res.status(200).json({
      status: 'connected',
      database: {
        info: dbInfo,
        tables,
        url: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 
          'not configured'
      }
    });
  } catch (error) {
    logger.error('Database connection check failed', { error });
    
    return res.status(500).json({
      status: 'disconnected',
      error: {
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      database: {
        url: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 
          'not configured'
      }
    });
  }
};

// Initialize database with test data
export const initializeDatabase = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Check if we have the secret key to prevent unauthorized access
    const { secretKey } = req.body;
    if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // First check if we have any users
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      return res.status(200).json({ 
        message: 'Database already initialized', 
        userCount 
      });
    }

    // Create a test admin user if no users exist
    const testUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: '$2b$10$eCNPfYxJ0B9G/v2pjq.1NO.2o4TiM1TcRs7hzREBN9vC.lGqkEbLy', // password: admin123
        firstName: 'Admin',
        lastName: 'User',
        isEmailVerified: true
      }
    });

    return res.status(200).json({
      message: 'Database initialized successfully',
      testUser: {
        email: testUser.email,
        id: testUser.id
      }
    });
  } catch (error) {
    logger.error('Database initialization failed', { error });
    
    return res.status(500).json({
      message: 'Database initialization failed',
      error: {
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      }
    });
  }
};