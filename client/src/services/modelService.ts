export interface AIModel {
  id: string;
  context_length: number;
  max_completion_tokens: number;
  model_class: string;
  created?: number;
  is_gated?: boolean;
  owned_by?: string;
}

export interface ModelsResponse {
  data: AIModel[];
}

export interface PaginatedModels {
  models: AIModel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

class ModelService {
  private baseUrl = 'https://api.featherless.ai/v1';
  private cachedModels: AIModel[] | null = null;
  private lastFetch: number = 0;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  async fetchAllModels(forceRefresh = false): Promise<AIModel[]> {
    const now = Date.now();
    
    // Return cached models if they're still fresh
    if (!forceRefresh && this.cachedModels && (now - this.lastFetch) < this.cacheExpiry) {
      return this.cachedModels;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data: ModelsResponse = await response.json();
      
      // Sort models alphabetically by id (since there's no name field)
      this.cachedModels = data.data.sort((a, b) => {
        // Ensure both models have id property and it's a string
        const aId = a?.id || '';
        const bId = b?.id || '';
        return aId.localeCompare(bId);
      });
      
      this.lastFetch = now;
      
      console.log(`Fetched ${this.cachedModels.length} models from Featherless API`);
      return this.cachedModels;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  async getModels(page = 1, pageSize = 20, searchTerm = ''): Promise<PaginatedModels> {
    const allModels = await this.fetchAllModels();
    
    // Filter models based on search term
    let filteredModels = allModels;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredModels = allModels.filter(model => {
        const id = model.id || '';
        const modelClass = model.model_class || '';
        return id.toLowerCase().includes(search) ||
               modelClass.toLowerCase().includes(search);
      });
    }

    const total = filteredModels.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const models = filteredModels.slice(startIndex, endIndex);

    return {
      models,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  formatModelName(modelId: string): string {
    if (!modelId) return 'Unknown Model';
    
    // Extract the model name part after the last slash
    const parts = modelId.split('/');
    return parts[parts.length - 1];
  }

  getModelDisplayName(modelId: string): string {
    if (!modelId) return 'Unknown Model';
    
    // For display purposes, show the full ID but formatted nicely
    return modelId.replace(/[-_]/g, ' ');
  }

  formatContextLength(contextLength: number): string {
    if (!contextLength) return '0';
    
    if (contextLength >= 1000) {
      return `${(contextLength / 1000).toFixed(0)}K`;
    }
    return contextLength.toString();
  }

  getModelCategory(modelClass: string): string {
    if (!modelClass) return 'Other';
    
    const lowerClass = modelClass.toLowerCase();
    
    if (lowerClass.includes('llama')) return 'Llama';
    if (lowerClass.includes('mistral')) return 'Mistral';
    if (lowerClass.includes('gemma')) return 'Gemma';
    if (lowerClass.includes('qwen')) return 'Qwen';
    if (lowerClass.includes('phi')) return 'Phi';
    if (lowerClass.includes('gpt')) return 'GPT';
    if (lowerClass.includes('claude')) return 'Claude';
    if (lowerClass.includes('yi')) return 'Yi';
    if (lowerClass.includes('deepseek')) return 'DeepSeek';
    if (lowerClass.includes('solar')) return 'Solar';
    if (lowerClass.includes('openchat')) return 'OpenChat';
    if (lowerClass.includes('hermes')) return 'Hermes';
    if (lowerClass.includes('nous')) return 'Nous';
    
    return 'Other';
  }

  getModelProvider(modelId: string): string {
    if (!modelId) return 'Unknown';
    
    // Extract provider from model ID (first part before /)
    const parts = modelId.split('/');
    if (parts.length > 1) {
      return parts[0];
    }
    return 'Unknown';
  }

  isGatedModel(model: AIModel): boolean {
    return model.is_gated === true;
  }

  clearCache(): void {
    this.cachedModels = null;
    this.lastFetch = 0;
  }
}

export default new ModelService();