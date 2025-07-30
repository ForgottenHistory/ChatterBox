class BotService {
  constructor() {
    this.bots = []; // Start with empty array instead of default bots
    this.responseDelay = 1000; // 1 second delay to make it feel natural
    console.log('BotService initialized with', this.bots.length, 'bots');
  }

  // Get bot by ID
  getBotById(botId) {
    return this.bots.find(bot => bot.id === botId);
  }

  // Create a new bot
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
        avatarType: 'initials',
        status: 'online',
        joinedAt: now,
        lastActive: now,
        personality: config.personality,
        triggers: config.triggers,
        responses: config.responses,
        responseChance: config.responseChance || 0.7
      };

      // Add to bots array
      this.bots.push(newBot);
      
      console.log(`Created new bot: ${newBot.username} (${newBot.id})`);
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

  // Check if a message should trigger bot responses
  shouldRespond(message) {
    console.log('Checking if message should trigger bots:', message);
    const messageText = message.toLowerCase();
    const respondingBots = [];

    this.bots.forEach(bot => {
      console.log(`Checking bot ${bot.username} with triggers:`, bot.triggers);
      
      const shouldTrigger = bot.triggers.some(trigger => {
        const matches = messageText.includes(trigger.toLowerCase());
        console.log(`  Trigger "${trigger}" matches: ${matches}`);
        return matches;
      });

      if (shouldTrigger) {
        console.log(`Bot ${bot.username} should trigger. Rolling dice with chance ${bot.responseChance}`);
        const roll = Math.random();
        console.log(`  Rolled: ${roll}, needed: ${bot.responseChance}`);
        
        if (roll < bot.responseChance) {
          console.log(`  Bot ${bot.username} will respond!`);
          respondingBots.push(bot);
        } else {
          console.log(`  Bot ${bot.username} chose not to respond this time`);
        }
      } else {
        console.log(`Bot ${bot.username} not triggered`);
      }
    });

    console.log('Final responding bots:', respondingBots.map(b => b.username));
    return respondingBots;
  }

  // Generate a message from a bot
  generateMessage(bot, room) {
    const randomResponse = bot.responses[Math.floor(Math.random() * bot.responses.length)];

    return {
      id: `${Date.now()}-${bot.id}-${Math.random().toString(36).substr(2, 9)}`,
      content: randomResponse,
      timestamp: new Date().toISOString(),
      room: room,
      author: {
        ...bot,
        lastActive: new Date().toISOString()
      }
    };
  }

  // Process a user message and return bot responses
  async processMessage(userMessage, room) {
    console.log('Processing message:', userMessage, 'in room:', room);
    
    // Handle both legacy and new message formats
    const messageContent = userMessage.content || userMessage.message || userMessage;
    console.log('Message content extracted:', messageContent);

    const respondingBots = this.shouldRespond(messageContent);
    const responses = [];

    for (const bot of respondingBots) {
      console.log(`Generating response for bot: ${bot.username}`);
      
      // Add a small delay between bot responses
      await this.delay(this.responseDelay + Math.random() * 2000);

      const response = this.generateMessage(bot, room);
      console.log('Generated response:', response);
      responses.push(response);
    }

    console.log('Total responses generated:', responses.length);
    return responses;
  }

  // Update bot status (for admin features)
  updateBotStatus(botId, status) {
    const bot = this.getBotById(botId);
    if (bot) {
      bot.status = status;
      bot.lastActive = new Date().toISOString();
      return true;
    }
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get all bots (for sidebar display)
  getAllBots() {
    return this.bots.map(bot => ({
      id: bot.id,
      username: bot.username,
      personality: bot.personality,
      status: bot.status,
      avatar: bot.avatar,
      avatarType: bot.avatarType,
      joinedAt: bot.joinedAt,
      lastActive: bot.lastActive
    }));
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