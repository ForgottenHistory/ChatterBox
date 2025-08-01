const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Get all bots
router.get('/', async (req, res) => {
  try {
    const bots = botService.getAllBots();
    res.json(bots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// Get specific bot by ID
router.get('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = botService.getBotById(botId);

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Return public bot data
    const publicBot = {
      id: bot.id,
      username: bot.username,
      personality: bot.personality,
      status: bot.status,
      avatar: bot.avatar,
      avatarType: bot.avatarType,
      joinedAt: bot.joinedAt,
      lastActive: bot.lastActive,
      description: bot.description
    };

    res.json(publicBot);
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Create new bot with validation
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      exampleMessages,
      firstMessage,
      avatar,
      avatarType
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Bot name is required' });
    }

    // Prepare bot configuration (simplified)
    const botConfig = {
      name: name.trim(),
      description: description || '',
      exampleMessages: exampleMessages || '',
      firstMessage: firstMessage || '',
      avatar: avatar || '#7289DA',
      avatarType: avatarType || 'initials'
    };

    // Create bot through service (now with validation)
    const result = await botService.createBot(botConfig);

    if (!result.success) {
      return res.status(400).json({ 
        error: 'Failed to create bot',
        details: result.errors 
      });
    }

    console.log('Bot created successfully:', {
      id: result.bot.id,
      name: result.bot.username
    });

    res.status(201).json(result.bot);
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// Delete bot
router.delete('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;

    const deleted = botService.deleteBot(botId);

    if (!deleted) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({ success: true, message: 'Bot deleted successfully' });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// Update bot status
router.patch('/:botId/status', async (req, res) => {
  try {
    const { botId } = req.params;
    const { status } = req.body;

    if (!['online', 'away', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = botService.updateBotStatus(botId, status);

    if (!updated) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({ success: true, message: 'Bot status updated' });
  } catch (error) {
    console.error('Error updating bot status:', error);
    res.status(500).json({ error: 'Failed to update bot status' });
  }
});

// Get bot service status (for debugging)
router.get('/debug/status', async (req, res) => {
  try {
    const status = botService.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting bot service status:', error);
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

module.exports = router;