const LLMQueueManager = require('../managers/llmQueueManager');
const ModelManager = require('../managers/modelManager');
const PromptManager = require('../managers/promptManager');
const ParameterManager = require('../managers/parameterManager');
const ResponseHandler = require('../handlers/responseHandler');

class LLMService {
  constructor() {
    // Initialize queue manager with default concurrent limit
    this.queueManager = new LLMQueueManager(4);

    // Initialize other managers
    this.modelManager = new ModelManager();
    this.promptManager = new PromptManager();
    this.parameterManager = new ParameterManager();
    this.responseHandler = new ResponseHandler();

    console.log('LLM Service initialized with queue system');
  }

  // Model management (delegate to ModelManager)
  getCurrentModel() {
    return this.modelManager.getCurrentModel();
  }

  setModel(modelId) {
    return this.modelManager.setModel(modelId);
  }

  resetToDefaultModel() {
    return this.modelManager.resetToDefault();
  }

  // Sync concurrent limit with settings (call this after settings load)
  syncConcurrentLimit(settings) {
    if (settings && settings.maxConcurrent) {
      this.setMaxConcurrentRequests(settings.maxConcurrent);
    }
  }

  async getEnhancedStatus() {
    const modelStatus = await this.modelManager.getEnhancedStatus();
    const queueStatus = this.queueManager.getDetailedStatus();

    return {
      ...modelStatus,
      configured: this.isConfigured(),
      queue: queueStatus
    };
  }

  // Main response generation method with queueing
  async generateResponse(botContext, userMessage, conversationHistory = [], globalLlmSettings = {}, options = {}) {
    try {
      console.log(`Queuing response generation for ${botContext.name}`);

      // Get model context length
      const contextLength = await this.modelManager.getContextLength();

      // Prepare complete prompt
      const promptData = await this.promptManager.preparePrompt(
        botContext,
        userMessage,
        conversationHistory,
        globalLlmSettings,
        contextLength,
        options
      );

      // Prepare API parameters
      const apiParams = this.parameterManager.prepareApiParams(
        globalLlmSettings,
        botContext.llmSettings,
        512 // maxTokens
      );

      // Determine priority based on context
      const priority = this.determinePriority(userMessage, botContext, options);

      // Queue the request
      const result = await this.queueManager.queueLLMRequest(
        this.getCurrentModel(),
        promptData.messages,
        apiParams,
        botContext,
        priority
      );

      // Handle the result
      if (result.success) {
        const processedResponse = this.responseHandler.postProcessResponse(
          result.content,
          botContext
        );

        return this.responseHandler.validateResponse(processedResponse, botContext);
      } else {
        console.error(`Queued request failed for ${botContext.name}:`, result.error);
        return result.fallbackContent || this.responseHandler.getFallbackResponse(botContext);
      }

    } catch (error) {
      console.error(`Error in generateResponse for ${botContext.name}:`, error);
      return this.responseHandler.handleApiError(error, botContext);
    }
  }

  // Determine request priority based on context
  determinePriority(userMessage, botContext, options) {
    // High priority: Direct mentions or urgent responses
    if (options.highPriority || this.isDirectMention(userMessage, botContext)) {
      return 10;
    }

    // Low priority: Random responses or background chatter
    if (options.lowPriority) {
      return -10;
    }

    // Normal priority: Regular responses
    return 0;
  }

  // Check if bot is directly mentioned
  isDirectMention(userMessage, botContext) {
    if (!userMessage.content) return false;

    const content = userMessage.content.toLowerCase();
    const botName = botContext.name.toLowerCase();

    return content.includes(`@${botName}`) || content.includes(botName);
  }

  // Configuration check
  isConfigured() {
    return !!process.env.FEATHERLESS_API_KEY;
  }

  // Queue management methods
  setMaxConcurrentRequests(limit) {
    this.queueManager.setMaxConcurrent(limit);
    console.log(`LLM concurrent request limit set to: ${limit}`);
  }

  getQueueStatus() {
    return this.queueManager.getDetailedStatus();
  }

  clearQueue() {
    return this.queueManager.clearQueue();
  }

  // Legacy support methods (updated to use queue)
  setModelParameters(params) {
    if (params.model) {
      this.setModel(params.model);
    }

    if (params.maxConcurrent) {
      this.setMaxConcurrentRequests(params.maxConcurrent);
    }

    console.log('LLM parameters updated:', {
      model: this.getCurrentModel(),
      configured: this.isConfigured(),
      maxConcurrent: this.queueManager.maxConcurrent
    });
  }

  getModelParameters() {
    return {
      model: this.getCurrentModel(),
      maxTokens: 512,
      configured: this.isConfigured(),
      maxConcurrent: this.queueManager.maxConcurrent
    };
  }

  getStatus() {
    const queueStatus = this.queueManager.getStatus();

    return {
      configured: this.isConfigured(),
      currentModel: this.getCurrentModel(),
      defaultModel: this.modelManager.defaultModel,
      maxTokens: 512,
      provider: 'Featherless AI',
      queue: {
        maxConcurrent: queueStatus.maxConcurrent,
        activeRequests: queueStatus.activeRequests,
        queuedRequests: queueStatus.queuedRequests
      }
    };
  }

  // Get detailed service information
  async getDetailedStatus() {
    const enhancedStatus = await this.getEnhancedStatus();

    return {
      ...enhancedStatus,
      managers: {
        model: this.modelManager.getCacheStats(),
        prompt: { initialized: true },
        parameters: { initialized: true },
        response: this.responseHandler.getStats(),
        queue: this.queueManager.getMetrics()
      }
    };
  }

  // Clear all caches and reset queue
  clearCaches() {
    this.modelManager.clearCache();
    this.queueManager.clearQueue();
    console.log('All LLM service caches and queue cleared');
  }

  // For testing/debugging with queue
  async testGeneration(testPrompt = "Hello, how are you?") {
    const testContext = {
      name: 'TestBot',
      description: 'A test bot for debugging',
      firstMessage: 'Hello! I am a test bot.'
    };

    const testMessage = {
      content: testPrompt,
      author: { username: 'TestUser' }
    };

    try {
      const response = await this.generateResponse(testContext, testMessage);
      return {
        success: true,
        response,
        model: this.getCurrentModel(),
        queueStatus: this.getQueueStatus()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        model: this.getCurrentModel(),
        queueStatus: this.getQueueStatus()
      };
    }
  }
}

module.exports = new LLMService();