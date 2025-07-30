const OpenAI = require('openai');
const PromptBuilder = require('./bot/promptBuilder');

class LLMService {
  constructor() {
    // Initialize OpenAI client with Featherless endpoint
    this.client = new OpenAI({
      baseURL: 'https://api.featherless.ai/v1',
      apiKey: process.env.FEATHERLESS_API_KEY,
    });

    this.model = 'moonshotai/Kimi-K2-Instruct';
    this.maxTokens = 512; // Keep responses short for chat
    this.promptBuilder = new PromptBuilder();

    console.log('LLM Service initialized with Featherless API');
  }

  // Validate prompt locally
  validatePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt: must be a non-empty string');
    }

    if (prompt.length > 8000) {
      console.warn('Prompt is very long, truncating for API limits');
      return prompt.substring(0, 8000) + '...';
    }

    return prompt.trim();
  }

  // Generate a response for a bot given the context and settings
  async generateResponse(botContext, userMessage, conversationHistory = [], globalLlmSettings = {}, options = {}) {
    try {
      // Build the system prompt using PromptBuilder with global settings
      const systemPrompt = this.promptBuilder.buildSystemPrompt(
        botContext,
        options.authorNote || null,
        globalLlmSettings
      );

      // Validate the prompt (do it locally since validatePrompt might not exist)
      const validatedPrompt = this.validatePrompt(systemPrompt);

      // Build conversation messages in order
      const messages = [
        { role: 'system', content: validatedPrompt }
      ];

      // Add conversation history (last 5 messages for context)
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.isBot ? 'assistant' : 'user',
          content: `${msg.username}: ${msg.content}`
        });
      });

      // Add the current user message
      messages.push({
        role: 'user',
        content: `${userMessage.author.username}: ${userMessage.content}`
      });

      console.log('Messages sent to LLM:', messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + '...' })));

      // Merge global settings with bot-specific overrides
      const finalSettings = this.mergeSettings(globalLlmSettings, botContext.llmSettings);

      console.log('Using LLM settings:', finalSettings);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: messages,
        ...finalSettings
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('No response generated from LLM');
      }

      console.log(`LLM Response for ${botContext.name}:`, response.substring(0, 100) + '...');
      return response.trim();

    } catch (error) {
      console.error(`Error generating LLM response for ${botContext.name}:`, error);

      // Return a fallback response
      return this.getFallbackResponse(botContext);
    }
  }

  // Merge global LLM settings with bot-specific overrides
  mergeSettings(globalSettings, botSettings) {
    const merged = {};

    // Start with global settings
    if (globalSettings.temperature !== undefined) {
      merged.temperature = globalSettings.temperature;
    }

    if (globalSettings.topP !== undefined) {
      merged.top_p = globalSettings.topP;
    }

    if (globalSettings.topK !== undefined && globalSettings.topK !== -1) {
      merged.top_k = globalSettings.topK;
    }

    if (globalSettings.frequencyPenalty !== undefined && globalSettings.frequencyPenalty !== 0) {
      merged.frequency_penalty = globalSettings.frequencyPenalty;
    }

    if (globalSettings.presencePenalty !== undefined && globalSettings.presencePenalty !== 0) {
      merged.presence_penalty = globalSettings.presencePenalty;
    }

    if (globalSettings.repetitionPenalty !== undefined && globalSettings.repetitionPenalty !== 1.0) {
      merged.repetition_penalty = globalSettings.repetitionPenalty;
    }

    if (globalSettings.minP !== undefined && globalSettings.minP !== 0) {
      merged.min_p = globalSettings.minP;
    }

    // Override with bot-specific settings if they exist
    if (botSettings) {
      if (botSettings.temperature !== undefined) {
        merged.temperature = botSettings.temperature;
      }

      if (botSettings.topP !== undefined) {
        merged.top_p = botSettings.topP;
      }

      if (botSettings.topK !== undefined && botSettings.topK !== -1) {
        merged.top_k = botSettings.topK;
      }

      if (botSettings.frequencyPenalty !== undefined && botSettings.frequencyPenalty !== 0) {
        merged.frequency_penalty = botSettings.frequencyPenalty;
      }

      if (botSettings.presencePenalty !== undefined && botSettings.presencePenalty !== 0) {
        merged.presence_penalty = botSettings.presencePenalty;
      }

      if (botSettings.repetitionPenalty !== undefined && botSettings.repetitionPenalty !== 1.0) {
        merged.repetition_penalty = botSettings.repetitionPenalty;
      }

      if (botSettings.minP !== undefined && botSettings.minP !== 0) {
        merged.min_p = botSettings.minP;
      }
    }

    return merged;
  }

  // Fallback response when LLM fails
  getFallbackResponse(botContext) {
    const fallbacks = [
      `Hi! I'm ${botContext.name}. How can I help?`,
      `Hello there! ${botContext.name} at your service.`,
      `Hey! What would you like to chat about?`,
      `Greetings! I'm here and ready to talk.`
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Check if the service is configured properly
  isConfigured() {
    return !!process.env.FEATHERLESS_API_KEY;
  }

  // Update LLM parameters (legacy method)
  setModelParameters(params) {
    if (params.maxTokens) this.maxTokens = params.maxTokens;
    if (params.model) this.model = params.model;

    console.log('LLM parameters updated:', { model: this.model, maxTokens: this.maxTokens });
  }

  // Get current model parameters (legacy method)
  getModelParameters() {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      configured: this.isConfigured()
    };
  }
}

module.exports = new LLMService();