import { createMessage, getMessagesByChannel } from '../services/messageService.js'
import { getUserByUsername } from '../services/userService.js'
import { botMessageService } from '../services/botMessageService.js'
import prisma from '../db/client.js'

let isSchedulingStarted = false

export const handleConnection = (socket, io) => {
  console.log('User connected:', socket.id)

  // Start bot scheduling system (only once)
  if (!isSchedulingStarted) {
    botMessageService.startBotScheduling(io)
    isSchedulingStarted = true
    console.log('🤖 Bot scheduling system initialized')
  }

  // Handle request for messages
  socket.on('request_messages', async () => {
    try {
      const generalChannel = await ensureGeneralChannel()
      
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
      console.log('💬 Message received:', data)
      
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

      // Get or create the general channel
      const generalChannel = await ensureGeneralChannel()
      
      if (!generalChannel) {
        console.error('Failed to get or create general channel')
        socket.emit('error', { message: 'Channel not available' })
        return
      }

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

      // Trigger bot responses (with small delay for natural feel)
      setTimeout(async () => {
        await tryTriggerBotResponses(generalChannel.id, io, savedMessage)
      }, 2000 + Math.random() * 3000) // 2-5 second delay

    } catch (error) {
      console.error('Error saving message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  // Handle manual bot trigger (for testing)
  socket.on('trigger_bot', async (data) => {
    try {
      const { botId } = data
      const generalChannel = await ensureGeneralChannel()

      if (generalChannel) {
        const result = await botMessageService.triggerBotResponse(botId, generalChannel.id, 'manual')
        if (result) {
          io.emit('new_message', result.formattedMessage)
        }
      }
    } catch (error) {
      console.error('Error triggering bot:', error)
      socket.emit('error', { message: 'Failed to trigger bot' })
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
}

async function tryTriggerBotResponses(channelId, io, userMessage) {
  try {
    // Get all active bots
    const activeBots = await prisma.user.findMany({
      where: { 
        isBot: true, 
        isActive: true 
      }
    })

    // Randomly select 1-2 bots to respond (not all at once)
    const respondingBots = activeBots
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, Math.floor(Math.random() * 2) + 1) // 1-2 bots

    console.log(`🎯 ${respondingBots.length} bots will respond to: "${userMessage.content}"`)

    for (let i = 0; i < respondingBots.length; i++) {
      const bot = respondingBots[i]
      
      // Stagger responses
      setTimeout(async () => {
        try {
          const result = await botMessageService.triggerBotResponse(bot.id, channelId, 'message_response')
          if (result) {
            io.emit('new_message', result.formattedMessage)
            
            // Update bot's last message time
            await prisma.user.update({
              where: { id: bot.id },
              data: { lastMessageAt: new Date() }
            })
          }
        } catch (error) {
          console.error(`Error triggering bot ${bot.username}:`, error)
        }
      }, i * (3000 + Math.random() * 2000)) // 3-5 seconds between bot responses
    }

  } catch (error) {
    console.error('Error in bot response triggering:', error)
  }
}

// Ensure the general channel exists, create if it doesn't
async function ensureGeneralChannel() {
  try {
    let generalChannel = await prisma.channel.findFirst({
      where: { name: 'general' }
    })

    if (!generalChannel) {
      console.log('📝 Creating general channel...')
      generalChannel = await prisma.channel.create({
        data: {
          name: 'general',
          description: 'General discussion'
        }
      })
      console.log('✅ General channel created')
    }

    return generalChannel
  } catch (error) {
    console.error('❌ Error ensuring general channel exists:', error)
    return null
  }
}