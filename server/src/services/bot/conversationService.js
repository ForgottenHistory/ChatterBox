class ConversationService {
  constructor(conversationHistory) {
    this.conversationHistory = conversationHistory;
    console.log('ConversationService initialized');
  }

  // Add message to conversation
  addMessage(message) {
    // Validate message structure
    const validatedMessage = this.validateMessage(message);
    if (validatedMessage) {
      this.conversationHistory.addMessage(validatedMessage);
      return true;
    }
    return false;
  }

  // Validate message structure
  validateMessage(message) {
    if (!message) return null;

    const validated = {
      content: message.content || message.message || '',
      username: message.author?.username || message.username || 'Unknown',
      isBot: message.author?.type === 'bot' || message.isBot || false,
      timestamp: message.timestamp || new Date().toISOString()
    };

    // Don't add empty messages
    if (!validated.content.trim()) {
      console.warn('Skipping empty message');
      return null;
    }

    return validated;
  }

  // Get recent conversation history
  getRecentHistory(count = 5) {
    return this.conversationHistory.getRecentHistory(count);
  }

  // Get all conversation history
  getAllHistory() {
    return this.conversationHistory.getAllHistory();
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory.clearHistory();
    console.log('Conversation history cleared by ConversationService');
  }

  // Get history for specific participant
  getHistoryForParticipant(username, count = 10) {
    return this.conversationHistory.getHistoryForParticipant(username, count);
  }

  // Get conversation context formatted for LLM
  getContextForLLM(count = 5) {
    return this.conversationHistory.getContextForLLM(count);
  }

  // Get conversation statistics
  getConversationStats() {
    const allHistory = this.getAllHistory();
    
    const stats = {
      totalMessages: allHistory.length,
      botMessages: allHistory.filter(msg => msg.isBot).length,
      userMessages: allHistory.filter(msg => !msg.isBot).length,
      uniqueParticipants: new Set(allHistory.map(msg => msg.username)).size,
      oldestMessage: allHistory.length > 0 ? allHistory[0].timestamp : null,
      newestMessage: allHistory.length > 0 ? allHistory[allHistory.length - 1].timestamp : null
    };

    // Calculate participants breakdown
    const participantCounts = {};
    allHistory.forEach(msg => {
      participantCounts[msg.username] = (participantCounts[msg.username] || 0) + 1;
    });

    stats.participantBreakdown = participantCounts;
    stats.mostActiveParticipant = Object.keys(participantCounts)
      .reduce((a, b) => participantCounts[a] > participantCounts[b] ? a : b, '');

    return stats;
  }

  // Search conversation history
  searchHistory(searchTerm, maxResults = 10) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    const allHistory = this.getAllHistory();

    return allHistory
      .filter(msg => msg.content.toLowerCase().includes(term))
      .slice(-maxResults) // Get most recent matches
      .map(msg => ({
        ...msg,
        relevantPart: this.extractRelevantPart(msg.content, term)
      }));
  }

  // Extract relevant part of message for search results
  extractRelevantPart(content, searchTerm, contextLength = 50) {
    const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return content;

    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + searchTerm.length + contextLength);
    
    let excerpt = content.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  // Get conversation timeline (messages grouped by time periods)
  getConversationTimeline(periodMinutes = 60) {
    const allHistory = this.getAllHistory();
    const timeline = [];
    
    if (allHistory.length === 0) return timeline;

    let currentPeriod = {
      startTime: allHistory[0].timestamp,
      endTime: null,
      messages: [],
      participants: new Set(),
      botCount: 0,
      userCount: 0
    };

    allHistory.forEach(msg => {
      const msgTime = new Date(msg.timestamp);
      const periodStart = new Date(currentPeriod.startTime);
      const diffMinutes = (msgTime - periodStart) / (1000 * 60);

      if (diffMinutes > periodMinutes) {
        // Finish current period
        currentPeriod.endTime = currentPeriod.messages[currentPeriod.messages.length - 1]?.timestamp;
        currentPeriod.participants = Array.from(currentPeriod.participants);
        timeline.push(currentPeriod);

        // Start new period
        currentPeriod = {
          startTime: msg.timestamp,
          endTime: null,
          messages: [],
          participants: new Set(),
          botCount: 0,
          userCount: 0
        };
      }

      // Add message to current period
      currentPeriod.messages.push(msg);
      currentPeriod.participants.add(msg.username);
      
      if (msg.isBot) {
        currentPeriod.botCount++;
      } else {
        currentPeriod.userCount++;
      }
    });

    // Add final period
    if (currentPeriod.messages.length > 0) {
      currentPeriod.endTime = currentPeriod.messages[currentPeriod.messages.length - 1].timestamp;
      currentPeriod.participants = Array.from(currentPeriod.participants);
      timeline.push(currentPeriod);
    }

    return timeline;
  }

  // Get service status
  getStatus() {
    const stats = this.getConversationStats();
    
    return {
      totalMessages: stats.totalMessages,
      maxHistorySize: this.conversationHistory.maxHistorySize,
      serviceName: 'ConversationService'
    };
  }
}

module.exports = ConversationService;