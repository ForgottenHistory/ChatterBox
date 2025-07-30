class ParameterManager {
  constructor() {
    console.log('ParameterManager initialized');
  }

  // Merge global LLM settings with bot-specific overrides
  mergeParameters(globalSettings, botSettings) {
    const merged = {};

    // Apply global settings first
    this.applyGlobalParameters(merged, globalSettings);
    
    // Override with bot-specific settings
    this.applyBotParameters(merged, botSettings);

    return merged;
  }

  // Apply global settings to merged object
  applyGlobalParameters(merged, globalSettings) {
    if (!globalSettings) return;

    const parameterMappings = [
      { from: 'temperature', to: 'temperature' },
      { from: 'topP', to: 'top_p' },
      { from: 'topK', to: 'top_k', condition: (val) => val !== -1 },
      { from: 'frequencyPenalty', to: 'frequency_penalty', condition: (val) => val !== 0 },
      { from: 'presencePenalty', to: 'presence_penalty', condition: (val) => val !== 0 },
      { from: 'repetitionPenalty', to: 'repetition_penalty', condition: (val) => val !== 1.0 },
      { from: 'minP', to: 'min_p', condition: (val) => val !== 0 }
    ];

    parameterMappings.forEach(({ from, to, condition }) => {
      const value = globalSettings[from];
      if (value !== undefined && (!condition || condition(value))) {
        merged[to] = value;
      }
    });
  }

  // Apply bot-specific settings to merged object
  applyBotParameters(merged, botSettings) {
    if (!botSettings) return;

    const parameterMappings = [
      { from: 'temperature', to: 'temperature' },
      { from: 'topP', to: 'top_p' },
      { from: 'topK', to: 'top_k', condition: (val) => val !== -1 },
      { from: 'frequencyPenalty', to: 'frequency_penalty', condition: (val) => val !== 0 },
      { from: 'presencePenalty', to: 'presence_penalty', condition: (val) => val !== 0 },
      { from: 'repetitionPenalty', to: 'repetition_penalty', condition: (val) => val !== 1.0 },
      { from: 'minP', to: 'min_p', condition: (val) => val !== 0 }
    ];

    parameterMappings.forEach(({ from, to, condition }) => {
      const value = botSettings[from];
      if (value !== undefined && (!condition || condition(value))) {
        merged[to] = value;
      }
    });
  }

  // Get default API parameters
  getDefaultApiParams() {
    return {
      temperature: 0.6,
      top_p: 1.0,
      max_tokens: 512
    };
  }

  // Prepare final API parameters
  prepareApiParams(globalSettings, botSettings, maxTokens = 512) {
    const merged = this.mergeParameters(globalSettings, botSettings);
    
    // Always include max_tokens
    merged.max_tokens = maxTokens;
    
    return merged;
  }

  // Validate parameter values
  validateParameters(parameters) {
    const errors = [];

    if (parameters.temperature !== undefined) {
      if (parameters.temperature < 0 || parameters.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
    }

    if (parameters.top_p !== undefined) {
      if (parameters.top_p <= 0 || parameters.top_p > 1) {
        errors.push('Top P must be between 0.01 and 1');
      }
    }

    if (parameters.top_k !== undefined && parameters.top_k !== -1) {
      if (parameters.top_k < 1) {
        errors.push('Top K must be -1 or a positive integer');
      }
    }

    if (parameters.frequency_penalty !== undefined) {
      if (parameters.frequency_penalty < -2 || parameters.frequency_penalty > 2) {
        errors.push('Frequency penalty must be between -2 and 2');
      }
    }

    if (parameters.presence_penalty !== undefined) {
      if (parameters.presence_penalty < -2 || parameters.presence_penalty > 2) {
        errors.push('Presence penalty must be between -2 and 2');
      }
    }

    if (parameters.repetition_penalty !== undefined) {
      if (parameters.repetition_penalty < 0.1 || parameters.repetition_penalty > 2) {
        errors.push('Repetition penalty must be between 0.1 and 2');
      }
    }

    if (parameters.min_p !== undefined) {
      if (parameters.min_p < 0 || parameters.min_p > 1) {
        errors.push('Min P must be between 0 and 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get parameters summary for logging (excludes max_tokens for cleaner logs)
  getParametersSummary(parameters) {
    const summary = {};
    
    Object.keys(parameters).forEach(key => {
      if (key !== 'max_tokens') {
        summary[key] = parameters[key];
      }
    });
    
    return summary;
  }

  // Check if parameters are using defaults
  isUsingDefaults(parameters) {
    const defaults = this.getDefaultApiParams();
    
    return Object.keys(defaults).every(key => {
      return parameters[key] === defaults[key] || parameters[key] === undefined;
    });
  }
}

module.exports = ParameterManager;