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

  // Generate a response for a bot given the context
  async generateResponse(botContext, userMessage, conversationHistory = [], options = {}) {
    try {
      // Build the system prompt using PromptBuilder
      const systemPrompt = this.promptBuilder.buildSystemPrompt(
        botContext, 
        options.authorNote || null
      );
      
      // Validate the prompt
      const validatedPrompt = this.promptBuilder.validatePrompt(systemPrompt);
      
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

      const completion = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: options.temperature || 0.8,
        messages: messages,
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

  // Update LLM parameters
  setModelParameters(params) {
    if (params.maxTokens) this.maxTokens = params.maxTokens;
    if (params.model) this.model = params.model;
    
    console.log('LLM parameters updated:', { model: this.model, maxTokens: this.maxTokens });
  }

  // Get current model parameters
  getModelParameters() {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      configured: this.isConfigured()
    };
  }
}

module.exports = new LLMService();