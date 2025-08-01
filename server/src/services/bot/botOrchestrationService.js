// services/botOrchestrationService.js
class BotOrchestrationService {
  constructor(botManager, llmSettingsManager) {
    this.botManager = botManager;
    this.llmSettingsManager = llmSettingsManager;
    this.initialized = false;
    
    this.initialize();
    console.log('BotOrchestrationService initialized');
  }

  async initialize() {
    try {
      // Wait for LLM settings manager to initialize
      await this.llmSettingsManager.initialize();
      this.initialized = true;
      console.log('BotOrchestrationService fully initialized');
    } catch (error) {
      console.error('Failed to initialize BotOrchestrationService:', error);
      this.initialized = false;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Bot management methods
  getBotById(botId) {
    return this.botManager.getBotById(botId);
  }

  async createBot(config) {
    await this.ensureInitialized();
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

  // Get comprehensive bot status
  async getBotStatus() {
    await this.ensureInitialized();
    const bots = this.botManager.getAllBots();
    const settings = this.llmSettingsManager.getSettings();
    
    return {
      totalBots: bots.length,
      onlineBots: bots.filter(bot => bot.status === 'online').length,
      offlineBots: bots.filter(bot => bot.status === 'offline').length,
      awayBots: bots.filter(bot => bot.status === 'away').length,
      botsWithCustomSettings: bots.filter(bot => bot.llmSettings).length,
      globalLlmConfigured: !!settings.systemPrompt
    };
  }

  // Validate bot configuration
  validateBotConfig(config) {
    const errors = [];

    if (!config.name || typeof config.name !== 'string') {
      errors.push('Bot name is required and must be a string');
    }

    if (config.name && this.isBotNameTaken(config.name.trim())) {
      errors.push('Bot name is already taken');
    }

    if (config.llmSettings) {
      // Validate LLM settings if provided
      try {
        this.llmSettingsManager.validateSettings(config.llmSettings);
      } catch (error) {
        errors.push(`Invalid LLM settings: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create bot with validation
  async createBotWithValidation(config) {
    await this.ensureInitialized();
    
    const validation = this.validateBotConfig(config);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    try {
      const bot = this.botManager.createBot(config);
      return {
        success: true,
        bot: {
          id: bot.id,
          username: bot.username,
          status: bot.status,
          avatar: bot.avatar,
          avatarType: bot.avatarType,
          joinedAt: bot.joinedAt,
          description: bot.description
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.initialized,
      botCount: this.botManager.bots.length,
      serviceName: 'BotOrchestrationService'
    };
  }
}

module.exports = BotOrchestrationService;