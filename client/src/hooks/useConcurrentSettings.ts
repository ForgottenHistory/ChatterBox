import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

interface QueueStatus {
    maxConcurrent: number;
    activeRequests: number;
    queuedRequests: number;
    maxQueueSize: number;
    canAcceptRequests: boolean;
    configured: boolean;
    provider: string;
}

interface UseConcurrentSettingsReturn {
    queueStatus: QueueStatus | null;
    loading: boolean;
    error: string | null;
    updateConcurrentLimit: (limit: number) => Promise<boolean>;
    clearQueue: () => Promise<boolean>;
    refreshStatus: () => Promise<void>;
}

export const useConcurrentSettings = (): UseConcurrentSettingsReturn => {
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchQueueStatus = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/llm/queue/status`);

            if (!response.ok) {
                throw new Error('Failed to fetch queue status');
            }

            const data = await response.json();

            if (data.success) {
                setQueueStatus(data.queue);
            } else {
                throw new Error(data.error || 'Failed to fetch queue status');
            }
        } catch (err) {
            console.error('Error fetching queue status:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const updateConcurrentLimit = async (limit: number): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/llm/queue/concurrent-limit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update concurrent limit');
            }

            const data = await response.json();

            if (data.success) {
                setQueueStatus(data.queue);
                return true;
            } else {
                throw new Error(data.error || 'Failed to update concurrent limit');
            }
        } catch (err) {
            console.error('Error updating concurrent limit:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const clearQueue = async (): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/llm/queue/clear`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to clear queue');
            }

            const data = await response.json();

            if (data.success) {
                setQueueStatus(data.queue);
                return true;
            } else {
                throw new Error(data.error || 'Failed to clear queue');
            }
        } catch (err) {
            console.error('Error clearing queue:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const refreshStatus = async () => {
        await fetchQueueStatus();
    };

    // Load queue status on mount
    useEffect(() => {
        fetchQueueStatus();
    }, []);

    return {
        queueStatus,
        loading,
        error,
        updateConcurrentLimit,
        clearQueue,
        refreshStatus
    };
};