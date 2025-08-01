const express = require('express');
const router = express.Router();
const { getService } = require('../services/serviceRegistry');

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Prompt routes working with new architecture' });
});

// Get prompt data for a specific bot
router.get('/bot/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const { message } = req.query;

        const botOrchestration = getService('botOrchestrationService');
        const conversationService = getService('conversationService');
        const llmConfiguration = getService('llmConfigurationService');
        const promptService = getService('promptService');

        // Get bot and context
        const bot = botOrchestration.getBotById(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const botContext = botOrchestration.getBotContext(botId);
        if (!botContext) {
            return res.status(404).json({ error: 'Bot context not found' });
        }

        // Get conversation history and LLM settings
        const conversationHistory = conversationService.getRecentHistory();
        const llmSettings = await llmConfiguration.getSettings();

        // Get prompt data using the prompt service
        const promptData = promptService.getPromptDataForBot(
            botContext,
            conversationHistory,
            llmSettings,
            message
        );

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

        const botOrchestration = getService('botOrchestrationService');
        const conversationService = getService('conversationService');
        const llmConfiguration = getService('llmConfigurationService');
        const promptService = getService('promptService');

        // Get active bots
        const bots = botOrchestration.getAllBots();
        const activeBots = bots.filter(bot => bot.status === 'online');

        if (activeBots.length === 0) {
            return res.json({ success: true, promptData: [] });
        }

        // Get shared data
        const conversationHistory = conversationService.getRecentHistory();
        const llmSettings = await llmConfiguration.getSettings();

        // Generate prompt data for each bot
        const promptDataArray = activeBots.map(bot => {
            try {
                const botContext = botOrchestration.getBotContext(bot.id);
                if (!botContext) {
                    console.warn(`No context found for bot ${bot.username}`);
                    return null;
                }

                return promptService.getPromptDataForBot(
                    botContext,
                    conversationHistory,
                    llmSettings,
                    message
                );
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

// Analyze prompt for a specific bot
router.get('/analyze/:botId', async (req, res) => {
    try {
        const { botId } = req.params;

        const botOrchestration = getService('botOrchestrationService');
        const llmConfiguration = getService('llmConfigurationService');
        const promptService = getService('promptService');

        const bot = botOrchestration.getBotById(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const botContext = botOrchestration.getBotContext(botId);
        const llmSettings = await llmConfiguration.getSettings();

        const analysis = promptService.analyzePrompt(botContext, llmSettings);

        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Error analyzing prompt:', error);
        res.status(500).json({ error: 'Failed to analyze prompt' });
    }
});

// Validate prompt content
router.post('/validate', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt content is required' });
        }

        const promptService = getService('promptService');
        const validation = promptService.validatePromptContent(prompt);

        res.json({ success: true, validation });
    } catch (error) {
        console.error('Error validating prompt:', error);
        res.status(500).json({ error: 'Failed to validate prompt' });
    }
});

// Get prompt service status
router.get('/status', async (req, res) => {
    try {
        const promptService = getService('promptService');
        const status = promptService.getStatus();

        res.json({ 
            success: true, 
            status
        });
    } catch (error) {
        console.error('Error getting prompt service status:', error);
        res.status(500).json({ error: 'Failed to get prompt service status' });
    }
});

module.exports = router;