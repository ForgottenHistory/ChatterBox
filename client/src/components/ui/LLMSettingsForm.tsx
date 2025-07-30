import React from 'react';
import { LLMSettings, DEFAULT_LLM_SETTINGS } from '../../types';
import { FormRow, FormTextarea } from './Form';

interface LLMSettingsFormProps {
  settings: LLMSettings;
  onSettingsChange: (settings: LLMSettings) => void;
  disabled?: boolean;
}

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  description?: string;
  placeholder?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  description,
  placeholder
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(Math.min(Math.max(newValue, min), max));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <FormRow>
      <div className="llm-setting-row">
        <label className="form-label">{label}</label>
        <div className="llm-setting-controls">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className="llm-slider"
            disabled={disabled}
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleInputChange}
            className="llm-number-input"
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
        {description && <small className="form-help">{description}</small>}
      </div>
    </FormRow>
  );
};

const LLMSettingsForm: React.FC<LLMSettingsFormProps> = ({
  settings,
  onSettingsChange,
  disabled = false
}) => {
  const updateSetting = <K extends keyof LLMSettings>(key: K, value: LLMSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const resetToDefaults = () => {
    onSettingsChange({ ...DEFAULT_LLM_SETTINGS, systemPrompt: settings.systemPrompt });
  };

  return (
    <div className="llm-settings-form">
      <div className="llm-settings-header">
        <h4>LLM Settings</h4>
        <button
          type="button"
          className="reset-settings-btn"
          onClick={resetToDefaults}
          disabled={disabled}
        >
          Reset to Defaults
        </button>
      </div>

      <FormTextarea
        label="System Prompt"
        value={settings.systemPrompt}
        onChange={(e) => updateSetting('systemPrompt', e.target.value)}
        placeholder="Enter the system prompt that defines the bot's behavior and personality..."
        rows={4}
        disabled={disabled}
        help="This prompt tells the AI how to behave and respond"
      />

      <SliderInput
        label="Temperature"
        value={settings.temperature}
        onChange={(value) => updateSetting('temperature', value)}
        min={0}
        max={2}
        step={0.1}
        disabled={disabled}
        description="Controls randomness. Lower = more deterministic, Higher = more creative"
        placeholder="0.6"
      />

      <SliderInput
        label="Top P"
        value={settings.topP}
        onChange={(value) => updateSetting('topP', value)}
        min={0.01}
        max={1}
        step={0.01}
        disabled={disabled}
        description="Cumulative probability of top tokens to consider. 1 = consider all tokens"
        placeholder="1.0"
      />

      <SliderInput
        label="Top K"
        value={settings.topK}
        onChange={(value) => updateSetting('topK', value)}
        min={-1}
        max={100}
        step={1}
        disabled={disabled}
        description="Limits number of top tokens. -1 = consider all tokens"
        placeholder="-1"
      />

      <SliderInput
        label="Frequency Penalty"
        value={settings.frequencyPenalty}
        onChange={(value) => updateSetting('frequencyPenalty', value)}
        min={-2}
        max={2}
        step={0.1}
        disabled={disabled}
        description="Penalizes tokens based on frequency. >0 = encourage new tokens"
        placeholder="0"
      />

      <SliderInput
        label="Presence Penalty"
        value={settings.presencePenalty}
        onChange={(value) => updateSetting('presencePenalty', value)}
        min={-2}
        max={2}
        step={0.1}
        disabled={disabled}
        description="Penalizes tokens based on presence. >0 = encourage new topics"
        placeholder="0"
      />

      <SliderInput
        label="Repetition Penalty"
        value={settings.repetitionPenalty}
        onChange={(value) => updateSetting('repetitionPenalty', value)}
        min={0.1}
        max={2}
        step={0.1}
        disabled={disabled}
        description="Penalizes repetition. >1 = reduce repetition, <1 = allow repetition"
        placeholder="1.0"
      />

      <SliderInput
        label="Min P"
        value={settings.minP}
        onChange={(value) => updateSetting('minP', value)}
        min={0}
        max={1}
        step={0.01}
        disabled={disabled}
        description="Minimum probability relative to most likely token. 0 = disabled"
        placeholder="0"
      />
    </div>
  );
};

export default LLMSettingsForm;