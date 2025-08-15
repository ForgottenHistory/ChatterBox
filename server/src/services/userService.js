import prisma from '../db/client.js'

export const createUser = async (userData) => {
  return await prisma.user.create({
    data: userData
  })
}

export const createBot = async (botData) => {
  return await prisma.user.create({
    data: {
      ...botData,
      isBot: true
    }
  })
}

export const getUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id }
  })
}

export const getUserByUsername = async (username) => {
  return await prisma.user.findUnique({
    where: { username }
  })
}

export const getAllBots = async () => {
  return await prisma.user.findMany({
    where: { isBot: true }
  })
}

export const updateUser = async (id, userData) => {
  return await prisma.user.update({
    where: { id },
    data: userData
  })
}