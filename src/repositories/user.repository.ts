import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export type CreateUserData = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  verificationToken?: string;
};

export type UpdateUserData = {
  firstName?: string;
  lastName?: string;
  password?: string;
  isEmailVerified?: boolean;
  verificationToken?: string | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  return prisma.user.create({
    data: userData,
  });
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const findUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { id },
  });
};

export const findUserByVerificationToken = async (token: string): Promise<User | null> => {
  return prisma.user.findFirst({
    where: { verificationToken: token },
  });
};

export const findUserByResetToken = async (token: string): Promise<User | null> => {
  return prisma.user.findFirst({
    where: { 
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date()
      }
    },
  });
};

export const updateUser = async (
  id: string,
  data: UpdateUserData
): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data,
  });
};

export const deleteUser = async (id: string): Promise<User> => {
  return prisma.user.delete({
    where: { id },
  });
};