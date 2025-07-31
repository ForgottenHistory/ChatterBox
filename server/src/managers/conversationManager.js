const botService = require('./botService');

class ConversationManager {
    constructor(chatHandler) {
        this.chatHandler = chatHandler;
        this.isActive = false;
        this.intervalId = null;
        this.conversationInterval = 60000; // 1 minute default
        this.minInterval = 30000; // 30 seconds minimum
        this.maxInterval = 300000; // 5 minutes maximum
        this.lastActivity = Date.now();
        this.inactivityThreshold = 120000; // 2 minutes of no messages
        
        console.log('ConversationManager initialized (ultra-simple)');
    }

    // Start automatic conversations
    start(intervalMs = this.conversationInterval) {
        if (this.isActive) {
            console.log('ConversationManager is already active');
            return;
        }

        const interval = Math.max(this.minInterval, Math.min(this.maxInterval, intervalMs));
        this.conversationInterval = interval;

        this.isActive = true;
        this.scheduleNextConversation();
        
        console.log(`ConversationManager started with ${interval}ms interval`);
    }

    // Stop automatic conversations
    stop() {
        if (!this.isActive) {
            console.log('ConversationManager is not active');
            return;
        }

        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }

        this.isActive = false;
        console.log('ConversationManager stopped');
    }

    // Schedule the next conversation attempt
    scheduleNextConversation() {
        if (!this.isActive) return;

        // Add randomness to interval (±30%)
        const randomFactor = 0.7 + (Math.random() * 0.6); // 0.7 to 1.3
        const nextInterval = Math.floor(this.conversationInterval * randomFactor);

        this.intervalId = setTimeout(() => {
            this.attemptConversation();
        }, nextInterval);

        console.log(`Next conversation attempt in ${Math.floor(nextInterval / 1000)} seconds`);
    }

    // Attempt to trigger a bot to speak naturally
    async attemptConversation() {
        try {
            if (!this.isActive) return;

            console.log('Checking for automatic conversation opportunity...');

            // Check recent activity
            const timeSinceLastActivity = Date.now() - this.lastActivity;
            const hasRecentActivity = timeSinceLastActivity < this.inactivityThreshold;

            // Get online bots
            const bots = botService.getAllBots();
            const activeBots = bots.filter(bot => bot.status === 'online');

            if (activeBots.length === 0) {
                console.log('No active bots available');
                this.scheduleNextConversation();
                return;
            }

            // Skip if recent activity
            if (hasRecentActivity) {
                console.log(`Recent activity ${Math.floor(timeSinceLastActivity/1000)}s ago, skipping`);
                this.scheduleNextConversation();
                return;
            }

            // Random chance to trigger (50% chance)
            if (Math.random() > 0.5) {
                console.log('Random skip - no conversation triggered');
                this.scheduleNextConversation();
                return;
            }

            // Select random bot and let it speak naturally
            const selectedBot = activeBots[Math.floor(Math.random() * activeBots.length)];
            await this.letBotSpeak(selectedBot, 'general');

        } catch (error) {
            console.error('Error in attemptConversation:', error);
        } finally {
            this.scheduleNextConversation();
        }
    }

    // Let a bot speak naturally based on its system prompt
    async letBotSpeak(bot, room = 'general') {
        try {
            console.log(`Letting ${bot.username} speak naturally...`);

            // Create a minimal message that just asks the bot to respond naturally
            // The bot's system prompt will handle what it actually says
            const naturalMessage = {
                content: "", // Empty content - let the system prompt drive the response
                author: {
                    id: 'natural-trigger',
                    username: 'Natural',
                    type: 'system'
                },
                timestamp: new Date().toISOString(),
                room: room
            };

            // Generate response using the bot's existing system prompt
            const response = await botService.generateMessage(bot, naturalMessage, room);

            if (response && response.content && response.content.trim()) {
                // Send the response with typing indicator
                this.sendBotResponseWithTyping(response, room);
                this.updateLastActivity();
                
                console.log(`${bot.username} spoke naturally: ${response.content.substring(0, 50)}...`);
            } else {
                console.log(`${bot.username} generated empty response, skipping`);
            }

        } catch (error) {
            console.error(`Error letting ${bot.username} speak:`, error);
        }
    }

    // Send bot response with typing indicator
    sendBotResponseWithTyping(response, room) {
        if (!this.chatHandler || !response) return;

        // Send typing indicator
        this.chatHandler.sendTypingIndicator(response.author, room, true);

        // Send response after typing delay
        setTimeout(() => {
            this.chatHandler.sendTypingIndicator(response.author, room, false);
            
            setTimeout(() => {
                this.chatHandler.sendBotResponse(response, room);
            }, 300);
        }, 1500);
    }

    // Update last activity timestamp
    updateLastActivity() {
        this.lastActivity = Date.now();
    }

    // Set conversation interval
    setInterval(intervalMs) {
        const interval = Math.max(this.minInterval, Math.min(this.maxInterval, intervalMs));
        this.conversationInterval = interval;
        
        console.log(`Conversation interval updated to ${interval}ms`);
        
        if (this.isActive) {
            this.stop();
            this.start(interval);
        }
    }

    // Get current status
    getStatus() {
        return {
            isActive: this.isActive,
            conversationInterval: this.conversationInterval,
            timeSinceLastActivity: Date.now() - this.lastActivity,
            inactivityThreshold: this.inactivityThreshold,
            nextConversationIn: this.intervalId ? 'scheduled' : 'not scheduled'
        };
    }

    // Configure settings
    configure(options = {}) {
        if (options.inactivityThreshold) {
            this.inactivityThreshold = Math.max(30000, options.inactivityThreshold);
        }
        
        if (options.minInterval) {
            this.minInterval = Math.max(10000, options.minInterval);
        }
        
        if (options.maxInterval) {
            this.maxInterval = Math.min(3600000, options.maxInterval);
        }
        
        console.log('ConversationManager configured:', {
            inactivityThreshold: this.inactivityThreshold,
            minInterval: this.minInterval,
            maxInterval: this.maxInterval
        });
    }
}

module.exports = ConversationManager;