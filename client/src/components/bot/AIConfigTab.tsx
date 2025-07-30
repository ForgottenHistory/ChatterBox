import React, { useState } from 'react';
import { useLLMSettings } from '../../hooks/useLLMSettings';
import { useCurrentModel } from '../../hooks/useCurrentModel';
import LLMSettingsForm from '../ui/LLMSettingsForm';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import ModelSelectorModal from '../ModelSelectorModal';
import modelService from '../../services/modelService';

interface AIConfigTabProps {
    onCancel: () => void;
}

const AIConfigTab: React.FC<AIConfigTabProps> = ({ onCancel }) => {
    const [showModelSelector, setShowModelSelector] = useState(false);
    
    const {
        settings,
        loading: settingsLoading,
        error: settingsError,
        hasUnsavedChanges,
        updateSettings,
        saveSettings,
        cancelChanges,
        resetToDefaults
    } = useLLMSettings();

    const {
        currentModel,
        status,
        loading: modelLoading,
        error: modelError,
        setModel,
        resetModel,
        refreshModel
    } = useCurrentModel();

    const loading = settingsLoading || modelLoading;
    const error = settingsError || modelError;

    const handleSave = async () => {
        const settingsResult = await saveSettings();
        if (settingsResult.success) {
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

    const handleModelSelect = async (modelId: string) => {
        const success = await setModel(modelId);
        if (success) {
            await refreshModel();
        }
    };

    const handleResetModel = async () => {
        if (window.confirm('Reset model to default? This will affect all AI bots.')) {
            await resetModel();
        }
    };

    const getModelDisplayName = (modelId: string): string => {
        return modelService.formatModelName(modelId);
    };

    const renderModelSection = () => (
        <div className="form-section">
            <div className="form-section-title">🤖 AI Model</div>
            <p className="ai-config-description">
                Select which AI model to use for all bot responses. This affects all bots globally.
            </p>
            
            <div className="model-selection-section">
                <div className="current-model-display">
                    <div className="current-model-info">
                        <label className="form-label">Current Model:</label>
                        <div className="model-name-display">
                            {currentModel ? getModelDisplayName(currentModel) : 'Loading...'}
                        </div>
                        {currentModel && (
                            <div className="model-id-display">{currentModel}</div>
                        )}
                    </div>
                    
                    {status && (
                        <div className="model-status">
                            <span className="status-item">Provider: {status.provider}</span>
                            <span className="status-item">Max Tokens: {status.maxTokens}</span>
                        </div>
                    )}
                </div>

                <div className="model-actions">
                    <Button
                        variant="secondary"
                        onClick={() => setShowModelSelector(true)}
                        disabled={loading}
                    >
                        🔍 Browse Models
                    </Button>
                    
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={handleResetModel}
                        disabled={loading}
                    >
                        Reset to Default
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="ai-config-tab">
                <div className="ai-config-header">
                    <div className="form-section-title">⚙️ Global AI Configuration</div>
                    <p className="ai-config-description">
                        Configure the AI model and parameters that all bots will use by default.
                    </p>
                </div>

                {error && (
                    <ErrorBanner error={error} onDismiss={() => { }} />
                )}

                {renderModelSection()}

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
                        Reset All Settings to Defaults
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

            <ModelSelectorModal
                isOpen={showModelSelector}
                onClose={() => setShowModelSelector(false)}
                currentModel={currentModel || undefined}
                onModelSelect={handleModelSelect}
            />
        </>
    );
};

export default AIConfigTab;