class LLMConfigurationService {
  constructor(llmSettingsManager, llmService) {
    this.llmSettingsManager = llmSettingsManager;
    this.llmService = llmService;
    this.initialized = false;
    
    this.initialize();
    console.log('LLMConfigurationService initialized');
  }

  async initialize() {
    try {
      // Initialize settings manager
      await this.llmSettingsManager.initialize();
      
      // Sync concurrent limit with LLM service
      const settings = this.llmSettingsManager.getSettings();
      if (settings.maxConcurrent) {
        this.llmService.setMaxConcurrentRequests(settings.maxConcurrent);
        console.log(`Concurrent limit loaded from settings: ${settings.maxConcurrent}`);
      }

      this.initialized = true;
      console.log('LLMConfigurationService fully initialized');
    } catch (error) {
      console.error('Failed to initialize LLMConfigurationService:', error);
      this.initialized = false;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Settings management
  async getSettings() {
    await this.ensureInitialized();
    return this.llmSettingsManager.getSettings();
  }

  async updateSettings(settings) {
    await this.ensureInitialized();
    
    const result = await this.llmSettingsManager.updateSettings(settings);
    
    // Update LLM service if settings update was successful
    if (result.success && settings.maxConcurrent) {
      this.llmService.setMaxConcurrentRequests(settings.maxConcurrent);
    }
    
    return result;
  }

  async resetSettings() {
    await this.ensureInitialized();
    
    const result = await this.llmSettingsManager.resetToDefaults();
    
    // Reset LLM service to default concurrent limit
    if (result.success) {
      const defaultSettings = this.llmSettingsManager.getDefaultSettings();
      this.llmService.setMaxConcurrentRequests(defaultSettings.maxConcurrent);
    }
    
    return result;
  }

  async getDefaultSettings() {
    await this.ensureInitialized();
    return this.llmSettingsManager.getDefaultSettings();
  }

  // Model management
  getCurrentModel() {
    return this.llmService.getCurrentModel();
  }

  setModel(modelId) {
    return this.llmService.setModel(modelId);
  }

  resetToDefaultModel() {
    return this.llmService.resetToDefaultModel();
  }

  async getModelStatus() {
    return await this.llmService.getEnhancedStatus();
  }

  // Queue management
  getQueueStatus() {
    return this.llmService.getQueueStatus();
  }

  setMaxConcurrentRequests(limit) {
    this.llmService.setMaxConcurrentRequests(limit);
    
    // Also update in persistent settings if service is initialized
    if (this.initialized) {
      this.updateSettings({ maxConcurrent: limit }).catch(error => {
        console.warn('Failed to persist concurrent limit setting:', error);
      });
    }
  }

  clearQueue() {
    return this.llmService.clearQueue();
  }

  // Configuration validation
  validateConfiguration() {
    const issues = [];

    // Check API key
    if (!process.env.FEATHERLESS_API_KEY) {
      issues.push('FEATHERLESS_API_KEY environment variable not set');
    }

    // Check if service is initialized
    if (!this.initialized) {
      issues.push('LLM configuration service not properly initialized');
    }

    // Check queue status
    const queueStatus = this.getQueueStatus();
    if (queueStatus.queuedRequests > 50) {
      issues.push(`High queue backlog: ${queueStatus.queuedRequests} requests`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      configured: issues.length === 0
    };
  }

  // Test LLM functionality
  async testConfiguration(testPrompt = "Hello, respond with 'Test successful'") {
    await this.ensureInitialized();
    
    try {
      const result = await this.llmService.testGeneration(testPrompt);
      return {
        success: result.success,
        response: result.response,
        model: result.model,
        queueStatus: result.queueStatus,
        message: result.success ? 'LLM configuration test passed' : 'LLM configuration test failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'LLM configuration test failed with error'
      };
    }
  }

  // Get comprehensive status
  async getComprehensiveStatus() {
    await this.ensureInitialized();
    
    const settings = await this.getSettings();
    const modelStatus = await this.getModelStatus();
    const queueStatus = this.getQueueStatus();
    const validation = this.validateConfiguration();

    return {
      initialized: this.initialized,
      configured: validation.configured,
      settings,
      model: modelStatus,
      queue: queueStatus,
      validation,
      serviceName: 'LLMConfigurationService'
    };
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.initialized,
      configured: !!process.env.FEATHERLESS_API_KEY,
      currentModel: this.getCurrentModel(),
      serviceName: 'LLMConfigurationService'
    };
  }
}

module.exports = LLMConfigurationService;