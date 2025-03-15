import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

type TokenPayload = {
  userId: string;
  email: string;
};

export const generateToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
  };

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  
  // Skip type checking by using any
  const options: any = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  };

  return jwt.sign(payload, jwtSecret, options);
};

export const generateRefreshToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
  };

  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret';
  
  // Skip type checking by using any
  const options: any = {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
  };

  return jwt.sign(payload, refreshSecret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret') as TokenPayload;
};