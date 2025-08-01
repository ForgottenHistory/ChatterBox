// services/promptService.js
const PromptBuilder = require('./promptBuilder');

class PromptService {
  constructor() {
    this.promptBuilder = new PromptBuilder();
    console.log('PromptService initialized (simplified)');
  }

  // Build system prompt - no caching needed
  buildSystemPrompt(botContext, globalLlmSettings, authorNote = null) {
    const prompt = this.promptBuilder.buildSystemPrompt(
      botContext,
      authorNote,
      globalLlmSettings
    );

    console.log(`Built system prompt for ${botContext.name} (${prompt.length} chars)`);
    return prompt;
  }

  // Get effective system prompt source for debugging
  getEffectiveSystemPrompt(botContext, globalLlmSettings) {
    return this.promptBuilder.getEffectiveSystemPrompt(botContext, globalLlmSettings);
  }

  // Analyze prompt for a bot
  analyzePrompt(botContext, globalLlmSettings) {
    const systemPrompt = this.buildSystemPrompt(botContext, globalLlmSettings);
    const effective = this.getEffectiveSystemPrompt(botContext, globalLlmSettings);

    return {
      botName: botContext.name,
      systemPromptLength: systemPrompt.length,
      effectiveSource: effective.source,
      hasExampleMessages: !!(botContext.exampleMessages && botContext.exampleMessages.trim()),
      hasCustomLlmSettings: !!(botContext.llmSettings),
      hasGlobalSystemPrompt: !!(globalLlmSettings?.systemPrompt),
      promptSections: this.analyzePromptSections(systemPrompt),
      estimatedTokens: Math.ceil(systemPrompt.length / 4) // Rough estimate
    };
  }

  // Analyze prompt sections
  analyzePromptSections(prompt) {
    const sections = prompt.split('\n\n');
    
    return sections.map((section, index) => {
      const firstLine = section.split('\n')[0];
      let sectionType = 'content';
      
      if (firstLine.includes('Character Context:')) {
        sectionType = 'character_context';
      } else if (firstLine.includes('Example conversation:')) {
        sectionType = 'example_messages';
      } else if (firstLine.includes('Additional Instructions:')) {
        sectionType = 'author_note';
      } else if (index === 0) {
        sectionType = 'primary_prompt';
      }
      
      return {
        type: sectionType,
        length: section.length,
        preview: section.substring(0, 100) + (section.length > 100 ? '...' : '')
      };
    });
  }

  // Get prompt data for API endpoint
  getPromptDataForBot(botContext, conversationHistory, globalLlmSettings, currentMessage = null) {
    const systemPrompt = this.buildSystemPrompt(botContext, globalLlmSettings);
    const analysis = this.analyzePrompt(botContext, globalLlmSettings);
    
    // Format conversation history for display
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: `${msg.username}: ${msg.content}`,
      timestamp: msg.timestamp
    }));

    return {
      botName: botContext.name,
      botId: botContext.id || 'unknown',
      systemPrompt,
      conversationHistory: formattedHistory,
      currentMessage,
      llmSettings: globalLlmSettings,
      analysis,
      botContext: {
        description: botContext.description || '',
        exampleMessages: botContext.exampleMessages || '',
        hasCustomSettings: !!(botContext.llmSettings)
      }
    };
  }

  // Validate prompt content
  validatePromptContent(prompt) {
    const issues = [];

    if (!prompt || typeof prompt !== 'string') {
      issues.push('Prompt must be a non-empty string');
      return { isValid: false, issues };
    }

    if (prompt.length === 0) {
      issues.push('Prompt cannot be empty');
    }

    if (prompt.length > 8000) {
      issues.push('Prompt is very long and may exceed model context limits');
    }

    // Check for potential issues
    if (prompt.includes('undefined') || prompt.includes('null')) {
      issues.push('Prompt contains undefined or null values');
    }

    if (prompt.trim() !== prompt) {
      issues.push('Prompt has leading or trailing whitespace');
    }

    return {
      isValid: issues.length === 0,
      issues,
      length: prompt.length,
      estimatedTokens: Math.ceil(prompt.length / 4)
    };
  }

  // Get service status
  getStatus() {
    return {
      serviceName: 'PromptService',
      cacheEnabled: false,
      simplified: true
    };
  }
}

module.exports = PromptService;