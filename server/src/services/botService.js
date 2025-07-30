class BotService {
  constructor() {
    this.bots = []; // Start with empty array
    console.log('BotService initialized for LLM-based bots');
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

  // For LLM bots, we'll determine if they should respond based on being mentioned
  // or if the message is directed at them
  shouldRespond(message, mentionedBots = []) {
    console.log('Checking if LLM bots should respond to:', message);
    
    // For now, return mentioned bots or empty array
    // Later this will be replaced with LLM-based decision making
    const respondingBots = mentionedBots.filter(botId => {
      const bot = this.getBotById(botId);
      return bot && bot.status === 'online';
    }).map(botId => this.getBotById(botId));

    console.log('LLM bots that will respond:', respondingBots.map(b => b.username));
    return respondingBots;
  }

  // Generate a message from an LLM bot
  // For now, this is a placeholder - will be replaced with actual LLM calls
  async generateMessage(bot, message, room) {
    console.log(`Generating LLM response for bot: ${bot.username}`);
    
    // Placeholder response - this will be replaced with LLM API calls
    const placeholderResponses = [
      `Hello! I'm ${bot.username}. I'm an AI assistant ready to help.`,
      `Hi there! ${bot.username} here. How can I assist you today?`,
      `Greetings! This is ${bot.username}. What would you like to talk about?`
    ];
    
    // Use first message if available, otherwise use placeholder
    let responseContent;
    if (bot.firstMessage && Math.random() < 0.3) {
      responseContent = bot.firstMessage;
    } else {
      responseContent = placeholderResponses[Math.floor(Math.random() * placeholderResponses.length)];
    }

    return {
      id: `${Date.now()}-${bot.id}-${Math.random().toString(36).substr(2, 9)}`,
      content: responseContent,
      timestamp: new Date().toISOString(),
      room: room,
      author: {
        ...bot,
        lastActive: new Date().toISOString()
      }
    };
  }

  // Process a user message and return bot responses
  // This is simplified for LLM bots - they'll respond when mentioned or addressed
  async processMessage(userMessage, room) {
    console.log('Processing message for LLM bots:', userMessage, 'in room:', room);
    
    // Handle both legacy and new message formats
    const messageContent = userMessage.content || userMessage.message || userMessage;
    console.log('Message content extracted:', messageContent);

    // For now, don't auto-respond - wait for LLM integration
    // In the future, this will use LLM to determine which bots should respond
    const responses = [];

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