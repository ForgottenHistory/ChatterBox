class LLMSettingsManager {
    constructor() {
        // Default LLM settings
        this.defaultSettings = {
            systemPrompt: '',
            temperature: 0.6,
            topP: 1.0,
            topK: -1,
            frequencyPenalty: 0,
            presencePenalty: 0,
            repetitionPenalty: 1.0,
            minP: 0
        };

        // Current settings (start with defaults)
        this.currentSettings = { ...this.defaultSettings };

        console.log('LLMSettingsManager initialized with default settings');
    }

    // Get current LLM settings
    getSettings() {
        return { ...this.currentSettings };
    }

    // Update LLM settings with validation
    updateSettings(newSettings) {
        try {
            const validatedSettings = this.validateSettings(newSettings);
            this.currentSettings = { ...this.currentSettings, ...validatedSettings };

            console.log('LLM settings updated:', this.currentSettings);
            return { success: true, settings: this.getSettings() };
        } catch (error) {
            console.error('Failed to update LLM settings:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Validate settings before applying
    validateSettings(settings) {
        const validated = {};

        // System prompt - any string
        if (settings.systemPrompt !== undefined) {
            validated.systemPrompt = String(settings.systemPrompt);
        }

        // Temperature: 0.0 to 2.0
        if (settings.temperature !== undefined) {
            const temp = parseFloat(settings.temperature);
            if (isNaN(temp) || temp < 0 || temp > 2) {
                throw new Error('Temperature must be between 0.0 and 2.0');
            }
            validated.temperature = temp;
        }

        // Top P: 0.01 to 1.0
        if (settings.topP !== undefined) {
            const topP = parseFloat(settings.topP);
            if (isNaN(topP) || topP <= 0 || topP > 1) {
                throw new Error('Top P must be between 0.01 and 1.0');
            }
            validated.topP = topP;
        }

        // Top K: -1 or positive integer
        if (settings.topK !== undefined) {
            const topK = parseInt(settings.topK);
            if (isNaN(topK) || (topK !== -1 && topK < 1)) {
                throw new Error('Top K must be -1 or a positive integer');
            }
            validated.topK = topK;
        }

        // Frequency Penalty: -2.0 to 2.0
        if (settings.frequencyPenalty !== undefined) {
            const freq = parseFloat(settings.frequencyPenalty);
            if (isNaN(freq) || freq < -2 || freq > 2) {
                throw new Error('Frequency penalty must be between -2.0 and 2.0');
            }
            validated.frequencyPenalty = freq;
        }

        // Presence Penalty: -2.0 to 2.0
        if (settings.presencePenalty !== undefined) {
            const pres = parseFloat(settings.presencePenalty);
            if (isNaN(pres) || pres < -2 || pres > 2) {
                throw new Error('Presence penalty must be between -2.0 and 2.0');
            }
            validated.presencePenalty = pres;
        }

        // Repetition Penalty: 0.1 to 2.0
        if (settings.repetitionPenalty !== undefined) {
            const rep = parseFloat(settings.repetitionPenalty);
            if (isNaN(rep) || rep < 0.1 || rep > 2) {
                throw new Error('Repetition penalty must be between 0.1 and 2.0');
            }
            validated.repetitionPenalty = rep;
        }

        // Min P: 0.0 to 1.0
        if (settings.minP !== undefined) {
            const minP = parseFloat(settings.minP);
            if (isNaN(minP) || minP < 0 || minP > 1) {
                throw new Error('Min P must be between 0.0 and 1.0');
            }
            validated.minP = minP;
        }

        return validated;
    }

    // Reset to default settings
    resetToDefaults() {
        this.currentSettings = { ...this.defaultSettings };
        console.log('LLM settings reset to defaults');
        return { success: true, settings: this.getSettings() };
    }

    // Get default settings
    getDefaultSettings() {
        return { ...this.defaultSettings };
    }

    // Get settings formatted for LLM API
    getFormattedSettings() {
        const settings = this.getSettings();

        // Convert to format expected by LLM service
        const formatted = {
            temperature: settings.temperature,
            top_p: settings.topP,
            max_tokens: 512 // Keep existing default
        };

        // Only include non-default values to avoid API errors
        if (settings.topK !== -1) {
            formatted.top_k = settings.topK;
        }

        if (settings.frequencyPenalty !== 0) {
            formatted.frequency_penalty = settings.frequencyPenalty;
        }

        if (settings.presencePenalty !== 0) {
            formatted.presence_penalty = settings.presencePenalty;
        }

        if (settings.repetitionPenalty !== 1.0) {
            formatted.repetition_penalty = settings.repetitionPenalty;
        }

        if (settings.minP !== 0) {
            formatted.min_p = settings.minP;
        }

        return formatted;
    }
}

module.exports = LLMSettingsManager;