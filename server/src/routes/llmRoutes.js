const express = require('express');
const router = express.Router();
const botService = require('../services/botService');

// Get current LLM settings
router.get('/settings', (req, res) => {
    try {
        const settings = botService.getLLMSettings();
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
router.put('/settings', (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Valid settings object is required'
            });
        }

        const result = botService.updateLLMSettings(settings);

        if (result.success) {
            res.json({
                success: true,
                message: 'LLM settings updated successfully',
                settings: result.settings
            });
        } else {
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
router.post('/settings/reset', (req, res) => {
    try {
        const result = botService.llmSettingsManager.resetToDefaults();

        res.json({
            success: true,
            message: 'LLM settings reset to defaults',
            settings: result.settings
        });
    } catch (error) {
        console.error('Error resetting LLM settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset LLM settings'
        });
    }
});

// Get default LLM settings
router.get('/settings/defaults', (req, res) => {
    try {
        const defaults = botService.llmSettingsManager.getDefaultSettings();
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

module.exports = router;