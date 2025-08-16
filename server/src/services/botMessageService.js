import { llmService } from './llmService.js'
import { createMessage, getMessagesByChannel } from './messageService.js'
import { getAllBots } from './userService.js'
import prisma from '../db/client.js'

class BotMessageService {
  constructor() {
    this.botIntervals = new Map() // Track bot timers
  }

  async generateBotResponse(bot, channelId, triggerContext = {}) {
    try {
      console.log(`🤖 Generating response for bot: ${bot.username}`)

      // Get recent conversation history
      const recentMessages = await getMessagesByChannel(channelId, 10)
      const conversationHistory = this.formatConversationHistory(recentMessages)

      // Get the last user message if available
      const lastUserMessage = recentMessages
        .reverse()
        .find(msg => !msg.user.isBot)

      // Prepare template variables
      const templateVariables = {
        system_prompt: bot.systemPrompt || 'You are a helpful AI assistant.',
        character_name: bot.username,
        character_description: bot.bio || 'A friendly AI assistant.',
        character_personality: bot.personality || 'Helpful and engaging.',
        conversation_history: conversationHistory,
        user_name: lastUserMessage?.user.username || 'User',
        user_message: lastUserMessage?.content || '',
        channel_name: 'general', // TODO: Get actual channel name
        timestamp: new Date().toISOString(),
        // Add trigger context
        ...triggerContext
      }

      console.log('📝 Template variables prepared:', {
        botName: templateVariables.character_name,
        historyLength: conversationHistory.length,
        lastUserMessage: templateVariables.user_message?.substring(0, 50) + '...'
      })

      // Generate response using LLM
      const generatedContent = await llmService.generateResponse(templateVariables)

      // Create and save the bot message
      const botMessage = await createMessage({
        content: generatedContent,
        userId: bot.id,
        channelId: channelId
      })

      console.log(`✅ Bot message created: "${generatedContent.substring(0, 50)}..."`)

      return {
        message: botMessage,
        formattedMessage: {
          id: botMessage.id,
          author: botMessage.user.username,
          avatar: botMessage.user.avatar,
          content: botMessage.content,
          timestamp: botMessage.createdAt.toLocaleTimeString(),
          isBot: true
        }
      }

    } catch (error) {
      console.error(`❌ Bot response generation failed for ${bot.username}:`, error)
      
      // Create a fallback error message
      const fallbackMessage = await createMessage({
        content: `*[Error generating response: ${error.message}]*`,
        userId: bot.id,
        channelId: channelId
      })

      return {
        message: fallbackMessage,
        formattedMessage: {
          id: fallbackMessage.id,
          author: fallbackMessage.user.username,
          avatar: fallbackMessage.user.avatar,
          content: fallbackMessage.content,
          timestamp: fallbackMessage.createdAt.toLocaleTimeString(),
          isBot: true
        }
      }
    }
  }

  formatConversationHistory(messages, maxMessages = 8) {
    if (!messages || messages.length === 0) {
      return 'No previous conversation.'
    }

    // Take the most recent messages and format them
    const recentMessages = messages
      .slice(-maxMessages)
      .reverse() // Oldest first
      .map(msg => `${msg.user.username}: ${msg.content}`)
      .join('\n')

    return recentMessages
  }

  async triggerBotResponse(botId, channelId, triggerType = 'interval') {
    try {
      const bot = await prisma.user.findUnique({
        where: { id: botId, isBot: true }
      })

      if (!bot || !bot.isActive) {
        console.log(`⏸️ Bot ${botId} is not active, skipping response`)
        return null
      }

      const triggerContext = {
        trigger_type: triggerType,
        trigger_time: new Date().toISOString()
      }

      return await this.generateBotResponse(bot, channelId, triggerContext)

    } catch (error) {
      console.error(`❌ Error triggering bot response:`, error)
      return null
    }
  }

  // Future: Enhanced triggering based on mentions, keywords, etc.
  shouldBotRespond(bot, message, channelActivity) {
    // Basic logic - can be enhanced later
    if (!bot.isActive) return false
    
    // Don't respond to other bots (for now)
    if (message?.user?.isBot) return false

    // Could add:
    // - Mention detection: message.content.includes(`@${bot.username}`)
    // - Keyword triggers: bot.keywords?.some(keyword => message.content.includes(keyword))
    // - Random chance based on activity level
    // - Time since last bot message
    
    return true // For now, let interval-based triggering handle it
  }

  startBotScheduling(io) {
    console.log('🔄 Starting bot scheduling system...')
    
    // Schedule periodic bot activity
    setInterval(async () => {
      await this.processBotSchedule(io)
    }, 60000) // Check every minute
  }

  async processBotSchedule(io) {
    try {
      const activeBots = await getAllBots()
      const generalChannel = await this.ensureGeneralChannel()

      if (!generalChannel) {
        console.log('⚠️ No general channel available for bot scheduling')
        return
      }

      for (const bot of activeBots) {
        if (!bot.isActive) continue

        const shouldTrigger = await this.shouldBotTriggerNow(bot)
        if (shouldTrigger) {
          console.log(`⏰ Triggering scheduled response for ${bot.username}`)
          
          const result = await this.triggerBotResponse(bot.id, generalChannel.id, 'scheduled')
          
          if (result && io) {
            // Broadcast the bot message
            io.emit('new_message', result.formattedMessage)
          }

          // Update last message time
          await prisma.user.update({
            where: { id: bot.id },
            data: { lastMessageAt: new Date() }
          })
        }
      }
    } catch (error) {
      console.error('❌ Error in bot schedule processing:', error)
    }
  }

  async shouldBotTriggerNow(bot) {
    const now = new Date()
    const lastMessage = bot.lastMessageAt || bot.createdAt
    const timeSinceLastMessage = now - lastMessage
    const triggerIntervalMs = (bot.triggerInterval || 10) * 60 * 1000 // Convert minutes to ms

    return timeSinceLastMessage >= triggerIntervalMs
  }

  // Ensure the general channel exists, create if it doesn't
  async ensureGeneralChannel() {
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
}

export const botMessageService = new BotMessageService()