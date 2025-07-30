const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Prompt routes working' });
});

// Get prompt data for a specific bot
router.get('/bot/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const { message } = req.query; // Optional current message to include

        const bot = botService.getBotById(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Get bot context
        const botContext = botService.getBotContext(botId);
        if (!botContext) {
            return res.status(404).json({ error: 'Bot context not found' });
        }

        // Get conversation history
        const conversationHistory = botService.getConversationContext();

        // Get LLM settings
        const llmSettings = await botService.getLLMSettings();

        // Build the actual system prompt that would be sent
        const systemPrompt = botService.buildSystemPrompt(botContext, llmSettings);

        // Format conversation history for display
        const formattedHistory = conversationHistory.map(msg => ({
            role: msg.isBot ? 'assistant' : 'user',
            content: `${msg.username}: ${msg.content}`,
            timestamp: msg.timestamp
        }));

        const promptData = {
            botName: bot.username,
            botId: bot.id,
            systemPrompt: systemPrompt,
            conversationHistory: formattedHistory,
            currentMessage: message || null,
            llmSettings: llmSettings,
            botContext: {
                description: botContext.description,
                exampleMessages: botContext.exampleMessages,
                hasCustomSettings: !!botContext.llmSettings
            }
        };

        res.json({ success: true, promptData });
    } catch (error) {
        console.error('Error fetching prompt data:', error);
        res.status(500).json({ error: 'Failed to fetch prompt data' });
    }
});

// Get prompt data for all active bots
router.get('/all-bots', async (req, res) => {
    try {
        const { message } = req.query;

        const bots = botService.getAllBots();
        const activeBots = bots.filter(bot => bot.status === 'online');

        if (activeBots.length === 0) {
            return res.json({ success: true, promptData: [] });
        }

        const conversationHistory = botService.getConversationContext();
        const llmSettings = await botService.getLLMSettings();

        const promptDataArray = activeBots.map(bot => {
            try {
                const botContext = botService.getBotContext(bot.id);
                if (!botContext) {
                    console.warn(`No context found for bot ${bot.username}`);
                    return null;
                }

                // Try to build system prompt, fallback if it fails
                let systemPrompt;
                try {
                    systemPrompt = botService.buildSystemPrompt(botContext, llmSettings);
                } catch (error) {
                    console.warn(`Failed to build system prompt for ${bot.username}:`, error.message);
                    systemPrompt = botContext.systemPrompt || botContext.description || `You are ${bot.username}, a helpful AI assistant.`;
                }

                const formattedHistory = conversationHistory.map(msg => ({
                    role: msg.isBot ? 'assistant' : 'user',
                    content: `${msg.username}: ${msg.content}`,
                    timestamp: msg.timestamp
                }));

                return {
                    botName: bot.username,
                    botId: bot.id,
                    systemPrompt: systemPrompt,
                    conversationHistory: formattedHistory,
                    currentMessage: message || null,
                    llmSettings: llmSettings,
                    botContext: {
                        description: botContext?.description || '',
                        exampleMessages: botContext?.exampleMessages || '',
                        hasCustomSettings: !!(botContext?.llmSettings)
                    }
                };
            } catch (error) {
                console.error(`Error processing bot ${bot.username}:`, error);
                return null;
            }
        }).filter(Boolean); // Remove null entries

        res.json({ success: true, promptData: promptDataArray });
    } catch (error) {
        console.error('Error fetching all prompt data:', error);
        res.status(500).json({ error: 'Failed to fetch prompt data' });
    }
});

module.exports = router;