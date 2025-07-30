class ConversationHistory {
  constructor(maxHistorySize = 50) {
    this.history = [];
    this.maxHistorySize = maxHistorySize;
    console.log(`ConversationHistory initialized with max size: ${maxHistorySize}`);
  }

  // Add message to conversation history
  addMessage(message) {
    const historyMessage = {
      content: message.content || message.message,
      username: message.author?.username || message.username,
      isBot: message.author?.type === 'bot' || message.isBot,
      timestamp: message.timestamp || new Date().toISOString()
    };

    this.history.push(historyMessage);

    // Keep only recent messages
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    console.log(`Added message to history. Total messages: ${this.history.length}`);
  }

  // Get recent conversation history
  getRecentHistory(count = 5) {
    return this.history.slice(-count);
  }

  // Get all conversation history
  getAllHistory() {
    return [...this.history];
  }

  // Clear conversation history
  clearHistory() {
    this.history = [];
    console.log('Conversation history cleared');
  }

  // Get history for specific user/bot
  getHistoryForParticipant(username, count = 10) {
    return this.history
      .filter(msg => msg.username.toLowerCase() === username.toLowerCase())
      .slice(-count);
  }

  // Get conversation context for LLM (formatted for API)
  getContextForLLM(count = 5) {
    return this.getRecentHistory(count).map(msg => ({
      role: msg.isBot ? 'assistant' : 'user',
      content: `${msg.username}: ${msg.content}`
    }));
  }
}

module.exports = ConversationHistory;