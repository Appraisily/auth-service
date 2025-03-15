import { Request, Response } from 'express';
import { verifyRefreshToken, generateToken } from '../utils/jwt';
import * as userRepository from '../repositories/user.repository';
import logger from '../utils/logger';

// Refresh access token using refresh token
export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not provided' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user from database
    const user = await userRepository.findUserById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new access token
    const newToken = generateToken(user);
    
    // Set new token in cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      sameSite: 'lax'
    });

    return res.status(200).json({ 
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    logger.error('Token refresh error', { error });
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};