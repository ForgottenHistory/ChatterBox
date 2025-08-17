import express from 'express'
import { getLLMSettings, updateLLMSettings, getFormattedLLMSettings } from '../services/llmSettingsService.js'
import { getTemplateSettings, updateTemplateSettings, getFormattedTemplateSettings } from '../services/templateSettingsService.js'
import { modelService } from '../services/modelService.js'
import { promptLogger } from '../services/promptLogger.js'

const router = express.Router()

// Get available models
router.get('/models', async (req, res) => {
  try {
    const { provider = 'featherless', page = 1, limit = 10, search = '' } = req.query
    
    console.log(`📡 Fetching models: provider=${provider}, page=${page}, limit=${limit}, search="${search}"`)
    
    const result = await modelService.getModels(
      provider, 
      parseInt(page), 
      parseInt(limit),
      search
    )
    
    console.log(`✅ Found ${result.models.length} models (${result.total} total)${search ? ` matching "${search}"` : ''}`)
    res.json(result)
  } catch (error) {
    console.error('❌ Error fetching models:', error)
    res.status(500).json({ 
      error: 'Failed to fetch models', 
      details: error.message 
    })
  }
})

// Get LLM settings
router.get('/llm', async (req, res) => {
  try {
    const settings = await getFormattedLLMSettings()
    res.json(settings)
  } catch (error) {
    console.error('Error fetching LLM settings:', error)
    res.status(500).json({ error: 'Failed to fetch LLM settings' })
  }
})

// Update LLM settings
router.post('/llm', async (req, res) => {
  try {
    const {
      provider,
      api_key,
      model,
      system_prompt,
      temperature,
      top_p,
      top_k,
      frequency_penalty,
      presence_penalty,
      repetition_penalty,
      min_p
    } = req.body

    // Validate numeric ranges
    if (temperature < 0 || temperature > 2) {
      return res.status(400).json({ error: 'Temperature must be between 0 and 2' })
    }
    if (top_p <= 0 || top_p > 1) {
      return res.status(400).json({ error: 'Top P must be between 0 and 1' })
    }
    if (min_p < 0 || min_p > 1) {
      return res.status(400).json({ error: 'Min P must be between 0 and 1' })
    }
    if (frequency_penalty < -2 || frequency_penalty > 2) {
      return res.status(400).json({ error: 'Frequency penalty must be between -2 and 2' })
    }
    if (presence_penalty < -2 || presence_penalty > 2) {
      return res.status(400).json({ error: 'Presence penalty must be between -2 and 2' })
    }
    if (repetition_penalty < 0.1 || repetition_penalty > 2) {
      return res.status(400).json({ error: 'Repetition penalty must be between 0.1 and 2' })
    }

    const updatedSettings = await updateLLMSettings({
      provider,
      api_key,
      model,
      system_prompt,
      temperature,
      top_p,
      top_k,
      frequency_penalty,
      presence_penalty,
      repetition_penalty,
      min_p
    })

    res.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.error('Error updating LLM settings:', error)
    res.status(500).json({ error: 'Failed to update LLM settings' })
  }
})

// Get template settings
router.get('/templates', async (req, res) => {
  try {
    const settings = await getFormattedTemplateSettings()
    res.json(settings)
  } catch (error) {
    console.error('Error fetching template settings:', error)
    res.status(500).json({ error: 'Failed to fetch template settings' })
  }
})

// Get latest prompt log (for debugging)
router.get('/latest-prompt', async (req, res) => {
  try {
    const latestPrompt = promptLogger.getLatestPrompt()
    if (latestPrompt) {
      res.set('Content-Type', 'text/plain')
      res.send(latestPrompt)
    } else {
      res.status(404).json({ error: 'No prompt log found' })
    }
  } catch (error) {
    console.error('Error fetching latest prompt:', error)
    res.status(500).json({ error: 'Failed to fetch latest prompt' })
  }
})

// Get queue status
router.get('/queue/status', async (req, res) => {
  try {
    const { llmService } = await import('../services/llmService.js')
    const status = llmService.getQueueStatus()
    res.json(status)
  } catch (error) {
    console.error('Error fetching queue status:', error)
    res.status(500).json({ error: 'Failed to fetch queue status' })
  }
})

// Get detailed queue information
router.get('/queue/detailed', async (req, res) => {
  try {
    const { llmService } = await import('../services/llmService.js')
    const detailed = llmService.getDetailedQueueStatus()
    res.json(detailed)
  } catch (error) {
    console.error('Error fetching detailed queue status:', error)
    res.status(500).json({ error: 'Failed to fetch detailed queue status' })
  }
})

// Clear queue (admin function)
router.post('/queue/clear', async (req, res) => {
  try {
    const { llmService } = await import('../services/llmService.js')
    llmService.clearQueue()
    res.json({ success: true, message: 'Queue cleared' })
  } catch (error) {
    console.error('Error clearing queue:', error)
    res.status(500).json({ error: 'Failed to clear queue' })
  }
})

// Update template settings
router.post('/templates', async (req, res) => {
  try {
    const { prompt_template } = req.body

    if (!prompt_template || prompt_template.trim() === '') {
      return res.status(400).json({ error: 'Prompt template cannot be empty' })
    }

    const updatedSettings = await updateTemplateSettings({
      prompt_template
    })

    res.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.error('Error updating template settings:', error)
    res.status(500).json({ error: 'Failed to update template settings' })
  }
})

export default router