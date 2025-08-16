import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'

function ModelSelector({ selectedModel, onModelSelect }) {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const modelsPerPage = 10

  useEffect(() => {
    if (isExpanded) {
      fetchModels()
    }
  }, [currentPage, isExpanded])

  // Debounced search effect
  useEffect(() => {
    if (!isExpanded) return

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      if (searchQuery.trim()) {
        setCurrentPage(1) // Reset to first page on search
        fetchModels()
      } else if (searchQuery === '') {
        // Clear search - reload all models
        setCurrentPage(1)
        fetchModels()
      }
    }, 500) // 500ms debounce

    setSearchTimeout(timeout)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [searchQuery, isExpanded])

  const fetchModels = async () => {
    setLoading(true)
    setError('')

    try {
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : ''
      const response = await fetch(`http://localhost:5000/api/settings/models?page=${currentPage}&limit=${modelsPerPage}${searchParam}`)
      
      if (response.ok) {
        const data = await response.json()
        setModels(data.models)
        setTotalPages(Math.ceil(data.total / modelsPerPage))
      } else {
        setError('Failed to fetch models')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleModelSelect = (model) => {
    onModelSelect(model)
    setIsExpanded(false) // Collapse after selection
    setSearchQuery('') // Clear search
  }

  const handleExpandFromSelected = () => {
    if (selectedModel) {
      // Pre-populate search with selected model name
      setSearchQuery(selectedModel.id)
    }
    setIsExpanded(true)
    setCurrentPage(1)
  }

  const handleCollapse = () => {
    setIsExpanded(false)
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  const formatContextLength = (length) => {
    return length >= 1000 ? `${(length / 1000).toFixed(0)}k` : length.toString()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-[#FFFFFF] font-medium">Select Model</h3>
        {isExpanded && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchModels}>
              🔄 Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCollapse}>
              ✕ Close
            </Button>
          </div>
        )}
      </div>

      {/* Selected Model (Collapsed View) */}
      {selectedModel && !isExpanded && (
        <div 
          className="bg-[#40444B] p-3 rounded-lg cursor-pointer hover:bg-[#36393F] transition-colors border border-[#5865F2]"
          onClick={handleExpandFromSelected}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[#FFFFFF] font-medium">{selectedModel.id}</div>
              <div className="text-[#72767D] text-sm">
                Context: {formatContextLength(selectedModel.context_length)} | 
                Max tokens: {formatContextLength(selectedModel.max_completion_tokens)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[#57F287] text-sm">Selected</div>
              <div className="text-[#B9BBBE]">📝</div>
            </div>
          </div>
        </div>
      )}

      {/* No Model Selected */}
      {!selectedModel && !isExpanded && (
        <div 
          className="bg-[#2F3136] border border-dashed border-[#40444B] p-4 rounded-lg cursor-pointer hover:border-[#5865F2] transition-colors text-center"
          onClick={() => setIsExpanded(true)}
        >
          <div className="text-[#B9BBBE]">Click to select a model</div>
          <div className="text-[#72767D] text-sm mt-1">Choose from 700+ available models</div>
        </div>
      )}

      {/* Expanded Model Selector */}
      {isExpanded && (
        <div className="space-y-4 border border-[#40444B] rounded-lg p-4 bg-[#2F3136]">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search models... (e.g., llama, roleplay, 8B)"
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 pr-10 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2]"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#72767D] hover:text-[#FFFFFF] transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="text-[#B9BBBE] text-sm">
              {loading ? 'Searching...' : `Search results for "${searchQuery}"`}
            </div>
          )}

          <ErrorMessage message={error} />

          {loading && models.length === 0 ? (
            <LoadingSpinner text="Loading models..." />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedModel?.id === model.id
                      ? 'bg-[#5865F2] border-[#5865F2] text-white'
                      : 'bg-[#36393F] border-[#40444B] hover:bg-[#40444B] text-[#B9BBBE]'
                  }`}
                  onClick={() => handleModelSelect(model)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{model.id}</div>
                      <div className="text-sm opacity-75 mt-1">
                        <span className="inline-block mr-3">
                          📏 {formatContextLength(model.context_length)}
                        </span>
                        <span className="inline-block mr-3">
                          📝 {formatContextLength(model.max_completion_tokens)}
                        </span>
                        <span className="inline-block">
                          🏷️ {model.model_class}
                        </span>
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        By {model.owned_by} • Created {new Date(model.created * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    {model.is_gated && (
                      <div className="text-xs bg-[#FAA61A] text-black px-2 py-1 rounded ml-2">
                        Gated
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-[#40444B]">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                ← Previous
              </Button>
              
              <span className="text-[#B9BBBE] text-sm">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages || loading}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next →
              </Button>
            </div>
          )}

          {loading && models.length > 0 && (
            <div className="text-center py-2">
              <LoadingSpinner size="sm" text="Loading..." />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ModelSelector