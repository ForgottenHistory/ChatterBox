const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Get current LLM settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await botService.getLLMSettings();
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

    const result = await botService.updateLLMSettings(settings);

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

    const result = await botService.resetLLMSettings();

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
    const defaults = await botService.getDefaultLLMSettings();
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

// Get service status (for debugging)
router.get('/status', (req, res) => {
  try {
    const status = botService.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error fetching service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service status'
    });
  }
});

// Get current model
router.get('/model', async (req, res) => {
  try {
    const llmService = require('../services/llmService');
    const currentModel = llmService.getCurrentModel();
    const status = await llmService.getEnhancedStatus();

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
router.post('/model', (req, res) => {
  try {
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'Model ID is required'
      });
    }

    const llmService = require('../services/llmService');
    const success = llmService.setModel(modelId);

    if (success) {
      res.json({
        success: true,
        message: 'Model updated successfully',
        currentModel: llmService.getCurrentModel()
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
router.post('/model/reset', (req, res) => {
  try {
    const llmService = require('../services/llmService');
    const defaultModel = llmService.resetToDefaultModel();

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

module.exports = router;