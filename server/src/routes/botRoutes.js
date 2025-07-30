const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Get all bots
router.get('/', (req, res) => {
  try {
    const bots = botService.getAllBots();
    res.json(bots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// Get specific bot by ID
router.get('/:botId', (req, res) => {
  try {
    const { botId } = req.params;
    const bot = botService.getBotById(botId);
    
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    // Don't expose triggers and responses for security
    const publicBot = {
      id: bot.id,
      username: bot.username,
      personality: bot.personality,
      status: bot.status,
      avatar: bot.avatar,
      avatarType: bot.avatarType,
      joinedAt: bot.joinedAt,
      lastActive: bot.lastActive
    };
    
    res.json(publicBot);
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Create new bot
router.post('/', (req, res) => {
  try {
    const { name, personality, triggers, responses, avatar, responseChance } = req.body;
    
    // Validate required fields
    if (!name || !personality || !triggers || !responses) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Array.isArray(triggers) || triggers.length === 0) {
      return res.status(400).json({ error: 'Triggers must be a non-empty array' });
    }

    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: 'Responses must be a non-empty array' });
    }

    const validPersonalities = ['friendly', 'sarcastic', 'helpful', 'mysterious', 'energetic'];
    if (!validPersonalities.includes(personality)) {
      return res.status(400).json({ error: 'Invalid personality type' });
    }

    // Check if name is already taken
    if (botService.isBotNameTaken(name.trim())) {
      return res.status(400).json({ error: 'Bot name is already taken' });
    }

    // Create bot through service
    const newBot = botService.createBot({
      name: name.trim(),
      personality,
      triggers,
      responses,
      avatar: avatar || '#7289DA',
      responseChance: responseChance || 0.7
    });

    if (!newBot) {
      return res.status(400).json({ error: 'Failed to create bot' });
    }

    // Return public bot data
    res.status(201).json({
      id: newBot.id,
      username: newBot.username,
      personality: newBot.personality,
      status: newBot.status,
      avatar: newBot.avatar,
      avatarType: newBot.avatarType,
      joinedAt: newBot.joinedAt,
      lastActive: newBot.lastActive
    });
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// Delete bot
router.delete('/:botId', (req, res) => {
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

// Update bot status (for future admin features)
router.patch('/:botId/status', (req, res) => {
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

module.exports = router;