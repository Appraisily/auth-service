import nodemailer from 'nodemailer';
import logger from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@appraisily.com',
      ...options,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    logger.error('Email sending failed', { error });
    return false;
  }
};

export const sendVerificationEmail = async (
  email: string, 
  token: string
): Promise<boolean> => {
  const verificationUrl = `${process.env.CORS_ORIGIN}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for signing up with Appraisily. Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #3182ce; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin: 20px 0;">Verify Email</a>
        <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't sign up for an Appraisily account, please ignore this email.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (
  email: string, 
  token: string
): Promise<boolean> => {
  const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #3182ce; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin: 20px 0;">Reset Password</a>
        <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
      </div>
    `,
  });
};