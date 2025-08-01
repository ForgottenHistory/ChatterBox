const { getService } = require('./serviceRegistry');

class BotService {
  constructor() {
    console.log('BotService facade initialized');
  }

  // Bot management - delegate to BotOrchestrationService
  getBotById(botId) {
    return getService('botOrchestrationService').getBotById(botId);
  }

  createBot(config) {
    return getService('botOrchestrationService').createBotWithValidation(config);
  }

  deleteBot(botId) {
    return getService('botOrchestrationService').deleteBot(botId);
  }

  updateBotStatus(botId, status) {
    return getService('botOrchestrationService').updateBotStatus(botId, status);
  }

  getAllBots() {
    return getService('botOrchestrationService').getAllBots();
  }

  getBotContext(botId) {
    return getService('botOrchestrationService').getBotContext(botId);
  }

  getBotInitials(botName) {
    return getService('botOrchestrationService').getBotInitials(botName);
  }

  isBotNameTaken(name) {
    return getService('botOrchestrationService').isBotNameTaken(name);
  }

  // LLM Configuration - delegate to LLMConfigurationService
  async getLLMSettings() {
    return await getService('llmConfigurationService').getSettings();
  }

  async updateLLMSettings(settings) {
    return await getService('llmConfigurationService').updateSettings(settings);
  }

  async resetLLMSettings() {
    return await getService('llmConfigurationService').resetSettings();
  }

  async getDefaultLLMSettings() {
    return await getService('llmConfigurationService').getDefaultSettings();
  }

  // Conversation management - delegate to ConversationService
  addToHistory(message) {
    return getService('conversationService').addMessage(message);
  }

  getConversationContext() {
    return getService('conversationService').getRecentHistory();
  }

  // Prompt building - delegate to PromptService
  buildSystemPrompt(botContext, globalLlmSettings) {
    return getService('promptService').buildSystemPrompt(botContext, globalLlmSettings);
  }

  // Legacy compatibility methods
  shouldRespond(message, mentionedBots = []) {
    const allBots = getService('botOrchestrationService').getAllBots();
    return getService('responseLogic').shouldRespond(message, allBots, mentionedBots);
  }

  async generateMessage(bot, message, room) {
    const conversationHistory = getService('conversationService').getRecentHistory();
    const llmSettings = await this.getLLMSettings();
    return getService('responseGenerator').generateMessage(bot, message, room, conversationHistory, llmSettings);
  }

  // Get comprehensive service status
  getStatus() {
    const botOrchestration = getService('botOrchestrationService').getStatus();
    const llmConfiguration = getService('llmConfigurationService').getStatus();
    const conversation = getService('conversationService').getStatus();
    const prompt = getService('promptService').getStatus();

    return {
      serviceName: 'BotService (Facade)',
      architecture: 'microservices',
      services: {
        botOrchestration,
        llmConfiguration,
        conversation,
        prompt
      },
      // Legacy compatibility fields
      initialized: true,
      botCount: botOrchestration.botCount || 0,
      conversationHistoryLength: conversation.totalMessages || 0
    };
  }

  // Deprecated - use MessageProcessor via events instead
  async processMessage(userMessage, room) {
    console.warn('BotService.processMessage is deprecated - use event system instead');
    const eventBus = require('./eventBus');
    eventBus.emitMessageReceived(userMessage);
    return []; // Return empty array for backward compatibility
  }
}

module.exports = new BotService();