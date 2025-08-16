import { createMessage, getMessagesByChannel } from '../services/messageService.js'
import { getUserByUsername } from '../services/userService.js'
import prisma from '../db/client.js'

export const handleConnection = (socket, io) => {
  console.log('User connected:', socket.id)

  // Handle request for messages
  socket.on('request_messages', async () => {
    try {
      const generalChannel = await prisma.channel.findFirst({
        where: { name: 'general' }
      })
      
      if (generalChannel) {
        const messages = await getMessagesByChannel(generalChannel.id)
        socket.emit('load_messages', messages.reverse())
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  })

  // Handle message sending
  socket.on('send_message', async (data) => {
    try {
      console.log('Message received:', data)
      
      // For now, create a temporary user if none exists
      let user = await getUserByUsername(data.author)
      if (!user) {
        user = await prisma.user.create({
          data: {
            username: data.author,
            isBot: false
          }
        })
      }

      // Get the general channel
      const generalChannel = await prisma.channel.findFirst({
        where: { name: 'general' }
      })

      // Save message to database
      const savedMessage = await createMessage({
        content: data.content,
        userId: user.id,
        channelId: generalChannel.id
      })

      // Format message for frontend
      const messageToSend = {
        id: savedMessage.id,
        author: savedMessage.user.username,
        avatar: savedMessage.user.avatar,
        content: savedMessage.content,
        timestamp: savedMessage.createdAt.toLocaleTimeString(),
        isBot: savedMessage.user.isBot
      }

      // Broadcast to all clients
      io.emit('new_message', messageToSend)
    } catch (error) {
      console.error('Error saving message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
}