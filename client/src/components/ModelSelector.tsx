import React, { useEffect, useState } from 'react';
import { useModelSelector } from '../hooks/useModelSelector';
import modelService, { AIModel } from '../services/modelService';
import Button from './ui/Button';
import Input from './ui/Input';
import LoadingState from './ui/LoadingState';

interface ModelSelectorProps {
  currentModel?: string;
  onModelSelect: (modelId: string) => void;
  onClose?: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onModelSelect,
  onClose
}) => {
  const {
    models,
    loading,
    error,
    selectedModel,
    searchTerm,
    currentPage,
    pageSize,
    fetchModels,
    selectModel,
    setSearchTerm,
    setPage,
    setPageSize,
    refreshModels
  } = useModelSelector();

  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchModels(1, searchInput);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchInput]);

  const handleModelSelect = (model: AIModel) => {
    selectModel(model);
    onModelSelect(model.id);
    onClose?.();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchModels(newPage);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    fetchModels(1);
  };

  const renderPagination = () => {
    if (!models || models.totalPages <= 1) return null;

    const { page, totalPages, hasPrev, hasNext } = models;
    const maxVisiblePages = 5;
    const startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    return (
      <div className="model-pagination">
        <div className="pagination-info">
          Showing {models.models.length} of {models.total} models
        </div>
        
        <div className="pagination-controls">
          <Button
            size="small"
            variant="secondary"
            onClick={() => handlePageChange(1)}
            disabled={!hasPrev}
          >
            First
          </Button>
          
          <Button
            size="small"
            variant="secondary"
            onClick={() => handlePageChange(page - 1)}
            disabled={!hasPrev}
          >
            Previous
          </Button>

          <div className="page-numbers">
            {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(pageNum => (
              <button
                key={pageNum}
                className={`page-number ${pageNum === page ? 'active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <Button
            size="small"
            variant="secondary"
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNext}
          >
            Next
          </Button>
          
          <Button
            size="small"
            variant="secondary"
            onClick={() => handlePageChange(totalPages)}
            disabled={!hasNext}
          >
            Last
          </Button>
        </div>
      </div>
    );
  };

  const renderModelCard = (model: AIModel) => {
    const isSelected = selectedModel?.id === model.id;
    const isCurrent = currentModel === model.id;
    const isGated = modelService.isGatedModel(model);
    
    return (
      <div
        key={model.id}
        className={`model-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''} ${isGated ? 'gated' : ''}`}
        onClick={() => handleModelSelect(model)}
      >
        <div className="model-header">
          <h4 className="model-name">{modelService.formatModelName(model.id)}</h4>
          <div className="model-badges">
            <span className="model-category">{modelService.getModelCategory(model.model_class)}</span>
            {isCurrent && <span className="current-badge">Current</span>}
            {isGated && <span className="gated-badge">🔒 Gated</span>}
          </div>
        </div>
        
        <div className="model-details">
          <div className="model-id">{model.id}</div>
          <div className="model-provider">by {modelService.getModelProvider(model.id)}</div>
          <div className="model-specs">
            <span>Context: {modelService.formatContextLength(model.context_length)}</span>
            <span>Max tokens: {modelService.formatContextLength(model.max_completion_tokens)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="model-selector">
      <div className="model-selector-header">
        <div className="search-controls">
          <Input
            type="text"
            placeholder="Search models by name or class..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="model-search"
          />
          
          <div className="page-size-selector">
            <label>Show:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="page-size-select"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <Button
            size="small"
            variant="secondary"
            onClick={refreshModels}
            disabled={loading}
          >
            🔄 Refresh
          </Button>
        </div>

        {models && (
          <div className="model-stats">
            <span>Total models: {models.total}</span>
            <span>Page {models.page} of {models.totalPages}</span>
          </div>
        )}
      </div>

      <div className="model-selector-content">
        {loading && <LoadingState message="Loading models..." />}
        
        {error && (
          <div className="model-error">
            <p>Error loading models: {error}</p>
            <Button onClick={() => fetchModels()}>Retry</Button>
          </div>
        )}

        {models && !loading && (
          <>
            {models.models.length === 0 ? (
              <div className="no-models">
                <p>No models found matching your search.</p>
                <Button onClick={() => setSearchInput('')}>Clear Search</Button>
              </div>
            ) : (
              <div className="models-grid">
                {models.models.map(renderModelCard)}
              </div>
            )}
            
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;