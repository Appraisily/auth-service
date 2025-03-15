import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Hash password using bcrypt
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Compare password with hashed password
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate a random token
export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate verification token
export const generateVerificationToken = (): string => {
  return generateRandomToken();
};

// Generate password reset token
export const generatePasswordResetToken = (): string => {
  return generateRandomToken();
};