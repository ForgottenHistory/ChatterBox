import express from 'express'
import { getLLMSettings, updateLLMSettings, getFormattedLLMSettings } from '../services/llmSettingsService.js'

const router = express.Router()

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

export default router