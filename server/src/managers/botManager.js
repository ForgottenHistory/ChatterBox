class BotManager {
    constructor() {
        this.bots = [];
        console.log('BotManager initialized (simplified)');
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

    // Create a new bot with simplified configuration
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

                // Bot specific fields (simplified)
                description: config.description || '',
                firstMessage: config.firstMessage || '',
                exampleMessages: config.exampleMessages || '',

                // Legacy fields for compatibility
                personality: 'friendly',
                triggers: [],
                responses: [],
                responseChance: 1.0
            };

            this.bots.push(newBot);

            console.log(`Created new bot: ${newBot.username} (${newBot.id})`);
            console.log(`  - Description: ${newBot.description.substring(0, 50)}...`);
            console.log(`  - Has example messages: ${!!newBot.exampleMessages}`);

            return newBot;
        } catch (error) {
            console.error('Error creating bot:', error);
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

    // Get bot context for LLM (simplified)
    getBotContext(botId) {
        const bot = this.getBotById(botId);
        if (!bot) return null;

        return {
            name: bot.username,
            description: bot.description,
            firstMessage: bot.firstMessage,
            exampleMessages: bot.exampleMessages
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