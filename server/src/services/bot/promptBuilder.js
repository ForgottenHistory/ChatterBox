class PromptBuilder {
  constructor() {
    console.log('PromptBuilder initialized');
  }

  // Build system prompt with bot-specific system prompt taking priority
  buildSystemPrompt(botContext, authorNote = null) {
    const sections = [];

    // Priority order:
    // 1. Bot's specific system prompt (from LLM settings)
    // 2. Bot's system prompt field (legacy)
    // 3. Character description (fallback)

    let primaryPrompt = null;

    // Check if bot has LLM settings with system prompt
    if (botContext.llmSettings && botContext.llmSettings.systemPrompt) {
      primaryPrompt = botContext.llmSettings.systemPrompt;
    }
    // Fall back to bot's systemPrompt field
    else if (botContext.systemPrompt) {
      primaryPrompt = botContext.systemPrompt;
    }
    // Fall back to description
    else if (botContext.description) {
      primaryPrompt = `You are ${botContext.name}. ${botContext.description}`;
    }
    // Final fallback
    else {
      primaryPrompt = `You are ${botContext.name}, a helpful AI assistant.`;
    }

    sections.push(primaryPrompt);

    // Add example messages if provided (helps with character consistency)
    if (botContext.exampleMessages && botContext.exampleMessages.trim()) {
      sections.push(`Example conversation style:\n${botContext.exampleMessages}`);
    }

    // Optional author note (additional instructions)
    if (authorNote) {
      sections.push(`Additional Instructions: ${authorNote}`);
    }

    return sections.join('\n\n');
  }

  // Validate prompt
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

  // Get effective system prompt for debugging
  getEffectiveSystemPrompt(botContext) {
    if (botContext.llmSettings && botContext.llmSettings.systemPrompt) {
      return { source: 'llmSettings', prompt: botContext.llmSettings.systemPrompt };
    } else if (botContext.systemPrompt) {
      return { source: 'systemPrompt', prompt: botContext.systemPrompt };
    } else if (botContext.description) {
      return { source: 'description', prompt: botContext.description };
    } else {
      return { source: 'default', prompt: `You are ${botContext.name}, a helpful AI assistant.` };
    }
  }
}

module.exports = PromptBuilder;