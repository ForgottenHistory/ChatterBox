const eventBus = require('../services/eventBus');

class ConversationManager {
    constructor() {
        this.isActive = false;
        this.intervalId = null;
        this.conversationInterval = 120000; // 2 minutes default (increased)
        this.minInterval = 60000; // 1 minute minimum (increased)
        this.maxInterval = 600000; // 10 minutes maximum
        this.lastActivity = Date.now();
        this.inactivityThreshold = 300000; // 5 minutes of no messages (increased)
        
        // Track bot speaking attempts to prevent spam
        this.botLastSpoke = new Map();
        this.botSpeakCooldown = 180000; // 3 minutes between natural responses per bot
        
        // Global conversation rate limiting
        this.lastNaturalConversation = 0;
        this.naturalConversationCooldown = 90000; // 1.5 minutes between any natural conversations
        
        // Will be injected
        this.botManager = null;
        this.responseGenerator = null;
        
        this.setupEventListeners();
        console.log('ConversationManager initialized with spam prevention');
    }

    // Inject dependencies
    setDependencies(botManager, responseGenerator) {
        this.botManager = botManager;
        this.responseGenerator = responseGenerator;
        console.log('ConversationManager dependencies injected');
    }

    setupEventListeners() {
        // Listen for activity updates
        eventBus.onActivityUpdate(() => {
            this.updateLastActivity();
        });
    }

    // Start automatic conversations
    start(intervalMs = this.conversationInterval) {
        if (this.isActive) {
            console.log('ConversationManager is already active');
            return;
        }

        if (!this.botManager || !this.responseGenerator) {
            console.error('ConversationManager dependencies not injected');
            return;
        }

        const interval = Math.max(this.minInterval, Math.min(this.maxInterval, intervalMs));
        this.conversationInterval = interval;

        this.isActive = true;
        this.scheduleNextConversation();
        
        console.log(`ConversationManager started with ${interval}ms interval (${Math.floor(interval/1000)}s)`);
    }

    // Stop automatic conversations
    stop() {
        if (!this.isActive) {
            return;
        }

        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }

