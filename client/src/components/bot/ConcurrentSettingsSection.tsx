import React, { useState } from 'react';
import { useConcurrentSettings } from '../../hooks/useConcurrentSettings';
import Button from '../ui/Button';
import { FormRow } from '../ui/Form';

interface ConcurrentSettingsSectionProps {
    disabled?: boolean;
}

const ConcurrentSettingsSection: React.FC<ConcurrentSettingsSectionProps> = ({
    disabled = false
}) => {
    const {
        queueStatus,
        loading,
        error,
        updateConcurrentLimit,
        clearQueue,
        refreshStatus
    } = useConcurrentSettings();

    const [tempLimit, setTempLimit] = useState<number>(queueStatus?.maxConcurrent || 4);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Update temp limit when queue status changes
    React.useEffect(() => {
        if (queueStatus && tempLimit !== queueStatus.maxConcurrent) {
            setTempLimit(queueStatus.maxConcurrent);
            setHasUnsavedChanges(false);
        }
    }, [queueStatus]);

    const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLimit = parseInt(e.target.value) || 1;
        const clampedLimit = Math.max(1, Math.min(20, newLimit));

        setTempLimit(clampedLimit);
        setHasUnsavedChanges(clampedLimit !== (queueStatus?.maxConcurrent || 4));
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLimit = parseInt(e.target.value);
        setTempLimit(newLimit);
        setHasUnsavedChanges(newLimit !== (queueStatus?.maxConcurrent || 4));
    };

    const handleSave = async () => {
        const success = await updateConcurrentLimit(tempLimit);
        if (success) {
            setHasUnsavedChanges(false);
        }
    };

    // Auto-save when limit changes (with debounce)
    React.useEffect(() => {
        if (!hasUnsavedChanges) return;

        const timeoutId = setTimeout(async () => {
            console.log('Auto-saving concurrent limit:', tempLimit);
            await updateConcurrentLimit(tempLimit);
        }, 1000); // 1 second debounce

        return () => clearTimeout(timeoutId);
    }, [tempLimit, hasUnsavedChanges, updateConcurrentLimit]);

    const handleReset = () => {
        if (queueStatus) {
            setTempLimit(queueStatus.maxConcurrent);
            setHasUnsavedChanges(false);
        }
    };

    const handleClearQueue = async () => {
        if (window.confirm('Clear all queued requests? This will cancel pending bot responses.')) {
            await clearQueue();
        }
    };

    const getStatusColor = () => {
        if (!queueStatus) return 'var(--text-muted)';
        if (queueStatus.activeRequests >= queueStatus.maxConcurrent) return 'var(--warning-yellow)';
        if (queueStatus.queuedRequests > 0) return 'var(--brand-blue)';
        return 'var(--success-green)';
    };

    const getStatusText = () => {
        if (!queueStatus) return 'Loading...';
        if (queueStatus.activeRequests >= queueStatus.maxConcurrent && queueStatus.queuedRequests > 0) {
            return 'At capacity, requests queued';
        }
        if (queueStatus.activeRequests > 0) return 'Processing requests';
        return 'Ready';
    };

    return (
        <div className="form-section">
            <div className="form-section-title">🚦 Request Queue</div>
            <p className="ai-config-description">
                Control how many AI requests can run simultaneously. Lower numbers prevent rate limiting,
                higher numbers allow faster responses but may hit API limits.
            </p>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => refreshStatus()}>Retry</button>
                </div>
            )}

            <FormRow>
                <div className="llm-setting-row">
                    <label className="form-label">Max Concurrent Requests</label>
                    <div className="llm-setting-controls">
                        <input
                            type="range"
                            min={1}
                            max={20}
                            step={1}
                            value={tempLimit}
                            onChange={handleSliderChange}
                            className="llm-slider"
                            disabled={disabled || loading}
                        />
                        <input
                            type="number"
                            min={1}
                            max={20}
                            step={1}
                            value={tempLimit}
                            onChange={handleLimitChange}
                            className="llm-number-input"
                            disabled={disabled || loading}
                        />
                    </div>
                    <small className="form-help">
                        Recommended: 1-4 for most models. Some models only allow 1 connection.
                    </small>
                </div>
            </FormRow>

            {queueStatus && (
                <FormRow>
                    <div className="queue-status-display">
                        <label className="form-label">Current Status</label>
                        <div className="queue-status-info">
                            <div className="status-indicator" style={{ color: getStatusColor() }}>
                                ● {getStatusText()}
                            </div>
                            <div className="queue-metrics">
                                <span>Active: {queueStatus.activeRequests}/{queueStatus.maxConcurrent}</span>
                                <span>Queued: {queueStatus.queuedRequests}</span>
                            </div>
                        </div>
                    </div>
                </FormRow>
            )}

            <div className="concurrent-settings-actions">
                <div className="primary-actions">
                    <Button
                        variant="secondary"
                        onClick={handleReset}
                        disabled={!hasUnsavedChanges || loading}
                        size="small"
                    >
                        Reset
                    </Button>
                    <span className="auto-save-indicator">
                        {hasUnsavedChanges ? (
                            <span style={{ color: 'var(--warning-yellow)' }}>
                                ⏳ Auto-saving...
                            </span>
                        ) : (
                            <span style={{ color: 'var(--success-green)' }}>
                                ✓ Saved
                            </span>
                        )}
                    </span>
                </div>

                <div className="utility-actions">
                    <Button
                        variant="secondary"
                        onClick={() => refreshStatus()}
                        disabled={loading}
                        size="small"
                    >
                        🔄 Refresh
                    </Button>

                    {queueStatus && queueStatus.queuedRequests > 0 && (
                        <Button
                            variant="danger"
                            onClick={handleClearQueue}
                            disabled={loading}
                            size="small"
                        >
                            Clear Queue ({queueStatus.queuedRequests})
                        </Button>
                    )}
                </div>
            </div>

            {hasUnsavedChanges && (
                <p className="unsaved-changes-notice">
                    You have unsaved changes to the concurrent request limit.
                </p>
            )}
        </div>
    );
};

export default ConcurrentSettingsSection;