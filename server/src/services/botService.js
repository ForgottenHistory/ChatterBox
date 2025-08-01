const { getService } = require('./serviceRegistry');

class BotService {
  constructor() {
    console.log('BotService initialized as facade');
  }

  // Delegate to BotManager
  getBotById(botId) {
    return getService('botManager').getBotById(botId);
  }

  createBot(config) {
    return getService('botManager').createBot(config);
  }

  deleteBot(botId) {
    return getService('botManager').deleteBot(botId);
  }

  updateBotStatus(botId, status) {
    return getService('botManager').updateBotStatus(botId, status);
  }

  getAllBots() {
    return getService('botManager').getAllBots();
  }

  getBotContext(botId) {
    return getService('botManager').getBotContext(botId);
  }

  getBotInitials(botName) {
    return getService('botManager').getBotInitials(botName);
  }

  isBotNameTaken(name) {
    return getService('botManager').isBotNameTaken(name);
  }

  // Delegate to LLMSettingsManager
  async getLLMSettings() {
    const manager = getService('llmSettingsManager');
    await manager.initialize(); // Ensure initialized
    return manager.getSettings();
  }

  async updateLLMSettings(settings) {
    const manager = getService('llmSettingsManager');
    await manager.initialize();
    return await manager.updateSettings(settings);
  }

  async resetLLMSettings() {
    const manager = getService('llmSettingsManager');
    await manager.initialize();
    return await manager.resetToDefaults();
  }

  async getDefaultLLMSettings() {
    const manager = getService('llmSettingsManager');
    await manager.initialize();
    return manager.getDefaultSettings();
  }

  // Delegate to ConversationHistory
  addToHistory(message) {
    getService('conversationHistory').addMessage(message);
  }

  getConversationContext() {
    return getService('conversationHistory').getRecentHistory();
  }

  // Delegate to ResponseLogic
  shouldRespond(message, mentionedBots = []) {
    const allBots = getService('botManager').bots;
    return getService('responseLogic').shouldRespond(message, allBots, mentionedBots);
  }

  // Delegate to ResponseGenerator
  async generateMessage(bot, message, room) {
    const conversationHistory = getService('conversationHistory').getRecentHistory();
    const llmSettings = await this.getLLMSettings();
    return getService('responseGenerator').generateMessage(bot, message, room, conversationHistory, llmSettings);
  }

  // Build system prompt (delegate to response generator)
  buildSystemPrompt(botContext, globalLlmSettings) {
    const PromptBuilder = require('./bot/promptBuilder');
    const promptBuilder = new PromptBuilder();
    return promptBuilder.buildSystemPrompt(botContext, null, globalLlmSettings);
  }

  // Get service status for debugging
  getStatus() {
    const botManager = getService('botManager');
    const conversationHistory = getService('conversationHistory');
    const llmSettingsManager = getService('llmSettingsManager');

    return {
      initialized: true,
      settingsFile: llmSettingsManager.getSettingsFilePath(),
      botCount: botManager.bots.length,
      conversationHistoryLength: conversationHistory.getAllHistory().length,
      architecture: 'decoupled'
    };
  }

  // Legacy method - now just emits event
  async processMessage(userMessage, room) {
    console.log('BotService.processMessage called - this should use MessageProcessor now');
    
    // For backward compatibility, we'll still process but recommend using events
    const eventBus = require('./eventBus');
    eventBus.emitMessageReceived(userMessage);
    
    // Return empty array since responses are now handled via events
    return [];
  }
}

module.exports = new BotService();