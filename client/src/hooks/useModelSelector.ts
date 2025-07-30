import { useState, useCallback } from 'react';
import modelService, { AIModel, PaginatedModels } from '../services/modelService';

interface UseModelSelectorReturn {
  models: PaginatedModels | null;
  loading: boolean;
  error: string | null;
  selectedModel: AIModel | null;
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  
  // Actions
  fetchModels: (page?: number, search?: string) => Promise<void>;
  selectModel: (model: AIModel) => void;
  clearSelection: () => void;
  setSearchTerm: (term: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refreshModels: () => Promise<void>;
}

export const useModelSelector = (initialPageSize = 20): UseModelSelectorReturn => {
  const [models, setModels] = useState<PaginatedModels | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const fetchModels = useCallback(async (page?: number, search?: string) => {
    const targetPage = page ?? currentPage;
    const targetSearch = search ?? searchTerm;
    
    setLoading(true);
    setError(null);

    try {
      const result = await modelService.getModels(targetPage, pageSize, targetSearch);
      setModels(result);
      setCurrentPage(targetPage);
      
      if (search !== undefined) {
        setSearchTerm(search);
        // Reset to page 1 when searching
        if (search !== searchTerm) {
          setCurrentPage(1);
        }
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
      setModels(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, pageSize]);

  const refreshModels = useCallback(async () => {
    modelService.clearCache();
    await fetchModels();
  }, [fetchModels]);

  const selectModel = useCallback((model: AIModel) => {
    setSelectedModel(model);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedModel(null);
  }, []);

  const handleSetSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  return {
    models,
    loading,
    error,
    selectedModel,
    searchTerm,
    currentPage,
    pageSize,
    
    fetchModels,
    selectModel,
    clearSelection,
    setSearchTerm: handleSetSearchTerm,
    setPage,
    setPageSize: handleSetPageSize,
    refreshModels
  };
};