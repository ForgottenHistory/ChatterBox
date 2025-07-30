import React from 'react';
import { LLMSettings } from '../../types';
import LLMSettingsForm from '../ui/LLMSettingsForm';
import Button from '../ui/Button';

interface AIConfigTabProps {
  llmSettings: LLMSettings;
  onSettingsChange: (settings: LLMSettings) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  hasUnsavedChanges: boolean;
}

const AIConfigTab: React.FC<AIConfigTabProps> = ({
  llmSettings,
  onSettingsChange,
  onSave,
  onCancel,
  loading,
  hasUnsavedChanges
}) => {
  return (
    <div className="ai-config-tab">
      <div className="ai-config-header">
        <div className="form-section-title">⚙️ AI Configuration</div>
        <p className="ai-config-description">
          Configure how the AI will behave and respond in conversations. These settings affect all bots.
        </p>
      </div>

      <LLMSettingsForm
        settings={llmSettings}
        onSettingsChange={onSettingsChange}
        disabled={loading}
      />

      <div className="ai-config-actions">
        <Button 
          variant="secondary" 
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          variant="primary"
          onClick={onSave}
          disabled={loading || !hasUnsavedChanges}
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {hasUnsavedChanges && (
        <p className="unsaved-changes-notice">
          You have unsaved changes to your AI configuration.
        </p>
      )}
    </div>
  );
};

export default AIConfigTab;