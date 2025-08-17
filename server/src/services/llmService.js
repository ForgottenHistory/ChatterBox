import { getFormattedLLMSettings } from './llmSettingsService.js'
import { getFormattedTemplateSettings } from './templateSettingsService.js'
import { promptLogger } from './promptLogger.js'
import { requestQueue } from './requestQueue.js'

class LLMService {
  constructor() {
    this.directCallTimeouts = new Map() // For direct calls (bypass queue)
  }

  // Queued request (default, recommended)
  async generateResponseQueued(templateVariables, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const requestData = {
        ...templateVariables,
        onSuccess: (result, requestId) => {
          console.log(`✅ Queued request ${requestId} completed`)
          resolve(result)
        },
        onError: (error, requestId) => {
          console.error(`❌ Queued request ${requestId} failed:`, error.message)
          reject(error)
        },
        priority
      }

      const requestId = requestQueue.enqueue(requestData, priority)
      console.log(`📤 Queued LLM request ${requestId} for bot: ${templateVariables.character_name}`)
    })
  }

  // Direct request (bypass queue, for urgent/testing)
  async generateResponseDirect(templateVariables, timeoutMs = 30000) {
    const requestId = `direct_${Date.now()}`
    
    // Set timeout
    const timeoutPromise = new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)
      this.directCallTimeouts.set(requestId, timeout)
    })

    // Make request
    const requestPromise = this.generateResponse(templateVariables)
      .finally(() => {
        // Clear timeout
        const timeout = this.directCallTimeouts.get(requestId)
        if (timeout) {
          clearTimeout(timeout)
          this.directCallTimeouts.delete(requestId)
        }
      })

    return Promise.race([requestPromise, timeoutPromise])
  }

  // Core generation logic (used by queue)
  async generateResponse(templateVariables) {
    try {
      // Get current settings
      const llmSettings = await getFormattedLLMSettings()
      const templateSettings = await getFormattedTemplateSettings()

      // Validate required settings
      if (!llmSettings.api_key) {
        throw new Error('API key not configured')
      }
      if (!llmSettings.model?.id) {
        throw new Error('Model not selected')
      }

      // Format the prompt using template variables
      const prompt = this.formatPrompt(templateSettings.prompt_template, templateVariables)

      // Log the prompt for debugging
      promptLogger.logPrompt(prompt, {
        provider: llmSettings.provider,
        model: llmSettings.model.id,
        botName: templateVariables.character_name,
        temperature: llmSettings.temperature,
        topP: llmSettings.top_p,
        topK: llmSettings.top_k,
        maxTokens: Math.min(llmSettings.model.max_completion_tokens || 4096, 2048),
        templateVariables: templateVariables
      })

      console.log('🤖 Generating LLM response:', {
        model: llmSettings.model.id,
        promptLength: prompt.length,
        variables: Object.keys(templateVariables)
      })

      // Make API call to Featherless
      const response = await this.callFeatherlessAPI(prompt, llmSettings)
      
      // Log the response
      promptLogger.logResponse(response, {
        model: llmSettings.model.id,
        botName: templateVariables.character_name,
        responseLength: response.length
      })
      
      console.log('✅ LLM response generated successfully')
      return response

    } catch (error) {
      console.error('❌ LLM generation failed:', error)
      throw error
    }
  }

  formatPrompt(template, variables) {
    let prompt = template

    // Replace all template variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`
      prompt = prompt.replaceAll(placeholder, value || '')
    }

    // Clean up any remaining empty lines or extra whitespace
    prompt = prompt
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')

    return prompt
  }

  async callFeatherlessAPI(prompt, settings) {
    const requestBody = {
      model: settings.model.id,
      prompt: prompt,
      temperature: settings.temperature,
      top_p: settings.top_p,
      top_k: settings.top_k,
      min_p: settings.min_p,
      frequency_penalty: settings.frequency_penalty,
      presence_penalty: settings.presence_penalty,
      repetition_penalty: settings.repetition_penalty,
      max_tokens: Math.min(settings.model.max_completion_tokens || 4096, 2048),
      stop: ['\n\n', 'User:', 'Human:'],
    }

    console.log('📡 Featherless API request:', {
      model: requestBody.model,
      promptLength: prompt.length,
      parameters: {
        temperature: requestBody.temperature,
        top_p: requestBody.top_p,
        max_tokens: requestBody.max_tokens
      }
    })

    const response = await fetch('https://api.featherless.ai/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'ChatterBox'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Featherless API error: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response choices returned from API')
    }

    // Extract the generated text
    let generatedText = data.choices[0].text.trim()

    // Clean up the response
    generatedText = this.cleanResponse(generatedText)

    console.log('🎯 Generated text:', {
      length: generatedText.length,
      preview: generatedText.substring(0, 100) + '...',
      usage: data.usage
    })

    return generatedText
  }

  cleanResponse(text) {
    // Remove common artifacts and clean up the response
    return text
      .trim()
      .replace(/^(Assistant|Bot|AI):?\s*/i, '') // Remove bot name prefixes
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  // Get queue status (for admin/monitoring)
  getQueueStatus() {
    return requestQueue.getStatus()
  }

  // Get detailed queue info
  getDetailedQueueStatus() {
    return requestQueue.getDetailedStatus()
  }

  // Clear queue (admin function)
  clearQueue() {
    requestQueue.clear()
  }
}

export const llmService = new LLMService()