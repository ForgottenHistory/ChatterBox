class PromptBuilder {
  constructor() {
    console.log('PromptBuilder initialized (simplified)');
  }

  // Build system prompt with simplified logic
  buildSystemPrompt(botContext, authorNote = null, globalLlmSettings = null) {
    const sections = [];

    // Debug logging
    console.log(`🔍 Building prompt for ${botContext.name}:`);
    console.log(`  - Has global LLM settings: ${!!(globalLlmSettings && globalLlmSettings.systemPrompt)}`);
    console.log(`  - Bot description length: ${botContext.description?.length || 0}`);
    console.log(`  - Bot description preview: "${botContext.description?.substring(0, 100) || 'none'}..."`);

    // Use global LLM system prompt if available, otherwise create a basic default
    let primaryPrompt = null;
    
    if (globalLlmSettings && globalLlmSettings.systemPrompt && globalLlmSettings.systemPrompt.trim()) {
      primaryPrompt = globalLlmSettings.systemPrompt;
      console.log(`  - Using global system prompt (${primaryPrompt.length} chars)`);
    } else {
      // Simple fallback if no global prompt is set
      primaryPrompt = `You are ${botContext.name}, a helpful AI assistant in a chat platform.`;
      console.log(`  - Using default prompt: "${primaryPrompt}"`);
    }

    sections.push(primaryPrompt);

    // Always add character context if we have a description and we're using the global prompt
    if (globalLlmSettings && globalLlmSettings.systemPrompt && globalLlmSettings.systemPrompt.trim()) {
      if (botContext.description && botContext.description.trim()) {
        const characterContext = `Character Context: You are playing the role of ${botContext.name}. ${botContext.description}`;
        sections.push(characterContext);
        console.log(`  - Added character context (${characterContext.length} chars)`);
      } else {
        console.log(`  - WARNING: No bot description available for character context!`);
      }
    }

    // Add example messages if provided (helps with character consistency)
    if (botContext.exampleMessages && botContext.exampleMessages.trim()) {
      sections.push(`Example conversation style:\n${botContext.exampleMessages}`);
      console.log(`  - Added example messages (${botContext.exampleMessages.length} chars)`);
    }

    // Optional author note (additional instructions)
    if (authorNote && authorNote.trim()) {
      sections.push(`Additional Instructions: ${authorNote}`);
      console.log(`  - Added author note (${authorNote.length} chars)`);
    }

    const finalPrompt = sections.join('\n\n');
    console.log(`  - Final prompt sections: ${sections.length}, total length: ${finalPrompt.length}`);

    return finalPrompt;
  }

  // Get effective system prompt for debugging
  getEffectiveSystemPrompt(botContext, globalLlmSettings) {
    if (globalLlmSettings && globalLlmSettings.systemPrompt && globalLlmSettings.systemPrompt.trim()) {
      return { 
        source: 'global_system_prompt', 
        prompt: globalLlmSettings.systemPrompt,
        hasCharacterContext: !!(botContext.description && botContext.description.trim())
      };
    } else {
      return { 
        source: 'default', 
        prompt: `You are ${botContext.name}, a helpful AI assistant in a chat platform.`,
        hasCharacterContext: false
      };
    }
  }
}

module.exports = PromptBuilder;