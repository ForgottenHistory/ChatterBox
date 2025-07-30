class TextFormatter {
  constructor() {
    // Common RP action patterns
    this.actionPatterns = [
      // Basic asterisk actions: *laughs*, *giggles*, *smiles*
      /\*[^*]+\*/g,
      
      // Parenthetical actions: (laughs), (giggles), (smiles)
      /\([^)]*(?:laugh|giggle|smile|nod|shrug|sigh|blush|wink|grin|frown|chuckle|snicker|gasp|whisper|mumble|groan|yawn|stretch|lean|tilt|shake|wave|point|gesture|look|glance|stare|gaze|peek|squint)[^)]*\)/gi,
      
      // Bracketed actions: [laughs], [giggles], [smiles]
      /\[[^\]]*(?:laugh|giggle|smile|nod|shrug|sigh|blush|wink|grin|frown|chuckle|snicker|gasp|whisper|mumble|groan|yawn|stretch|lean|tilt|shake|wave|point|gesture|look|glance|stare|gaze|peek|squint)[^\]]*\]/gi,
      
      // Underscore actions: _laughs_, _giggles_, _smiles_
      /_[^_]*(?:laugh|giggle|smile|nod|shrug|sigh|blush|wink|grin|frown|chuckle|snicker|gasp|whisper|mumble|groan|yawn|stretch|lean|tilt|shake|wave|point|gesture|look|glance|stare|gaze|peek|squint)[^_]*_/gi,
      
      // Catch any remaining asterisk patterns (more aggressive)
      /\*[^*]{1,50}\*/g,
      
      // Catch standalone action words in various formats
      /(?:^|\s)[\*\(\[_](?:laughs?|giggles?|smiles?|nods?|shrugs?|sighs?|blushes?|winks?|grins?|frowns?|chuckles?|snickers?|gasps?|whispers?|mumbles?|groans?|yawns?|stretches?|leans?|tilts?|shakes?|waves?|points?|gestures?)[\*\)\]_](?:\s|$)/gi
    ];

    // Patterns for messages that are entirely actions
    this.entireActionPatterns = [
      // Message is only asterisk actions and whitespace
      /^\s*\*[^*]*\*\s*$/,
      
      // Message is only parenthetical actions and whitespace
      /^\s*\([^)]*\)\s*$/,
      
      // Message is only bracketed actions and whitespace
      /^\s*\[[^\]]*\]\s*$/,
      
      // Message is only underscore actions and whitespace
      /^\s*_[^_]*_\s*$/,
      
      // Multiple actions with only whitespace between
      /^\s*(?:[\*\(\[_][^*\)\]_]*[\*\)\]_]\s*)+$/
    ];
  }

  /**
   * Remove duplicate names from the start of messages
   * @param {string} text - The text to clean
   * @param {string} botName - The bot's name to check for duplicates
   * @returns {string} - Text with duplicate names removed
   */
  removeDuplicateNames(text, botName) {
    if (!text || !botName || typeof text !== 'string') {
      return text;
    }

    // Pattern to match "BotName: BotName: message" or "BotName:BotName: message"
    const duplicatePattern = new RegExp(`^\\s*${botName}\\s*:\\s*${botName}\\s*:\\s*`, 'i');
    
    if (duplicatePattern.test(text)) {
      console.log(`Removing duplicate name from: ${text}`);
      // Replace the duplicate with just "BotName: "
      const cleaned = text.replace(duplicatePattern, `${botName}: `);
      console.log(`Cleaned to: ${cleaned}`);
      return cleaned;
    }

    // Also handle cases where the bot name appears at the start without colon but the response starts with "BotName:"
    const nameAtStartPattern = new RegExp(`^\\s*${botName}\\s*${botName}\\s*:\\s*`, 'i');
    if (nameAtStartPattern.test(text)) {
      console.log(`Removing duplicate name (no colon) from: ${text}`);
      const cleaned = text.replace(nameAtStartPattern, `${botName}: `);
      console.log(`Cleaned to: ${cleaned}`);
      return cleaned;
    }

    return text;
  }

  /**
   * Remove RP actions from text
   * @param {string} text - The text to clean
   * @returns {string} - Cleaned text
   */
  removeActions(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let cleaned = text;

    // Apply all action patterns
    this.actionPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Clean up extra whitespace
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\s*([.!?])\s*/g, '$1 ') // Fix punctuation spacing
      .trim();

    return cleaned;
  }

  /**
   * Check if message is entirely an action
   * @param {string} text - The text to check
   * @returns {boolean} - True if message is entirely an action
   */
  isEntirelyAction(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Check if text matches any entire action pattern
    return this.entireActionPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Process a bot message - remove actions, duplicate names, and clean formatting
   * @param {string} text - The message text
   * @param {string} botName - The bot's name (for duplicate removal)
   * @returns {string|null} - Cleaned text or null if message should be removed
   */
  formatBotMessage(text, botName) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let processed = text;

    // Step 1: Remove duplicate names first
    if (botName) {
      processed = this.removeDuplicateNames(processed, botName);
    }

    // Step 2: Check if message is entirely an action
    if (this.isEntirelyAction(processed)) {
      console.log('Removing entire action message:', processed);
      return null;
    }

    // Step 3: Remove actions from the text
    processed = this.removeActions(processed);
    
    // Step 4: If cleaning resulted in empty/whitespace-only text, return null
    if (!processed.trim()) {
      console.log('Message became empty after cleaning:', text);
      return null;
    }

    // Step 5: Final cleanup
    processed = processed.trim();

    // Log if we made changes
    if (processed !== text) {
      console.log('Formatted bot message:');
      console.log('Before:', text);
      console.log('After:', processed);
    }

    return processed;
  }

  /**
   * Legacy method for backward compatibility
   * @param {string} text - The message text
   * @returns {string|null} - Cleaned text or null if message should be removed
   */
  formatMessage(text) {
    return this.formatBotMessage(text, null);
  }

  /**
   * Test the formatter with sample text
   * @param {string} text - Text to test
   * @param {string} botName - Bot name for testing
   */
  test(text, botName = 'TestBot') {
    console.log('=== Text Formatter Test ===');
    console.log('Original:', text);
    console.log('Bot Name:', botName);
    console.log('Is entirely action:', this.isEntirelyAction(text));
    console.log('Formatted:', this.formatBotMessage(text, botName));
    console.log('===========================');
  }
}

module.exports = new TextFormatter();