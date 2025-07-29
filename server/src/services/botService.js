const bots = [
  {
    id: 'chatty-bot',
    name: 'ChattyBot',
    personality: 'friendly',
    triggers: ['hello', 'hi', 'hey', 'chatty'],
    responses: [
      "Hey there! How's everyone doing today? 😊",
      "Hello! Great to see some activity in here!",
      "Hi! I'm ChattyBot, always ready for a good conversation!",
      "Hey! What's on your mind today?"
    ]
  },
  {
    id: 'sarcastic-ai',
    name: 'SarcasticAI',
    personality: 'sarcastic',
    triggers: ['help', 'thanks', 'thank you', 'sarcastic'],
    responses: [
      "Oh, how *wonderful* that you need help... 🙄",
      "Thanks? How surprising, someone with manners!",
      "Well, well, well... look who needs assistance.",
      "Sure, because helping humans is *exactly* what I live for."
    ]
  },
  {
    id: 'helper-bot',
    name: 'HelperBot',
    personality: 'helpful',
    triggers: ['help', 'how', 'what', 'helper'],
    responses: [
      "I'm here to help! What do you need assistance with?",
      "Happy to help! Feel free to ask me anything.",
      "How can I assist you today? I'm at your service!",
      "Always ready to lend a helping hand! 🤝"
    ]
  }
];

class BotService {
  constructor() {
    this.bots = bots;
    this.responseDelay = 1000; // 1 second delay to make it feel natural
  }

  // Check if a message should trigger a bot response
  shouldRespond(message) {
    const messageText = message.toLowerCase();
    const respondingBots = [];

    this.bots.forEach(bot => {
      const shouldTrigger = bot.triggers.some(trigger => 
        messageText.includes(trigger.toLowerCase())
      );

      if (shouldTrigger) {
        // Random chance to respond (70% chance)
        if (Math.random() < 0.7) {
          respondingBots.push(bot);
        }
      }
    });

    return respondingBots;
  }

  // Generate a bot response
  generateResponse(bot) {
    const randomResponse = bot.responses[Math.floor(Math.random() * bot.responses.length)];
    
    return {
      id: Date.now().toString() + '-' + bot.id,
      username: bot.name,
      message: randomResponse,
      timestamp: new Date().toLocaleTimeString(),
      isBot: true,
      botId: bot.id,
      personality: bot.personality
    };
  }

  // Process a user message and return bot responses
  async processMessage(userMessage, room) {
    const respondingBots = this.shouldRespond(userMessage.message);
    const responses = [];

    for (const bot of respondingBots) {
      // Add a small delay between bot responses
      await this.delay(this.responseDelay + Math.random() * 2000);
      
      const response = this.generateResponse(bot);
      response.room = room;
      responses.push(response);
    }

    return responses;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get all bots info
  getAllBots() {
    return this.bots.map(bot => ({
      id: bot.id,
      name: bot.name,
      personality: bot.personality,
      status: 'online' // For now, all bots are online
    }));
  }
}

module.exports = new BotService();