class ModelManager {
  constructor() {
    this.defaultModel = 'moonshotai/Kimi-K2-Instruct';
    this.currentModel = this.defaultModel;
    this.modelCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    console.log('ModelManager initialized');
  }

  // Get current model
  getCurrentModel() {
    return this.currentModel;
  }

  // Set current model
  setModel(modelId) {
    if (!modelId || typeof modelId !== 'string') {
      console.warn('Invalid model ID provided');
      return false;
    }

    this.currentModel = modelId;
    console.log(`Model changed to: ${modelId}`);
    return true;
  }

  // Reset to default model
  resetToDefault() {
    this.currentModel = this.defaultModel;
    console.log(`Model reset to default: ${this.defaultModel}`);
    return this.defaultModel;
  }

  // Get model details from cache or API
  async getModelDetails(modelId = this.currentModel) {
    const cacheKey = modelId;
    const cached = this.modelCache.get(cacheKey);
    
    // Return cached data if still fresh
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const response = await fetch('https://api.featherless.ai/v1/models');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const modelData = data.data.find(model => model.id === modelId);
      
      if (modelData) {
        // Cache the result
        this.modelCache.set(cacheKey, {
          data: modelData,
          timestamp: Date.now()
        });
        
        return modelData;
      } else {
        console.warn(`Model not found: ${modelId}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching model details:', error);
      return null;
    }
  }

  // Get context length for a model
  async getContextLength(modelId = this.currentModel) {
    const modelDetails = await this.getModelDetails(modelId);
    
    if (modelDetails && modelDetails.context_length) {
      return modelDetails.context_length;
    }
    
    // Fallback to reasonable default
    console.warn(`Using default context length for model: ${modelId}`);
    return 8192;
  }

  // Get max completion tokens for a model
  async getMaxCompletionTokens(modelId = this.currentModel) {
    const modelDetails = await this.getModelDetails(modelId);
    
    if (modelDetails && modelDetails.max_completion_tokens) {
      return modelDetails.max_completion_tokens;
    }
    
    // Fallback
    return 512;
  }

  // Check if model is gated
  async isGatedModel(modelId = this.currentModel) {
    const modelDetails = await this.getModelDetails(modelId);
    return modelDetails?.is_gated === true;
  }

  // Get basic model status
  getBasicStatus() {
    return {
      currentModel: this.currentModel,
      defaultModel: this.defaultModel,
      provider: 'Featherless AI'
    };
  }

  // Get enhanced status with model details
  async getEnhancedStatus() {
    const basicStatus = this.getBasicStatus();
    const modelDetails = await this.getModelDetails();
    
    if (modelDetails) {
      return {
        ...basicStatus,
        modelDetails: {
          contextLength: modelDetails.context_length,
          maxCompletionTokens: modelDetails.max_completion_tokens,
          modelClass: modelDetails.model_class,
          isGated: modelDetails.is_gated || false
        }
      };
    }
    
    return basicStatus;
  }

  // Clear cache
  clearCache() {
    this.modelCache.clear();
    console.log('Model cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      cachedModels: this.modelCache.size,
      expiryTime: this.cacheExpiry
    };
  }
}

module.exports = ModelManager;