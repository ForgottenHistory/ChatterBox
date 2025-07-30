class PromptBuilder {
  constructor() {
    console.log('PromptBuilder initialized');
  }

  // Build system prompt with just the essentials
  buildSystemPrompt(botContext, authorNote = null) {
    const sections = [];
    
    // 1. System prompt (if provided)
    if (botContext.systemPrompt) {
      sections.push(botContext.systemPrompt);
    }
    
    // 2. Character description (if provided)
    if (botContext.description) {
      sections.push(`Character Description: ${botContext.description}`);
    }
    
    // 3. Conversation History is handled separately in LLM service
    
    // 4. Optional Author note (additional instructions)
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
    
    if (prompt.length > 4000) {
      console.warn('Prompt is very long, consider shortening for better performance');
    }
    
    return prompt.trim();
  }
}

module.exports = PromptBuilder;