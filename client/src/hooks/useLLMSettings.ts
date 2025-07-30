import { useState, useEffect } from 'react';
import { LLMSettings, DEFAULT_LLM_SETTINGS } from '../types';

const API_BASE = 'http://localhost:5000/api';

interface LLMSettingsState {
    settings: LLMSettings;
    loading: boolean;
    error: string | null;
    hasUnsavedChanges: boolean;
}

export const useLLMSettings = () => {
    const [state, setState] = useState<LLMSettingsState>({
        settings: { ...DEFAULT_LLM_SETTINGS },
        loading: false,
        error: null,
        hasUnsavedChanges: false
    });

    const [originalSettings, setOriginalSettings] = useState<LLMSettings>({ ...DEFAULT_LLM_SETTINGS });

    // Load settings from server
    const loadSettings = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`${API_BASE}/llm/settings`);

            if (!response.ok) {
                throw new Error('Failed to load LLM settings');
            }

            const data = await response.json();

            if (data.success) {
                const settings = data.settings;
                setState(prev => ({
                    ...prev,
                    settings,
                    loading: false,
                    hasUnsavedChanges: false
                }));
                setOriginalSettings(settings);
            } else {
                throw new Error(data.error || 'Failed to load settings');
            }
        } catch (error) {
            console.error('Error loading LLM settings:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to load settings'
            }));
        }
    };

    // Save settings to server
    const saveSettings = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`${API_BASE}/llm/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: state.settings })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save settings');
            }

            const data = await response.json();

            if (data.success) {
                setState(prev => ({
                    ...prev,
                    loading: false,
                    hasUnsavedChanges: false,
                    settings: data.settings
                }));
                setOriginalSettings(data.settings);
                return { success: true };
            } else {
                throw new Error(data.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving LLM settings:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to save settings'
            }));
            return { success: false, error: error instanceof Error ? error.message : 'Failed to save settings' };
        }
    };

    // Reset to defaults
    const resetToDefaults = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`${API_BASE}/llm/settings/reset`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to reset settings');
            }

            const data = await response.json();

            if (data.success) {
                const settings = data.settings;
                setState(prev => ({
                    ...prev,
                    settings,
                    loading: false,
                    hasUnsavedChanges: false
                }));
                setOriginalSettings(settings);
                return { success: true };
            } else {
                throw new Error(data.error || 'Failed to reset settings');
            }
        } catch (error) {
            console.error('Error resetting LLM settings:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to reset settings'
            }));
            return { success: false, error: error instanceof Error ? error.message : 'Failed to reset settings' };
        }
    };

    // Update local settings (marks as unsaved)
    const updateSettings = (newSettings: LLMSettings) => {
        setState(prev => ({
            ...prev,
            settings: newSettings,
            hasUnsavedChanges: JSON.stringify(newSettings) !== JSON.stringify(originalSettings)
        }));
    };

    // Cancel changes (revert to original)
    const cancelChanges = () => {
        setState(prev => ({
            ...prev,
            settings: { ...originalSettings },
            hasUnsavedChanges: false,
            error: null
        }));
    };

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    return {
        settings: state.settings,
        loading: state.loading,
        error: state.error,
        hasUnsavedChanges: state.hasUnsavedChanges,
        updateSettings,
        saveSettings,
        cancelChanges,
        resetToDefaults,
        reload: loadSettings
    };
};