import prisma from '../db/client.js'

export const createMessage = async (messageData) => {
  return await prisma.message.create({
    data: messageData,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          isBot: true
        }
      }
    }
  })
}

export const getMessagesByChannel = async (channelId, limit = 50) => {
  return await prisma.message.findMany({
    where: { channelId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          isBot: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

export const deleteMessage = async (id) => {
  return await prisma.message.delete({
    where: { id }
  })
}