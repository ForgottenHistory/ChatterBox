import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiHook<T> extends ApiState<T> {
  execute: (pathParams?: string, body?: any) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' = 'GET'
): ApiHook<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (pathParams?: string, body?: any): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Build the full URL - if pathParams provided, append to endpoint
      const url = pathParams ? `${API_BASE}${endpoint}/${pathParams}` : `${API_BASE}${endpoint}`;
      
      const config: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      console.log(`${method} ${url}`, body ? { body } : '');

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `${method} request failed` }));
        throw new Error(errorData.error || `${method} request failed`);
      }

      const data = await response.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`API Error (${method} ${endpoint}):`, error);
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  }, [endpoint, method]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}