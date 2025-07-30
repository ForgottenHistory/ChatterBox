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
    const [llmSettings, setLlmSettings] = useState<LLMSettings>(() => ({ ...DEFAULT_LLM_SETTINGS }));
    const [originalLlmSettings, setOriginalLlmSettings] = useState<LLMSettings>(() => ({ ...DEFAULT_LLM_SETTINGS }));

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

        // Update LLM settings with system prompt
        const newLlmSettings = {
            ...DEFAULT_LLM_SETTINGS,
            systemPrompt: system_prompt || description
        };
        setLlmSettings(newLlmSettings);
    };

    const resetAllForms = () => {
        resetForm();
        setLlmSettings({ ...DEFAULT_LLM_SETTINGS });
    };

    const getCreateBotData = () => ({
        ...form,
        llmSettings
    });

    const hasUnsavedLlmChanges = () => {
        return JSON.stringify(llmSettings) !== JSON.stringify(originalLlmSettings);
    };

    const saveLlmSettings = () => {
        setOriginalLlmSettings({ ...llmSettings });
    };

    const cancelLlmChanges = () => {
        setLlmSettings({ ...originalLlmSettings });
    };

    return {
        // Form state
        form,
        updateField,
        updateForm,
        resetForm: resetAllForms,

        // LLM settings
        llmSettings,
        setLlmSettings,
        hasUnsavedLlmChanges: hasUnsavedLlmChanges(),
        saveLlmSettings,
        cancelLlmChanges,

        // Utils
        importCharacterData,
        getCreateBotData,
        avatarColors: AVATAR_COLORS
    };
};