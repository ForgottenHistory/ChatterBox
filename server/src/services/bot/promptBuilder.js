class PromptBuilder {
  constructor() {
    console.log('PromptBuilder initialized');
  }

  // Build system prompt with bot-specific system prompt taking priority
  buildSystemPrompt(botContext, authorNote = null, globalLlmSettings = null) {
    const sections = [];

    // Priority order for system prompt:
    // 1. Global LLM system prompt (from settings)
    // 2. Bot's specific system prompt (from LLM settings)
    // 3. Bot's system prompt field (legacy)
    // 4. Character description (fallback)

    let primaryPrompt = null;

    // First priority: Global LLM system prompt
    if (globalLlmSettings && globalLlmSettings.systemPrompt && globalLlmSettings.systemPrompt.trim()) {
      primaryPrompt = globalLlmSettings.systemPrompt;
    }
    // Second priority: Bot's specific LLM system prompt
    else if (botContext.llmSettings && botContext.llmSettings.systemPrompt && botContext.llmSettings.systemPrompt.trim()) {
      primaryPrompt = botContext.llmSettings.systemPrompt;
    }
    // Third priority: Bot's systemPrompt field (legacy)
    else if (botContext.systemPrompt && botContext.systemPrompt.trim()) {
      primaryPrompt = botContext.systemPrompt;
    }
    // Fourth priority: Character description (fallback)
    else if (botContext.description && botContext.description.trim()) {
      primaryPrompt = `You are ${botContext.name}. ${botContext.description}`;
    }
    // Final fallback
    else {
      primaryPrompt = `You are ${botContext.name}, a helpful AI assistant.`;
    }

    sections.push(primaryPrompt);

    // Add character context if we're using the global system prompt
    if (globalLlmSettings && globalLlmSettings.systemPrompt && globalLlmSettings.systemPrompt.trim()) {
      if (botContext.description && botContext.description.trim()) {
        sections.push(`Character Context: You are playing the role of ${botContext.name}. ${botContext.description}`);
      }
    }

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