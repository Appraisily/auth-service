"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.findUserByResetToken = exports.findUserByVerificationToken = exports.findUserById = exports.findUserByEmail = exports.createUser = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createUser = async (userData) => {
    return prisma.user.create({
        data: userData,
    });
};
exports.createUser = createUser;
const findUserByEmail = async (email) => {
    return prisma.user.findUnique({
        where: { email },
    });
};
exports.findUserByEmail = findUserByEmail;
const findUserById = async (id) => {
    return prisma.user.findUnique({
        where: { id },
    });
};
exports.findUserById = findUserById;
const findUserByVerificationToken = async (token) => {
    return prisma.user.findFirst({
        where: { verificationToken: token },
    });
};
exports.findUserByVerificationToken = findUserByVerificationToken;
const findUserByResetToken = async (token) => {
    return prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: {
                gt: new Date()
            }
        },
    });
};
exports.findUserByResetToken = findUserByResetToken;
const updateUser = async (id, data) => {
    return prisma.user.update({
        where: { id },
        data,
    });
};
exports.updateUser = updateUser;
const deleteUser = async (id) => {
    return prisma.user.delete({
        where: { id },
    });
};
exports.deleteUser = deleteUser;
