import { useState } from 'react';

interface PromptData {
  botName: string;
  botId: string;
  systemPrompt: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  currentMessage?: string;
  llmSettings: any;
  botContext: {
    description: string;
    exampleMessages: string;
    hasCustomSettings: boolean;
  };
}

interface UsePromptInspectorReturn {
  promptData: PromptData[] | null;
  loading: boolean;
  error: string | null;
  selectedBotId: string | null;
  fetchPromptData: (message?: string) => Promise<void>;
  selectBot: (botId: string) => void;
  clearData: () => void;
}

const API_BASE = 'http://localhost:5000/api';

export const usePromptInspector = (): UsePromptInspectorReturn => {
  const [promptData, setPromptData] = useState<PromptData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  const fetchPromptData = async (message?: string) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = message ? `?message=${encodeURIComponent(message)}` : '';
      const response = await fetch(`${API_BASE}/prompts/all-bots${queryParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch prompt data');
      }

      const data = await response.json();

      if (data.success) {
        setPromptData(data.promptData);
        // Auto-select first bot if none selected
        if (data.promptData.length > 0 && !selectedBotId) {
          setSelectedBotId(data.promptData[0].botId);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch prompt data');
      }
    } catch (err) {
      console.error('Error fetching prompt data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPromptData(null);
    } finally {
      setLoading(false);
    }
  };

  const selectBot = (botId: string) => {
    setSelectedBotId(botId);
  };

  const clearData = () => {
    setPromptData(null);
    setSelectedBotId(null);
    setError(null);
  };

  return {
    promptData,
    loading,
    error,
    selectedBotId,
    fetchPromptData,
    selectBot,
    clearData
  };
};