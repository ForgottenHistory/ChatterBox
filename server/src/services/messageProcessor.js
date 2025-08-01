// services/messageProcessor.js
const eventBus = require('./eventBus');

class MessageProcessor {
  constructor(botManager, responseGenerator, responseLogic, conversationHistory) {
    this.botManager = botManager;
    this.responseGenerator = responseGenerator;
    this.responseLogic = responseLogic;
    this.conversationHistory = conversationHistory;
    
    this.setupEventListeners();
    console.log('MessageProcessor initialized');
  }

  setupEventListeners() {
    // Listen for incoming messages
    eventBus.onMessageReceived(async (message) => {
      await this.processMessage(message);
    });
  }

  async processMessage(userMessage) {
    console.log('Processing message for bot responses in room:', userMessage.room);

    try {
      // Determine which bots should respond (don't add to history yet)
      const respondingBots = this.responseLogic.shouldRespond(
        userMessage,
        this.botManager.getAllBots()
      );

      if (respondingBots.length === 0) {
        console.log('No bots will respond to this message');
        // Add user message to history even if no bots respond
        this.conversationHistory.addMessage(userMessage);
        return;
      }

      // Send typing indicators for responding bots
      respondingBots.forEach((bot, index) => {
        setTimeout(() => {
          eventBus.emitTypingIndicator({
            bot,
            room: userMessage.room,
            isTyping: true
          });
        }, index * 200);
      });

      // Get LLM settings - THIS WAS MISSING!
      const { getService } = require('./serviceRegistry');
      const llmConfiguration = getService('llmConfigurationService');
      const globalLlmSettings = await llmConfiguration.getSettings();

      console.log(`🔍 MessageProcessor got globalLlmSettings:`, {
        hasSettings: !!globalLlmSettings,
        hasSystemPrompt: !!(globalLlmSettings && globalLlmSettings.systemPrompt),
        systemPromptLength: globalLlmSettings?.systemPrompt?.length || 0
      });

      // Generate responses from selected bots WITH LLM SETTINGS
      const responses = await this.responseGenerator.generateMultipleResponses(
        respondingBots,
        userMessage,
        userMessage.room,
        this.conversationHistory.getRecentHistory(),
        globalLlmSettings // NOW PASSING THE SETTINGS!
      );

      // Add user message and bot responses to history
      this.conversationHistory.addMessage(userMessage);
      responses.forEach(response => {
        this.conversationHistory.addMessage(response);
      });

      // Send responses with timing
      this.sendResponsesWithTiming(responses);

      console.log('Bot responses processed:', responses.length);

    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  sendResponsesWithTiming(responses) {
    responses.forEach((response, index) => {
      setTimeout(() => {
        // Stop typing indicator
        eventBus.emitTypingIndicator({
          bot: response.author,
          room: response.room,
          isTyping: false
        });
        
        // Send response after brief pause
        setTimeout(() => {
          eventBus.emitBotResponseGenerated(response);
          eventBus.emitActivityUpdate();
        }, 300);
      }, (index + 1) * 1500);
    });
  }
}

module.exports = MessageProcessor;