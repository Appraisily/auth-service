import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import logger from '../utils/logger';

/**
 * Middleware to authenticate requests
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
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
    const decoded = verifyToken(token);
    
    // Add user data to request
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Middleware for validation error handling
 */
export const validationErrorHandler = (req: Request, res: Response, next: NextFunction): void => {
  next();
};