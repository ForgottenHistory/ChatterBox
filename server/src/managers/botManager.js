class BotManager {
    constructor() {
        this.bots = [];
        console.log('BotManager initialized');
    }

    // Get bot by ID
    getBotById(botId) {
        return this.bots.find(bot => bot.id === botId);
    }

    // Get all bots
    getAllBots() {
        return this.bots.map(bot => ({
            id: bot.id,
            username: bot.username,
            status: bot.status,
            avatar: bot.avatar,
            avatarType: bot.avatarType,
            joinedAt: bot.joinedAt,
            lastActive: bot.lastActive,
            description: bot.description
        }));
    }

    // Create a new bot with LLM settings
    createBot(config) {
        try {
            // Check if name is already taken
            if (this.isBotNameTaken(config.name)) {
                console.log(`Bot name '${config.name}' is already taken`);
                return null;
            }

            const now = new Date().toISOString();
            const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const newBot = {
                type: 'bot',
                id: botId,
                username: config.name,
                avatar: config.avatar || '#7289DA',
                avatarType: config.avatarType || 'initials',
                status: 'online',
                joinedAt: now,
                lastActive: now,

                // LLM Bot specific fields
                description: config.description || '',
                firstMessage: config.firstMessage || '',
                exampleMessages: config.exampleMessages || '',
                systemPrompt: config.systemPrompt || '',

                // LLM Settings (bot-specific overrides)
                llmSettings: this.validateLLMSettings(config.llmSettings),

                // Legacy fields for compatibility
                personality: 'friendly',
                triggers: [],
                responses: [],
                responseChance: 1.0
            };

            this.bots.push(newBot);

            console.log(`Created new LLM bot: ${newBot.username} (${newBot.id})`);
            console.log(`  - Description: ${newBot.description.substring(0, 50)}...`);
            console.log(`  - Has system prompt: ${!!newBot.systemPrompt}`);
            console.log(`  - Has LLM settings: ${!!newBot.llmSettings}`);

            return newBot;
        } catch (error) {
            console.error('Error creating bot:', error);
            return null;
        }
    }

    // Validate and sanitize LLM settings for bot
    validateLLMSettings(llmSettings) {
        if (!llmSettings) return null;

        try {
            const validated = {};

            // Only store non-default values to save space
            if (llmSettings.systemPrompt && llmSettings.systemPrompt.trim()) {
                validated.systemPrompt = llmSettings.systemPrompt.trim();
            }

            if (llmSettings.temperature !== undefined && llmSettings.temperature !== 0.6) {
                validated.temperature = Math.max(0, Math.min(2, parseFloat(llmSettings.temperature)));
            }

            if (llmSettings.topP !== undefined && llmSettings.topP !== 1.0) {
                validated.topP = Math.max(0.01, Math.min(1, parseFloat(llmSettings.topP)));
            }

            if (llmSettings.topK !== undefined && llmSettings.topK !== -1) {
                const topK = parseInt(llmSettings.topK);
                validated.topK = topK === -1 ? -1 : Math.max(1, topK);
            }

            if (llmSettings.frequencyPenalty !== undefined && llmSettings.frequencyPenalty !== 0) {
                validated.frequencyPenalty = Math.max(-2, Math.min(2, parseFloat(llmSettings.frequencyPenalty)));
            }

            if (llmSettings.presencePenalty !== undefined && llmSettings.presencePenalty !== 0) {
                validated.presencePenalty = Math.max(-2, Math.min(2, parseFloat(llmSettings.presencePenalty)));
            }

            if (llmSettings.repetitionPenalty !== undefined && llmSettings.repetitionPenalty !== 1.0) {
                validated.repetitionPenalty = Math.max(0.1, Math.min(2, parseFloat(llmSettings.repetitionPenalty)));
            }

            if (llmSettings.minP !== undefined && llmSettings.minP !== 0) {
                validated.minP = Math.max(0, Math.min(1, parseFloat(llmSettings.minP)));
            }

            return Object.keys(validated).length > 0 ? validated : null;
        } catch (error) {
            console.warn('Invalid LLM settings provided, ignoring:', error.message);
            return null;
        }
    }

    // Delete a bot
    deleteBot(botId) {
        try {
            const initialLength = this.bots.length;
            this.bots = this.bots.filter(bot => bot.id !== botId);

            const wasDeleted = this.bots.length < initialLength;

            if (wasDeleted) {
                console.log(`Deleted bot: ${botId}`);
            }

            return wasDeleted;
        } catch (error) {
            console.error('Error deleting bot:', error);
            return false;
        }
    }

    // Update bot status
    updateBotStatus(botId, status) {
        const bot = this.getBotById(botId);
        if (bot) {
            bot.status = status;
            bot.lastActive = new Date().toISOString();
            return true;
        }
        return false;
    }

    // Check if bot name already exists
    isBotNameTaken(name) {
        return this.bots.some(bot =>
            bot.username.toLowerCase() === name.toLowerCase()
        );
    }

    // Get bot context for LLM (includes bot-specific settings)
    getBotContext(botId) {
        const bot = this.getBotById(botId);
        if (!bot) return null;

        return {
            name: bot.username,
            description: bot.description,
            systemPrompt: bot.systemPrompt,
            firstMessage: bot.firstMessage,
            exampleMessages: bot.exampleMessages,
            llmSettings: bot.llmSettings // Bot-specific LLM overrides
        };
    }

    // Get initials for a bot (used for avatar display)
    getBotInitials(botName) {
        return botName
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
}

module.exports = BotManager;