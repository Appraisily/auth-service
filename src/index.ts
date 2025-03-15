import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import debugRoutes from './routes/debug.routes';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const app = express();
const PORT = process.env.PORT || 8080;

// Test database connection
async function testDatabaseConnection() {
  try {
    // Try to query the database
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { 
      error,
      message: (error as Error).message,
      DATABASE_URL: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 
        'not configured'
    });
    return false;
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://appraisily.com',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Log all requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, { 
      query: req.query, 
      body: req.method === 'POST' || req.method === 'PUT' ? '...' : undefined
    });
    next();
  });
}

// Basic splash page
app.get('/', (req, res) => {
  const dbStatus = process.env.DATABASE_INITIALIZED === 'true' ? 'Initialized' : 'Not initialized';
  res.send(`
    <html>
      <head><title>Auth Service</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>Auth Service</h1>
        <p>Status: Running</p>
        <p>Database: ${dbStatus}</p>
        <p>API Endpoints:</p>
        <ul>
          <li><a href="/health">/health</a> - Service health check</li>
          <li><a href="/api/debug/db-status">/api/debug/db-status</a> - Database status check</li>
        </ul>
      </body>
    </html>
  `);
});

// Enhanced health check route with DB status
app.get('/health', async (req, res) => {
  const dbConnected = await testDatabaseConnection();
  
  res.status(200).json({ 
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    database: dbConnected ? 'connected' : 'disconnected',
    databaseUrl: process.env.DATABASE_URL ? 
      process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 
      'not configured',
    environment: process.env.NODE_ENV || 'development',
    initialized: process.env.DATABASE_INITIALIZED === 'true'
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Debug routes - only enabled in non-production environments or with debug flag
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_ROUTES === 'true') {
  logger.info('Debug routes enabled');
  app.use('/api/debug', debugRoutes);
} else {
  logger.info('Debug routes disabled in production');
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { 
    error: err,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ 
    message: 'Internal server error',
    path: req.path,
    // Only include error details in non-production
    ...(process.env.NODE_ENV !== 'production' && { error: err.message })
  });
});

// Start server
const startServer = async () => {
  // Test DB connection before starting server
  let dbConnected = false;
  let retries = 0;
  const maxRetries = 5;
  const retryInterval = 3000; // 3 seconds
  
  // Retry database connection logic
  while (!dbConnected && retries < maxRetries) {
    logger.info(`Attempting database connection (attempt ${retries + 1}/${maxRetries})...`);
    dbConnected = await testDatabaseConnection();
    
    if (!dbConnected && retries < maxRetries - 1) {
      logger.warn(`Database connection failed, retrying in ${retryInterval/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
      retries++;
    }
  }
  
  // Try to apply migrations if database is connected
  if (dbConnected) {
    try {
      // Set environment variable to indicate we've checked the database
      process.env.DATABASE_INITIALIZED = 'true';
      logger.info('Database connection verified, ready to serve requests');
    } catch (error) {
      logger.error('Error during startup database operations', { error });
    }
  } else {
    logger.warn('Starting server despite database connection issues - will keep retrying in background');
    
    // Set up background retry logic
    setInterval(async () => {
      const connected = await testDatabaseConnection();
      if (connected && !dbConnected) {
        dbConnected = true;
        process.env.DATABASE_INITIALIZED = 'true';
        logger.info('Database connection established in background retry');
      }
    }, 30000); // Try every 30 seconds
  }
  
  // Start the server
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Database: ${dbConnected ? 'Connected' : 'Will retry in background'}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Auth service is ready at http://localhost:${PORT}`);
  });
};

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export default app;