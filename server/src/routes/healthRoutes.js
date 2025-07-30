const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Basic health check
router.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check with LLM settings info
router.get('/detailed', async (req, res) => {
  try {
    const serviceStatus = botService.getStatus();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      services: {
        botService: {
          initialized: serviceStatus.initialized,
          settingsFile: serviceStatus.settingsFile,
          botCount: serviceStatus.botCount,
          conversationHistoryLength: serviceStatus.conversationHistoryLength
        },
        llm: {
          configured: !!process.env.FEATHERLESS_API_KEY,
          provider: 'Featherless AI'
        }
      }
    });
  } catch (error) {
    console.error('Error in detailed health check:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;