const express = require('express');
const router = express.Router();
const { getService } = require('../services/serviceRegistry');

// Get current LLM settings
router.get('/settings', async (req, res) => {
  try {
    const llmConfiguration = getService('llmConfigurationService');
    const settings = await llmConfiguration.getSettings();
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching LLM settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LLM settings'
    });
  }
});

// Update LLM settings
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid settings object is required'
      });
    }

    console.log('Updating LLM settings:', settings);

    const llmConfiguration = getService('llmConfigurationService');
    const result = await llmConfiguration.updateSettings(settings);

    if (result.success) {
      console.log('LLM settings updated successfully');
      res.json({
        success: true,
        message: 'LLM settings updated and saved successfully',
        settings: result.settings
      });
    } else {
      console.error('Failed to update LLM settings:', result.error);
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error updating LLM settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update LLM settings'
    });
  }
});

// Reset LLM settings to defaults
router.post('/settings/reset', async (req, res) => {
  try {
    console.log('Resetting LLM settings to defaults');

    const llmConfiguration = getService('llmConfigurationService');
    const result = await llmConfiguration.resetSettings();

    if (result.success) {
      console.log('LLM settings reset successfully');
      res.json({
        success: true,
        message: 'LLM settings reset to defaults and saved',
        settings: result.settings
      });
    } else {
      console.error('Failed to reset LLM settings:', result.error);
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error resetting LLM settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset LLM settings'
    });
  }
});

// Get default LLM settings
router.get('/settings/defaults', async (req, res) => {
  try {
    const llmConfiguration = getService('llmConfigurationService');
    const defaults = await llmConfiguration.getDefaultSettings();
    
    res.json({
      success: true,
      settings: defaults
    });
  } catch (error) {
    console.error('Error fetching default LLM settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default LLM settings'
    });
  }
});

// Get current model
router.get('/model', async (req, res) => {
  try {
    const llmConfiguration = getService('llmConfigurationService');
    const currentModel = llmConfiguration.getCurrentModel();
    const status = await llmConfiguration.getModelStatus();

    res.json({
      success: true,
      currentModel,
      status
    });
  } catch (error) {
    console.error('Error getting current model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current model'
    });
  }
});

// Set current model
router.post('/model', async (req, res) => {
  try {
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'Model ID is required'
      });
    }

    const llmConfiguration = getService('llmConfigurationService');
    const success = llmConfiguration.setModel(modelId);

    if (success) {
      res.json({
        success: true,
        message: 'Model updated successfully',
        currentModel: llmConfiguration.getCurrentModel()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to set model'
      });
    }
  } catch (error) {
    console.error('Error setting model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set model'
    });
  }
});

// Reset to default model
router.post('/model/reset', async (req, res) => {
  try {
    const llmConfiguration = getService('llmConfigurationService');
    const defaultModel = llmConfiguration.resetToDefaultModel();

    res.json({
      success: true,
      message: 'Model reset to default',
      currentModel: defaultModel
    });
  } catch (error) {
    console.error('Error resetting model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset model'
    });
  }
});

// Get queue status
router.get('/queue/status', async (req, res) => {
  try {
    const llmConfiguration = getService('llmConfigurationService');
    const status = llmConfiguration.getQueueStatus();

    res.json({
      success: true,
      queue: status
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status'
    });
  }
});

// Update concurrent request limit
router.post('/queue/concurrent-limit', async (req, res) => {
  try {
    const { limit } = req.body;

    if (!limit || !Number.isInteger(limit) || limit < 1 || limit > 20) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be an integer between 1 and 20'
      });
    }

    const llmConfiguration = getService('llmConfigurationService');
    llmConfiguration.setMaxConcurrentRequests(limit);

    res.json({
      success: true,
      message: `Concurrent request limit set to ${limit}`,
      queue: llmConfiguration.getQueueStatus()
    });
  } catch (error) {
    console.error('Error setting concurrent limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set concurrent limit'
    });
  }
});

// Clear request queue (emergency)
router.post('/queue/clear', async (req, res) => {
  try {
    const llmConfiguration = getService('llmConfigurationService');
    const clearedCount = llmConfiguration.clearQueue();

    res.json({
      success: true,
      message: `Queue cleared: ${clearedCount} requests cancelled`,
      queue: llmConfiguration.getQueueStatus()
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear queue'
    });
  }
});

// Test LLM configuration
router.post('/test', async (req, res) => {
  try {
    const { prompt = "Hello, respond with 'Test successful'" } = req.body;
    
    const llmConfiguration = getService('llmConfigurationService');
    const result = await llmConfiguration.testConfiguration(prompt);

    res.json({
      success: true,
      test: result
    });
  } catch (error) {
    console.error('Error testing LLM:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test LLM configuration'
    });
  }
});

// Get comprehensive LLM status
router.get('/status', async (req, res) => {
  try {
    const llmConfiguration = getService('llmConfigurationService');
    const status = await llmConfiguration.getComprehensiveStatus();

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting LLM status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get LLM status'
    });
  }
});

// Token estimation endpoints
router.get('/tokens/estimate', async (req, res) => {
  try {
    const { text } = req.query;
    const tokenEstimator = require('../services/tokenEstimator');

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text parameter is required'
      });
    }

    const tokens = tokenEstimator.estimateTokens(text);

    res.json({
      success: true,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      estimatedTokens: tokens,
      textLength: text.length,
      charsPerToken: tokenEstimator.getConfig().charsPerToken
    });
  } catch (error) {
    console.error('Error estimating tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate tokens'
    });
  }
});

// Get token estimator configuration
router.get('/tokens/config', async (req, res) => {
  try {
    const tokenEstimator = require('../services/tokenEstimator');
    const config = tokenEstimator.getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error getting token config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token configuration'
    });
  }
});

module.exports = router;