        this.isActive = false;
        console.log('ConversationManager stopped');
    }

    // Schedule the next conversation attempt with better randomization
    scheduleNextConversation() {
        if (!this.isActive) return;

        // Add more randomness to prevent clustering
        const randomFactor = 0.5 + (Math.random() * 1.0); // 0.5 to 1.5
        const nextInterval = Math.floor(this.conversationInterval * randomFactor);

        this.intervalId = setTimeout(() => {
            this.attemptConversation();
        }, nextInterval);

        const nextInSeconds = Math.floor(nextInterval / 1000);
        if (nextInSeconds > 30) { // Only log if interval is significant
            console.log(`Next conversation attempt in ${nextInSeconds} seconds`);
        }
    }

    // Attempt to trigger a bot to speak naturally with better filtering
    async attemptConversation() {
        try {
            if (!this.isActive) return;

            const now = Date.now();

            // Check global rate limiting
            if (now - this.lastNaturalConversation < this.naturalConversationCooldown) {
                console.log('Global conversation cooldown active, skipping');
                this.scheduleNextConversation();
                return;
            }

            // Check recent activity
            const timeSinceLastActivity = now - this.lastActivity;
            const hasRecentActivity = timeSinceLastActivity < this.inactivityThreshold;

            if (hasRecentActivity) {
                console.log(`Recent activity ${Math.floor(timeSinceLastActivity/1000)}s ago, skipping natural conversation`);
                this.scheduleNextConversation();
                return;
            }

            // Get available bots (filter out recently active ones)
            const allBots = this.botManager.getAllBots();
            const availableBots = allBots.filter(bot => {
                if (bot.status !== 'online') return false;
                
                const lastSpoke = this.botLastSpoke.get(bot.id);
                if (lastSpoke && (now - lastSpoke) < this.botSpeakCooldown) {
                    return false; // Bot spoke too recently
                }
                
                return true;
            });

            if (availableBots.length === 0) {
                console.log('No available bots for natural conversation (all on cooldown or offline)');
                this.scheduleNextConversation();
                return;
            }

            // Lower chance to trigger (25% instead of 50%)
            if (Math.random() > 0.25) {
                console.log('Random skip - no natural conversation triggered');
                this.scheduleNextConversation();
                return;
            }

            // Select random bot and let it speak
            const selectedBot = availableBots[Math.floor(Math.random() * availableBots.length)];
            console.log(`Attempting natural conversation with ${selectedBot.username}`);
            
            await this.letBotSpeak(selectedBot, 'general');
            
            // Update global timing
            this.lastNaturalConversation = now;

        } catch (error) {
            console.error('Error in attemptConversation:', error);
        } finally {
            this.scheduleNextConversation();
        }
    }

    // Let a bot speak naturally with better error handling
    async letBotSpeak(bot, room = 'general') {
        try {
            const now = Date.now();
            
            // Double-check bot cooldown
            const lastSpoke = this.botLastSpoke.get(bot.id);
            if (lastSpoke && (now - lastSpoke) < this.botSpeakCooldown) {
                console.log(`${bot.username} is still on cooldown, skipping`);
                return;
            }

            console.log(`Letting ${bot.username} speak naturally...`);

            // Track that this bot is attempting to speak
            this.botLastSpoke.set(bot.id, now);

            // Create a minimal message for natural response
            const naturalMessage = {
                content: "", // Empty content - let the system prompt drive
                author: {
                    id: 'natural-trigger',
                    username: 'System',
                    type: 'system'
                },
                timestamp: new Date().toISOString(),
                room: room
            };

            // Generate response
            const response = await this.responseGenerator.generateMessage(
                bot, 
                naturalMessage, 
                room
            );

            if (response && response.content && response.content.trim()) {
                // Send typing indicator
                eventBus.emitTypingIndicator({
                    bot: response.author,
                    room: room,
                    isTyping: true
                });

                // Send response after delay
                setTimeout(() => {
                    eventBus.emitTypingIndicator({
                        bot: response.author,
                        room: room,
                        isTyping: false
                    });
                    
                    setTimeout(() => {
                        eventBus.emitBotResponseGenerated(response);
                        this.updateLastActivity();
                        console.log(`✓ ${bot.username} spoke naturally: "${response.content.substring(0, 50)}..."`);
                    }, 500);
                }, 2000);

            } else {
                console.log(`✗ ${bot.username} generated empty response, removing from cooldown`);
                // Remove from cooldown if response failed
                this.botLastSpoke.delete(bot.id);
            }

        } catch (error) {
            console.error(`Error letting ${bot.username} speak:`, error);
            // Remove from cooldown if there was an error
            this.botLastSpoke.delete(bot.id);
        }
    }

    // Update last activity timestamp
    updateLastActivity() {
        this.lastActivity = Date.now();
    }

    // Clean up old bot timing entries
    cleanupBotTimings() {
        const now = Date.now();
        const cutoff = now - (this.botSpeakCooldown * 2);

        for (const [botId, timestamp] of this.botLastSpoke.entries()) {
            if (timestamp < cutoff) {
                this.botLastSpoke.delete(botId);
            }
        }
    }

    // Set conversation interval
    setInterval(intervalMs) {
        const interval = Math.max(this.minInterval, Math.min(this.maxInterval, intervalMs));
        this.conversationInterval = interval;
        
        console.log(`Conversation interval updated to ${Math.floor(interval/1000)} seconds`);
        
        if (this.isActive) {
            this.stop();
            this.start(interval);
        }
    }

    // Get current status with better info
    getStatus() {
        this.cleanupBotTimings();

        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        const timeSinceLastNatural = now - this.lastNaturalConversation;

        return {
            isActive: this.isActive,
            conversationInterval: this.conversationInterval,
            timeSinceLastActivity,
            timeSinceLastNaturalConversation: timeSinceLastNatural,
            inactivityThreshold: this.inactivityThreshold,
            botsOnCooldown: this.botLastSpoke.size,
            nextConversationIn: this.intervalId ? 'scheduled' : 'not scheduled',
            hasDependencies: !!(this.botManager && this.responseGenerator),
            globalCooldownActive: timeSinceLastNatural < this.naturalConversationCooldown
        };
    }

    // Configure settings with validation
    configure(options = {}) {
        let changed = false;

        if (options.inactivityThreshold) {
            const newThreshold = Math.max(60000, options.inactivityThreshold); // Min 1 minute
            if (newThreshold !== this.inactivityThreshold) {
                this.inactivityThreshold = newThreshold;
                changed = true;
            }
        }
        
        if (options.minInterval) {
            const newMin = Math.max(30000, options.minInterval); // Min 30 seconds
            if (newMin !== this.minInterval) {
                this.minInterval = newMin;
                changed = true;
            }
        }
        
        if (options.maxInterval) {
            const newMax = Math.min(3600000, options.maxInterval); // Max 1 hour
            if (newMax !== this.maxInterval) {
                this.maxInterval = newMax;
                changed = true;
            }
        }

        if (options.botSpeakCooldown) {
            const newCooldown = Math.max(60000, options.botSpeakCooldown); // Min 1 minute
            if (newCooldown !== this.botSpeakCooldown) {
                this.botSpeakCooldown = newCooldown;
                changed = true;
            }
        }
        
        if (changed) {
            console.log('ConversationManager configured:', {
                inactivityThreshold: Math.floor(this.inactivityThreshold / 1000) + 's',
                minInterval: Math.floor(this.minInterval / 1000) + 's', 
                maxInterval: Math.floor(this.maxInterval / 1000) + 's',
                botSpeakCooldown: Math.floor(this.botSpeakCooldown / 1000) + 's'
            });
        }
    }
}

module.exports = ConversationManager;