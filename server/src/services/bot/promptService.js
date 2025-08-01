// services/promptService.js
const PromptBuilder = require('./promptBuilder');

class PromptService {
  constructor() {
    this.promptBuilder = new PromptBuilder();
    this.promptCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    console.log('PromptService initialized');
  }

  // Build system prompt with caching
  buildSystemPrompt(botContext, globalLlmSettings, authorNote = null) {
    // Create cache key
    const cacheKey = this.createPromptCacheKey(botContext, globalLlmSettings, authorNote);
    
    // Check cache
    const cached = this.promptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('Using cached system prompt');
      return cached.prompt;
    }

    // Build new prompt
    const prompt = this.promptBuilder.buildSystemPrompt(
      botContext,
      authorNote,
      globalLlmSettings
    );

    // Cache the result
    this.promptCache.set(cacheKey, {
      prompt,
      timestamp: Date.now()
    });

    console.log(`Built system prompt for ${botContext.name} (${prompt.length} chars)`);
    return prompt;
  }

  // Create cache key for prompts
  createPromptCacheKey(botContext, globalLlmSettings, authorNote) {
    const keyParts = [
      botContext.name,
      botContext.description?.substring(0, 50) || '',
      botContext.systemPrompt?.substring(0, 50) || '',
      botContext.llmSettings?.systemPrompt?.substring(0, 50) || '',
      globalLlmSettings?.systemPrompt?.substring(0, 50) || '',
      authorNote?.substring(0, 20) || ''
    ];
    
    return keyParts.join('|');
  }

  // Get effective system prompt source for debugging
  getEffectiveSystemPrompt(botContext, globalLlmSettings) {
    // Priority logic from PromptBuilder
    if (globalLlmSettings && globalLlmSettings.systemPrompt && globalLlmSettings.systemPrompt.trim()) {
      return { source: 'global_llm_settings', prompt: globalLlmSettings.systemPrompt };
    }
    
    if (botContext.llmSettings && botContext.llmSettings.systemPrompt && botContext.llmSettings.systemPrompt.trim()) {
      return { source: 'bot_llm_settings', prompt: botContext.llmSettings.systemPrompt };
    }
    
    if (botContext.systemPrompt && botContext.systemPrompt.trim()) {
      return { source: 'bot_system_prompt', prompt: botContext.systemPrompt };
    }
    
    if (botContext.description && botContext.description.trim()) {
      return { source: 'bot_description', prompt: `You are ${botContext.name}. ${botContext.description}` };
    }
    
    return { source: 'default', prompt: `You are ${botContext.name}, a helpful AI assistant.` };
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

  // Clear prompt cache
  clearCache() {
    const clearedCount = this.promptCache.size;
    this.promptCache.clear();
    console.log(`Cleared ${clearedCount} cached prompts`);
    return clearedCount;
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.promptCache.entries()) {
      if (now - entry.timestamp < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.promptCache.size,
      validEntries,
      expiredEntries,
      cacheTimeout: this.cacheTimeout
    };
  }

  // Clean expired cache entries
  cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.promptCache.entries()) {
      if (now - entry.timestamp >= this.cacheTimeout) {
        this.promptCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  // Get service status
  getStatus() {
    const cacheStats = this.getCacheStats();
    
    return {
      cacheEnabled: true,
      cacheStats,
      serviceName: 'PromptService'
    };
  }
}

module.exports = PromptService;