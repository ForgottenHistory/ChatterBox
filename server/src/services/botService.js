const BotManager = require('./bot/botManager');
const ConversationHistory = require('./bot/conversationHistory');
const ResponseGenerator = require('./bot/responseGenerator');
const ResponseLogic = require('./bot/responseLogic');

class BotService {
  constructor() {
    this.botManager = new BotManager();
    this.conversationHistory = new ConversationHistory();
    this.responseGenerator = new ResponseGenerator();
    this.responseLogic = new ResponseLogic();

    console.log('BotService initialized with modular components');
  }

  // Bot management methods (delegate to BotManager)
  getBotById(botId) {
    return this.botManager.getBotById(botId);
  }

  createBot(config) {
    return this.botManager.createBot(config);
  }

  deleteBot(botId) {
    return this.botManager.deleteBot(botId);
  }

  updateBotStatus(botId, status) {
    return this.botManager.updateBotStatus(botId, status);
  }

  getAllBots() {
    return this.botManager.getAllBots();
  }

  getBotContext(botId) {
    return this.botManager.getBotContext(botId);
  }

  getBotInitials(botName) {
    return this.botManager.getBotInitials(botName);
  }

  isBotNameTaken(name) {
    return this.botManager.isBotNameTaken(name);
  }

  // Conversation methods (delegate to ConversationHistory)
  addToHistory(message) {
    this.conversationHistory.addMessage(message);
  }

  getConversationContext() {
    return this.conversationHistory.getRecentHistory();
  }

  // Response logic methods (delegate to ResponseLogic)
  shouldRespond(message, mentionedBots = []) {
    const allBots = this.botManager.bots;
    return this.responseLogic.shouldRespond(message, allBots, mentionedBots);
  }

  // Response generation methods (delegate to ResponseGenerator)
  async generateMessage(bot, message, room) {
    const conversationHistory = this.conversationHistory.getRecentHistory();
    return this.responseGenerator.generateMessage(bot, message, room, conversationHistory);
  }

  // Main message processing method
  async processMessage(userMessage, room) {
    console.log('Processing message for LLM bots in room:', room);

    // Add user message to history first
    this.addToHistory(userMessage);

    // Determine which bots should respond
    const respondingBots = this.shouldRespond(userMessage);

    if (respondingBots.length === 0) {
      console.log('No LLM bots will respond to this message');
      return [];
    }

    // Generate responses from selected bots
    const responses = await this.responseGenerator.generateMultipleResponses(
      respondingBots,
      userMessage,
      room,
      this.conversationHistory.getRecentHistory()
    );

    // Add bot responses to history for future context
    responses.forEach(response => {
      this.addToHistory(response);
    });

    console.log('LLM bot responses generated:', responses.length);
    return responses;
  }

  // Configuration methods
  setRandomResponseChance(chance) {
    this.responseLogic.setRandomResponseChance(chance);
  }

  clearConversationHistory() {
    this.conversationHistory.clearHistory();
  }
}

module.exports = new BotService();