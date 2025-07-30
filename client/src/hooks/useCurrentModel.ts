import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

interface ModelDetails {
  contextLength: number;
  maxCompletionTokens: number;
  modelClass: string;
  isGated: boolean;
}

interface ModelStatus {
  configured: boolean;
  currentModel: string;
  defaultModel: string;
  maxTokens: number;
  provider: string;
  modelDetails?: ModelDetails;
}

interface UseCurrentModelReturn {
  currentModel: string | null;
  status: ModelStatus | null;
  loading: boolean;
  error: string | null;
  setModel: (modelId: string) => Promise<boolean>;
  resetModel: () => Promise<boolean>;
  refreshModel: () => Promise<void>;
}

export const useCurrentModel = (): UseCurrentModelReturn => {
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentModel = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/llm/model`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch current model');
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentModel(data.currentModel);
        setStatus(data.status);
      } else {
        throw new Error(data.error || 'Failed to fetch current model');
      }
    } catch (err) {
      console.error('Error fetching current model:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const setModel = async (modelId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/llm/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set model');
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentModel(data.currentModel);
        return true;
      } else {
        throw new Error(data.error || 'Failed to set model');
      }
    } catch (err) {
      console.error('Error setting model:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetModel = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/llm/model/reset`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to reset model');
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentModel(data.currentModel);
        return true;
      } else {
        throw new Error(data.error || 'Failed to reset model');
      }
    } catch (err) {
      console.error('Error resetting model:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshModel = async () => {
    await fetchCurrentModel();
  };

  // Load current model on mount
  useEffect(() => {
    fetchCurrentModel();
  }, []);

  return {
    currentModel,
    status,
    loading,
    error,
    setModel,
    resetModel,
    refreshModel
  };
};