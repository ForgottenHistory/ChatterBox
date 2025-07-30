import { useState } from 'react';
import { LLMSettings, DEFAULT_LLM_SETTINGS } from '../types';
import { CharacterCardV2 } from '../types/character';
import { useFormState } from './useFormState';

interface CreateBotForm {
    name: string;
    description: string;
    exampleMessages: string;
    avatar: string;
    avatarType: 'initials' | 'uploaded';
}

const AVATAR_COLORS = [
    '#7289DA', '#43B581', '#FAA61A', '#F04747', '#9C84EF',
    '#EB459E', '#00D9FF', '#FFA500', '#5865F2', '#57F287'
];

const INITIAL_FORM: CreateBotForm = {
    name: '',
    description: '',
    exampleMessages: '',
    avatar: '#7289DA',
    avatarType: 'initials'
};

export const useBotForm = () => {
    const { state: form, updateField, updateFields, reset: resetForm } = useFormState(INITIAL_FORM);
    const [botLlmSettings, setBotLlmSettings] = useState<LLMSettings>(() => ({ ...DEFAULT_LLM_SETTINGS }));

    const updateForm = (updates: Partial<CreateBotForm>) => updateFields(updates);

    const importCharacterData = (characterData: CharacterCardV2) => {
        const { name, description = '', mes_example = '', avatar, system_prompt = '' } = characterData.data;

        updateForm({
            name,
            description,
            exampleMessages: mes_example,
            avatar: avatar || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
            avatarType: avatar ? 'uploaded' : 'initials'
        });

        // Update bot-specific LLM settings with system prompt
        const newLlmSettings = {
            ...DEFAULT_LLM_SETTINGS,
            systemPrompt: system_prompt || description
        };
        setBotLlmSettings(newLlmSettings);
    };

    const resetAllForms = () => {
        resetForm();
        setBotLlmSettings({ ...DEFAULT_LLM_SETTINGS });
    };

    const getCreateBotData = () => ({
        ...form,
        llmSettings: botLlmSettings
    });

    // For bot creation, we manage bot-specific LLM settings
    const updateBotLlmSettings = (settings: LLMSettings) => {
        setBotLlmSettings(settings);
    };

    const resetBotLlmSettings = () => {
        setBotLlmSettings({ ...DEFAULT_LLM_SETTINGS });
    };

    return {
        // Form state
        form,
        updateField,
        updateForm,
        resetForm: resetAllForms,

        // Bot-specific LLM settings (for creation)
        botLlmSettings,
        updateBotLlmSettings,
        resetBotLlmSettings,

        // Utils
        importCharacterData,
        getCreateBotData,
        avatarColors: AVATAR_COLORS
    };
};