const llmService = require('./llmService');

class BotService {
  constructor() {
    this.bots = []; // Start with empty array
    this.conversationHistory = []; // Store recent messages for context
    this.maxHistorySize = 50; // Keep last 50 messages

    console.log('BotService initialized for LLM-based bots');

    if (!llmService.isConfigured()) {
      console.warn('WARNING: FEATHERLESS_API_KEY not found in environment variables. LLM features will use fallbacks.');
    }
  }

  // Get bot by ID
  getBotById(botId) {
    return this.bots.find(bot => bot.id === botId);
  }

  // Create a new LLM-based bot
  createBot(config) {
    try {
      // Check if name is already taken
      if (this.isBotNameTaken(config.name)) {
        console.log(`Bot name '${config.name}' is already taken`);
        return null;
      }

      const now = new Date().toISOString();
      const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newBot = {
        type: 'bot',
        id: botId,
        username: config.name,
        avatar: config.avatar || '#7289DA',
        avatarType: config.avatarType || 'initials',
        status: 'online',
        joinedAt: now,
        lastActive: now,

        // LLM Bot specific fields
        description: config.description || '',
        firstMessage: config.firstMessage || '',
        exampleMessages: config.exampleMessages || '',
        systemPrompt: config.systemPrompt || '',

        // Legacy fields for compatibility (not used in LLM mode)
        personality: 'friendly',
        triggers: [],
        responses: [],
        responseChance: 1.0 // Always respond when addressed
      };

      // Add to bots array
      this.bots.push(newBot);

      console.log(`Created new LLM bot: ${newBot.username} (${newBot.id})`);
      console.log(`  - Description: ${newBot.description.substring(0, 50)}...`);
      console.log(`  - Has system prompt: ${!!newBot.systemPrompt}`);
      console.log(`  - Has first message: ${!!newBot.firstMessage}`);

      return newBot;
    } catch (error) {
      console.error('Error creating bot:', error);
      return null;
    }
  }

  // Delete a bot
  deleteBot(botId) {
    try {
      const initialLength = this.bots.length;
      this.bots = this.bots.filter(bot => bot.id !== botId);

      const wasDeleted = this.bots.length < initialLength;

      if (wasDeleted) {
        console.log(`Deleted bot: ${botId}`);
      }

      return wasDeleted;
    } catch (error) {
      console.error('Error deleting bot:', error);
      return false;
    }
  }

  // Check if bot name already exists
  isBotNameTaken(name) {
    return this.bots.some(bot =>
      bot.username.toLowerCase() === name.toLowerCase()
    );
  }

  // Add message to conversation history
  addToHistory(message) {
    this.conversationHistory.push({
      content: message.content || message.message,
      username: message.author?.username || message.username,
      isBot: message.author?.type === 'bot' || message.isBot,
      timestamp: message.timestamp || new Date().toISOString()
    });

    // Keep only recent messages
    if (this.conversationHistory.length > this.maxHistorySize) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistorySize);
    }
  }

  // Determine which bots should respond based on mentions or content
  shouldRespond(message, mentionedBots = []) {
    console.log('Checking if LLM bots should respond to:', message.content || message.message);

    // For now, return mentioned bots or check for simple triggers
    let respondingBots = [];

    // Add explicitly mentioned bots
    respondingBots = mentionedBots.filter(botId => {
      const bot = this.getBotById(botId);
      return bot && bot.status === 'online';
    }).map(botId => this.getBotById(botId));

    // Simple trigger check: if message contains bot name, let it respond
    const messageContent = (message.content || message.message || '').toLowerCase();

    this.bots.forEach(bot => {
      if (bot.status === 'online' && !respondingBots.find(b => b.id === bot.id)) {
        // Check if bot name is mentioned
        if (messageContent.includes(bot.username.toLowerCase())) {
          respondingBots.push(bot);
        }
        // Or random chance to join conversation (very low for testing)
        else if (Math.random() < 0.05) { // 5% chance to randomly respond
          respondingBots.push(bot);
        }
      }
    });

    console.log('LLM bots that will respond:', respondingBots.map(b => b.username));
    return respondingBots;
  }

  // Generate a message from an LLM bot
  async generateMessage(bot, message, room) {
    console.log(`Generating LLM response for bot: ${bot.username}`);

    try {
      // Get bot context for LLM
      const botContext = this.getBotContext(bot.id);

      if (!botContext) {
        throw new Error('Bot context not found');
      }

      // Generate response using LLM service
      const responseContent = await llmService.generateResponse(
        botContext,
        message,
        this.conversationHistory
      );

      // Update bot's last active time
      bot.lastActive = new Date().toISOString();

      return {
        id: `${Date.now()}-${bot.id}-${Math.random().toString(36).substr(2, 9)}`,
        content: responseContent,
        timestamp: new Date().toISOString(),
        room: room,
        author: {
          ...bot,
          lastActive: bot.lastActive
        }
      };

    } catch (error) {
      console.error(`Error generating message for ${bot.username}:`, error);

      // Fallback to simple response
      const fallbackContent = bot.firstMessage || `Hello! I'm ${bot.username}. How can I help?`;

      return {
        id: `${Date.now()}-${bot.id}-${Math.random().toString(36).substr(2, 9)}`,
        content: fallbackContent,
        timestamp: new Date().toISOString(),
        room: room,
        author: {
          ...bot,
          lastActive: new Date().toISOString()
        }
      };
    }
  }

  // Process a user message and return bot responses
  async processMessage(userMessage, room) {
    console.log('Processing message for LLM bots in room:', room);

    // Add user message to history first
    this.addToHistory(userMessage);

    // Determine which bots should respondF
    const respondingBots = this.shouldRespond(userMessage);

    if (respondingBots.length === 0) {
      console.log('No LLM bots will respond to this message');
      return [];
    }

    const responses = [];

    // Generate responses from each bot
    for (const bot of respondingBots) {
      try {
        const response = await this.generateMessage(bot, userMessage, room);
        responses.push(response);

        // Add bot response to history for context
        this.addToHistory(response);

      } catch (error) {
        console.error(`Failed to generate response from ${bot.username}:`, error);
      }
    }

    console.log('LLM bot responses generated:', responses.length);
    return responses;
  }

  // Update bot status
  updateBotStatus(botId, status) {
    const bot = this.getBotById(botId);
    if (bot) {
      bot.status = status;
      bot.lastActive = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Get all bots (for sidebar display)
  getAllBots() {
    return this.bots.map(bot => ({
      id: bot.id,
      username: bot.username,
      status: bot.status,
      avatar: bot.avatar,
      avatarType: bot.avatarType,
      joinedAt: bot.joinedAt,
      lastActive: bot.lastActive,
      description: bot.description
    }));
  }

  // Get bot data for LLM context
  getBotContext(botId) {
    const bot = this.getBotById(botId);
    if (!bot) return null;

    return {
      name: bot.username,
      description: bot.description,
      systemPrompt: bot.systemPrompt,
      firstMessage: bot.firstMessage,
      exampleMessages: bot.exampleMessages
    };
  }

  // Get initials for a bot (used for avatar display)
  getBotInitials(botName) {
    return botName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}

module.exports = new BotService();