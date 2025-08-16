// Service for fetching models from different LLM providers
class ModelService {
  constructor() {
    this.providers = {
      featherless: {
        name: 'Featherless',
        baseUrl: 'https://api.featherless.ai/v1',
        modelsEndpoint: '/models'
      }
    }
  }

  async getModels(provider = 'featherless', page = 1, limit = 10, searchQuery = '') {
    try {
      const providerConfig = this.providers[provider]
      if (!providerConfig) {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      const response = await fetch(`${providerConfig.baseUrl}${providerConfig.modelsEndpoint}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Extract models array
      let models = data.data || data.models || data
      
      if (!Array.isArray(models)) {
        throw new Error('Invalid response format from provider')
      }

      // Basic validation and sorting
      models = models
        .filter(model => model.id && model.model_class) // Basic validation
        .sort((a, b) => (b.created || 0) - (a.created || 0)) // Sort by creation date (newest first)

      // Apply search filter if provided
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        models = models.filter(model => {
          return (
            model.id.toLowerCase().includes(query) ||
            model.model_class.toLowerCase().includes(query) ||
            model.owned_by.toLowerCase().includes(query)
          )
        })
      }

      // Pagination
      const total = models.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedModels = models.slice(startIndex, endIndex)

      return {
        models: paginatedModels,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        provider: providerConfig.name,
        searchQuery: searchQuery || null
      }
    } catch (error) {
      console.error(`Error fetching models from ${provider}:`, error)
      throw error
    }
  }

  async getModelById(modelId, provider = 'featherless') {
    try {
      const { models } = await this.getModels(provider, 1, 1000) // Get all models
      const model = models.find(m => m.id === modelId)
      
      if (!model) {
        throw new Error(`Model ${modelId} not found`)
      }
      
      return model
    } catch (error) {
      console.error(`Error fetching model ${modelId}:`, error)
      throw error
    }
  }

  getAvailableProviders() {
    return Object.keys(this.providers).map(key => ({
      id: key,
      name: this.providers[key].name,
      supported: true
    }))
  }
}

export const modelService = new ModelService()