import React from 'react';
import { useLLMSettings } from '../../hooks/useLLMSettings';
import LLMSettingsForm from '../ui/LLMSettingsForm';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';

interface AIConfigTabProps {
    onCancel: () => void;
}

const AIConfigTab: React.FC<AIConfigTabProps> = ({ onCancel }) => {
    const {
        settings,
        loading,
        error,
        hasUnsavedChanges,
        updateSettings,
        saveSettings,
        cancelChanges,
        resetToDefaults
    } = useLLMSettings();

    const handleSave = async () => {
        const result = await saveSettings();
        if (result.success) {
            onCancel(); // Close the tab and go back to list
        }
    };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            cancelChanges();
        }
        onCancel();
    };

    const handleReset = async () => {
        if (window.confirm('Reset all LLM settings to defaults? This cannot be undone.')) {
            await resetToDefaults();
        }
    };

    return (
        <div className="ai-config-tab">
            <div className="ai-config-header">
                <div className="form-section-title">⚙️ Global AI Configuration</div>
                <p className="ai-config-description">
                    Configure how all AI bots will behave and respond in conversations. These are global settings that apply to all bots unless overridden.
                </p>
            </div>

            {error && (
                <ErrorBanner error={error} onDismiss={() => { }} />
            )}

            <LLMSettingsForm
                settings={settings}
                onSettingsChange={updateSettings}
                disabled={loading}
            />

            <div className="ai-config-extra-actions">
                <Button
                    variant="secondary"
                    size="small"
                    onClick={handleReset}
                    disabled={loading}
                >
                    Reset All to Defaults
                </Button>
            </div>

            <div className="ai-config-actions">
                <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSave}
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