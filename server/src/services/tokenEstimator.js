class TokenEstimator {
  constructor() {
    // Rough estimation: 1 token ≈ 4 characters for most models
    // This is a conservative estimate that works reasonably well
    this.charsPerToken = 4;
    
    // Reserve tokens for system prompt, user message, and response
    this.systemPromptReserve = 500;  // Tokens reserved for system prompt
    this.userMessageReserve = 100;   // Tokens reserved for current user message
    this.responseReserve = 512;      // Tokens reserved for bot response (matches maxTokens)
    
    console.log('TokenEstimator initialized with conservative estimates');
  }

  // Estimate tokens for a text string
  estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Basic estimation: character count / chars per token
    // Add small buffer for encoding variations
    const baseEstimate = Math.ceil(text.length / this.charsPerToken);
    
    // Add 10% buffer for encoding variations and special tokens
    return Math.ceil(baseEstimate * 1.1);
  }

  // Estimate tokens for a conversation message
  estimateMessageTokens(message) {
    if (!message) return 0;
    
    const content = message.content || '';
    const username = message.username || '';
    
    // Format: "username: content"
    const formattedMessage = `${username}: ${content}`;
    
    return this.estimateTokens(formattedMessage);
  }

  // Get available tokens for conversation history
  getAvailableHistoryTokens(contextLength, systemPrompt = '') {
    // Calculate reserved tokens
    const systemTokens = this.estimateTokens(systemPrompt) || this.systemPromptReserve;
    const reservedTokens = systemTokens + this.userMessageReserve + this.responseReserve;
    
    // Available tokens for history
    const available = contextLength - reservedTokens;
    
    // Ensure we don't go negative and leave some safety margin
    return Math.max(0, Math.floor(available * 0.8)); // Use 80% of available space
  }

  // Select conversation history based on token budget
  selectHistoryByTokens(conversationHistory, tokenBudget, systemPrompt = '') {
    if (!conversationHistory || conversationHistory.length === 0) {
      return [];
    }

    // If no specific budget provided, use a reasonable default
    if (!tokenBudget || tokenBudget <= 0) {
      tokenBudget = 1000; // Default budget
    }

    const selectedMessages = [];
    let totalTokens = 0;

    // Work backwards from most recent messages
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const message = conversationHistory[i];
      const messageTokens = this.estimateMessageTokens(message);
      
      // Check if adding this message would exceed our budget
      if (totalTokens + messageTokens > tokenBudget) {
        // If this is the first message and it's too big, include it anyway but warn
        if (selectedMessages.length === 0) {
          console.warn(`Single message exceeds token budget: ${messageTokens} > ${tokenBudget}`);
          selectedMessages.unshift(message);
          totalTokens += messageTokens;
        }
        break; // Stop adding more messages
      }

      // Add message to the beginning of selected messages (to maintain chronological order)
      selectedMessages.unshift(message);
      totalTokens += messageTokens;
    }

    console.log(`Selected ${selectedMessages.length} messages using ${totalTokens}/${tokenBudget} tokens`);
    return selectedMessages;
  }

  // Get conversation history for a specific context length
  getHistoryForContext(conversationHistory, contextLength, systemPrompt = '') {
    const tokenBudget = this.getAvailableHistoryTokens(contextLength, systemPrompt);
    return this.selectHistoryByTokens(conversationHistory, tokenBudget, systemPrompt);
  }

  // Estimate total prompt tokens (for debugging/monitoring)
  estimatePromptTokens(systemPrompt, conversationHistory, userMessage) {
    let totalTokens = 0;
    
    // System prompt
    totalTokens += this.estimateTokens(systemPrompt);
    
    // Conversation history
    conversationHistory.forEach(msg => {
      totalTokens += this.estimateMessageTokens(msg);
    });
    
    // Current user message
    if (userMessage) {
      const userContent = `${userMessage.author.username}: ${userMessage.content}`;
      totalTokens += this.estimateTokens(userContent);
    }
    
    return totalTokens;
  }

  // Update estimation parameters
  setCharsPerToken(charsPerToken) {
    this.charsPerToken = Math.max(1, charsPerToken);
    console.log(`Updated chars per token to: ${this.charsPerToken}`);
  }

  setReservedTokens({ systemPrompt, userMessage, response }) {
    if (systemPrompt !== undefined) this.systemPromptReserve = systemPrompt;
    if (userMessage !== undefined) this.userMessageReserve = userMessage;
    if (response !== undefined) this.responseReserve = response;
    
    console.log('Updated reserved tokens:', {
      system: this.systemPromptReserve,
      user: this.userMessageReserve,
      response: this.responseReserve
    });
  }

  // Get current configuration
  getConfig() {
    return {
      charsPerToken: this.charsPerToken,
      reserves: {
        systemPrompt: this.systemPromptReserve,
        userMessage: this.userMessageReserve,
        response: this.responseReserve
      }
    };
  }
}

module.exports = new TokenEstimator();