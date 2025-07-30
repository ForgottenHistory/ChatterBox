const PromptBuilder = require('../services/bot/promptBuilder');
const tokenEstimator = require('../services/tokenEstimator');

class PromptManager {
  constructor() {
    this.promptBuilder = new PromptBuilder();
    console.log('PromptManager initialized');
  }

  // Build system prompt
  buildSystemPrompt(botContext, globalLlmSettings, authorNote = null) {
    return this.promptBuilder.buildSystemPrompt(
      botContext,
      authorNote,
      globalLlmSettings
    );
  }

  // Validate and clean prompt
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

  // Select conversation history based on token budget
  selectConversationHistory(conversationHistory, contextLength, systemPrompt) {
    return tokenEstimator.getHistoryForContext(
      conversationHistory,
      contextLength,
      systemPrompt
    );
  }

  // Build complete message array for API
  buildMessages(systemPrompt, conversationHistory, userMessage) {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.isBot ? 'assistant' : 'user',
        content: `${msg.username}: ${msg.content}`
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: `${userMessage.author.username}: ${userMessage.content}`
    });

    return messages;
  }

  // Estimate total tokens for monitoring
  estimatePromptTokens(systemPrompt, conversationHistory, userMessage) {
    return tokenEstimator.estimatePromptTokens(
      systemPrompt,
      conversationHistory,
      userMessage
    );
  }

  // Process complete prompt preparation
  async preparePrompt(botContext, userMessage, conversationHistory, globalLlmSettings, contextLength, options = {}) {
    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(
        botContext,
        globalLlmSettings,
        options.authorNote
      );

      // Validate system prompt
      const validatedPrompt = this.validatePrompt(systemPrompt);

      // Select conversation history based on available tokens
      const selectedHistory = this.selectConversationHistory(
        conversationHistory,
        contextLength,
        validatedPrompt
      );

      // Build final message array
      const messages = this.buildMessages(
        validatedPrompt,
        selectedHistory,
        userMessage
      );

      // Estimate tokens for monitoring
      const estimatedTokens = this.estimatePromptTokens(
        validatedPrompt,
        selectedHistory,
        userMessage
      );

      console.log(`Prompt prepared: ${messages.length} messages, ~${estimatedTokens}/${contextLength} tokens`);
      console.log(`History: ${selectedHistory.length}/${conversationHistory.length} messages selected`);

      return {
        messages,
        systemPrompt: validatedPrompt,
        selectedHistory,
        estimatedTokens,
        contextLength
      };
    } catch (error) {
      console.error('Error preparing prompt:', error);
      throw error;
    }
  }
}

module.exports = PromptManager;