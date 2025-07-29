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