const llmService = require('../llmService');

class ResponseGenerator {
    constructor() {
        console.log('ResponseGenerator initialized');
    }

    // Generate a message from an LLM bot with settings
    async generateMessage(bot, userMessage, room, conversationHistory = [], globalLlmSettings = {}) {
        console.log(`Generating LLM response for bot: ${bot.username}`);

        try {
            // Get bot context for LLM
            const botContext = this.getBotContext(bot);

            if (!botContext) {
                throw new Error('Bot context not found');
            }

            // Generate response using LLM service with settings
            const responseContent = await llmService.generateResponse(
                botContext,
                userMessage,
                conversationHistory,
                globalLlmSettings
            );

            // Update bot's last active time
            bot.lastActive = new Date().toISOString();

            return {
                id: `${Date.now()}-${bot.id}-${Math.random().toString(36).substr(2, 9)}`,
                content: responseContent,
                timestamp: new Date().toISOString(),
                room: room,
                author: {
                    ...bot,
                    lastActive: bot.lastActive
                }
            };

        } catch (error) {
            console.error(`Error generating message for ${bot.username}:`, error);

            // Fallback to simple response
            return this.generateFallbackMessage(bot, room);
        }
    }

    // Generate fallback message when LLM fails
    generateFallbackMessage(bot, room) {
        const fallbackContent = bot.firstMessage || `Hello! I'm ${bot.username}. How can I help?`;

        return {
            id: `${Date.now()}-${bot.id}-${Math.random().toString(36).substr(2, 9)}`,
            content: fallbackContent,
            timestamp: new Date().toISOString(),
            room: room,
            author: {
                ...bot,
                lastActive: new Date().toISOString()
            }
        };
    }

    // Get bot context for LLM from bot object
    getBotContext(bot) {
        return {
            name: bot.username,
            description: bot.description,
            systemPrompt: bot.systemPrompt,
            firstMessage: bot.firstMessage,
            exampleMessages: bot.exampleMessages,
            llmSettings: bot.llmSettings // Include bot-specific settings
        };
    }

    // Generate multiple responses from different bots with settings
    async generateMultipleResponses(bots, userMessage, room, conversationHistory = [], globalLlmSettings = {}) {
        const responses = [];

        for (const bot of bots) {
            try {
                const response = await this.generateMessage(bot, userMessage, room, conversationHistory, globalLlmSettings);
                responses.push(response);
            } catch (error) {
                console.error(`Failed to generate response from ${bot.username}:`, error);
                // Continue with other bots even if one fails
            }
        }

        return responses;
    }
}

module.exports = ResponseGenerator;