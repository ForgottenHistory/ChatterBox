class ResponseHandler {
  constructor() {
    this.fallbackResponses = [
      'Hi! How can I help?',
      'Hello there! What would you like to chat about?',
      'Hey! What\'s on your mind?',
      'Greetings! I\'m here and ready to talk.',
      'Hello! Feel free to ask me anything.',
      'Hi there! How are you doing today?'
    ];
    
    console.log('ResponseHandler initialized');
  }

  // Process API response
  processApiResponse(completion, botContext) {
    try {
      const response = completion.choices[0]?.message?.content;

      if (!response) {
        console.warn(`No response content from API for ${botContext.name}`);
        return this.getFallbackResponse(botContext);
      }

      const cleanedResponse = response.trim();
      
      if (!cleanedResponse) {
        console.warn(`Empty response after cleaning for ${botContext.name}`);
        return this.getFallbackResponse(botContext);
      }

      console.log(`Response generated for ${botContext.name}: ${cleanedResponse.substring(0, 100)}...`);
      return cleanedResponse;
    } catch (error) {
      console.error(`Error processing API response for ${botContext.name}:`, error);
      return this.getFallbackResponse(botContext);
    }
  }

  // Generate fallback response when API fails
  getFallbackResponse(botContext) {
    const personalizedFallbacks = [
      `Hi! I'm ${botContext.name}. How can I help?`,
      `Hello there! ${botContext.name} at your service.`,
      `Hey! ${botContext.name} here. What would you like to chat about?`,
      `Greetings! I'm ${botContext.name} and I'm here to help.`
    ];

    // Use bot's first message if available, otherwise use personalized fallback
    if (botContext.firstMessage && botContext.firstMessage.trim()) {
      return botContext.firstMessage.trim();
    }

    // Use personalized fallback
    const personalizedOptions = personalizedFallbacks;
    const randomPersonalized = personalizedOptions[Math.floor(Math.random() * personalizedOptions.length)];
    
    // Mix in some generic options
    const allOptions = [...personalizedOptions, ...this.fallbackResponses];
    const randomOption = allOptions[Math.floor(Math.random() * allOptions.length)];
    
    // Prefer personalized, but occasionally use generic
    const finalResponse = Math.random() < 0.7 ? randomPersonalized : randomOption;
    
    console.log(`Using fallback response for ${botContext.name}: ${finalResponse}`);
    return finalResponse;
  }

  // Validate response before sending
  validateResponse(response, botContext) {
    if (!response || typeof response !== 'string') {
      console.warn(`Invalid response type for ${botContext.name}`);
      return this.getFallbackResponse(botContext);
    }

    const trimmed = response.trim();
    
    if (!trimmed) {
      console.warn(`Empty response for ${botContext.name}`);
      return this.getFallbackResponse(botContext);
    }

    // Check for excessively long responses (might indicate an issue)
    if (trimmed.length > 2000) {
      console.warn(`Very long response for ${botContext.name}: ${trimmed.length} characters`);
      // Could truncate here if needed
    }

    return trimmed;
  }

  // Handle different types of API errors
  handleApiError(error, botContext) {
    console.error(`API error for ${botContext.name}:`, error);

    // Log different error types
    if (error.code === 'insufficient_quota') {
      console.error('API quota exceeded');
    } else if (error.code === 'model_not_found') {
      console.error('Model not found or not available');
    } else if (error.code === 'invalid_request_error') {
      console.error('Invalid request parameters');
    } else if (error.status === 429) {
      console.error('Rate limit exceeded');
    } else if (error.status >= 500) {
      console.error('Server error from API');
    }

    return this.getFallbackResponse(botContext);
  }

  // Post-process response (could add filtering, formatting, etc.)
  postProcessResponse(response, botContext) {
    let processed = response;

    // Remove any accidental name prefixes
    const namePrefix = `${botContext.name}:`;
    if (processed.startsWith(namePrefix)) {
      processed = processed.substring(namePrefix.length).trim();
    }

    // Ensure response isn't empty after processing
    if (!processed) {
      return this.getFallbackResponse(botContext);
    }

    return processed;
  }

  // Add custom fallback responses
  addFallbackResponses(responses) {
    if (Array.isArray(responses)) {
      this.fallbackResponses.push(...responses);
      console.log(`Added ${responses.length} custom fallback responses`);
    }
  }

  // Get response statistics
  getStats() {
    return {
      fallbackResponseCount: this.fallbackResponses.length
    };
  }
}

module.exports = ResponseHandler;