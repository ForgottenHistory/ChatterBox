const BotManager = require('../managers/botManager');
const ConversationHistory = require('./bot/conversationHistory');
const ResponseGenerator = require('./bot/responseGenerator');
const ResponseLogic = require('./bot/responseLogic');
const LLMSettingsManager = require('../managers/llmSettingsManager');

class BotService {
  constructor() {
    this.botManager = new BotManager();
    this.conversationHistory = new ConversationHistory();
    this.responseGenerator = new ResponseGenerator();
    this.responseLogic = new ResponseLogic();
    this.llmSettingsManager = new LLMSettingsManager();
    this.initialized = false;

    // Initialize asynchronously
    this.initialize();

    console.log('BotService initialized with modular components');
  }

  async initialize() {
    try {
      // Wait for LLM settings manager to initialize
      await this.llmSettingsManager.initialize();
      this.initialized = true;
      console.log('BotService fully initialized');
    } catch (error) {
      console.error('Failed to initialize BotService:', error);
      this.initialized = false;
    }
  }

  // Ensure service is initialized before performing operations
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
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

  // LLM Settings methods (delegate to LLMSettingsManager with async support)
  async getLLMSettings() {
    await this.ensureInitialized();
    return this.llmSettingsManager.getSettings();
  }

  async updateLLMSettings(settings) {
    await this.ensureInitialized();
    return await this.llmSettingsManager.updateSettings(settings);
  }

  async resetLLMSettings() {
    await this.ensureInitialized();
    return await this.llmSettingsManager.resetToDefaults();
  }

  async getDefaultLLMSettings() {
    await this.ensureInitialized();
    return this.llmSettingsManager.getDefaultSettings();
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
    await this.ensureInitialized();
    const conversationHistory = this.conversationHistory.getRecentHistory();
    const llmSettings = this.llmSettingsManager.getSettings();
    return this.responseGenerator.generateMessage(bot, message, room, conversationHistory, llmSettings);
  }

  // Main message processing method
  async processMessage(userMessage, room) {
    console.log('Processing message for LLM bots in room:', room);

    // Ensure we're initialized
    await this.ensureInitialized();

    // Determine which bots should respond (don't add to history yet)
    const respondingBots = this.shouldRespond(userMessage);

    if (respondingBots.length === 0) {
      console.log('No LLM bots will respond to this message');
      // Add user message to history even if no bots respond
      this.addToHistory(userMessage);
      return [];
    }

    // Generate responses from selected bots (using current history without the new message)
    const llmSettings = this.llmSettingsManager.getSettings();
    const responses = await this.responseGenerator.generateMultipleResponses(
      respondingBots,
      userMessage,
      room,
      this.conversationHistory.getRecentHistory(),
      llmSettings
    );

    // Now add user message and bot responses to history
    this.addToHistory(userMessage);
    responses.forEach(response => {
      this.addToHistory(response);
    });

    console.log('LLM bot responses generated:', responses.length);
    return responses;
  }

  // Get service status for debugging
  getStatus() {
    return {
      initialized: this.initialized,
      settingsFile: this.llmSettingsManager.getSettingsFilePath(),
      botCount: this.botManager.bots.length,
      conversationHistoryLength: this.conversationHistory.getAllHistory().length
    };
  }
}

module.exports = new BotService();