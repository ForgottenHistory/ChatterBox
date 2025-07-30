const OpenAI = require('openai');
const ModelManager = require('../managers/modelManager');
const PromptManager = require('../managers/promptManager');
const ParameterManager = require('../managers/parameterManager');
const ResponseHandler = require('../handlers/responseHandler');

class LLMService {
  constructor() {
    // Initialize OpenAI client with Featherless endpoint
    this.client = new OpenAI({
      baseURL: 'https://api.featherless.ai/v1',
      apiKey: process.env.FEATHERLESS_API_KEY,
    });

    // Initialize managers
    this.modelManager = new ModelManager();
    this.promptManager = new PromptManager();
    this.parameterManager = new ParameterManager();
    this.responseHandler = new ResponseHandler();

    console.log('LLM Service initialized with modular architecture');
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

  async getEnhancedStatus() {
    const status = await this.modelManager.getEnhancedStatus();
    return {
      ...status,
      configured: this.isConfigured(),
      maxTokens: 512 // Keep for backwards compatibility
    };
  }

  // Main response generation method
  async generateResponse(botContext, userMessage, conversationHistory = [], globalLlmSettings = {}, options = {}) {
    try {
      console.log(`Generating response for ${botContext.name} using ${this.getCurrentModel()}`);

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

      // Validate settings
      const validation = this.parameterManager.validateParameters(apiParams);
      if (!validation.isValid) {
        console.warn('Invalid parameters detected:', validation.errors);
      }

      console.log(`API call: ${this.getCurrentModel()}, ${promptData.messages.length} messages`);
      console.log(`Parameters:`, this.parameterManager.getParametersSummary(apiParams));

      // Make API call
      const completion = await this.client.chat.completions.create({
        model: this.getCurrentModel(),
        messages: promptData.messages,
        ...apiParams
      });

      // Process response
      const response = this.responseHandler.processApiResponse(completion, botContext);
      const finalResponse = this.responseHandler.postProcessResponse(response, botContext);
      
      return this.responseHandler.validateResponse(finalResponse, botContext);

    } catch (error) {
      console.error(`Error in generateResponse for ${botContext.name}:`, error);
      return this.responseHandler.handleApiError(error, botContext);
    }
  }

  // Configuration check
  isConfigured() {
    return !!process.env.FEATHERLESS_API_KEY;
  }

  // Legacy support methods
  setModelParameters(params) {
    if (params.model) {
      this.setModel(params.model);
    }
    
    console.log('LLM parameters updated:', {
      model: this.getCurrentModel(),
      configured: this.isConfigured()
    });
  }

  getModelParameters() {
    return {
      model: this.getCurrentModel(),
      maxTokens: 512,
      configured: this.isConfigured()
    };
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      currentModel: this.getCurrentModel(),
      defaultModel: this.modelManager.defaultModel,
      maxTokens: 512,
      provider: 'Featherless AI'
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
        response: this.responseHandler.getStats()
      }
    };
  }

  // Clear all caches
  clearCaches() {
    this.modelManager.clearCache();
    console.log('All LLM service caches cleared');
  }

  // For testing/debugging
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
        model: this.getCurrentModel()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        model: this.getCurrentModel()
      };
    }
  }
}

module.exports = new LLMService();