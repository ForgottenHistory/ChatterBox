import { useState, useEffect } from 'react'

export const useSettings = () => {
  const [settings, setSettings] = useState({
    provider: 'featherless',
    api_key: '',
    model: null,
    system_prompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
    top_p: 1.0,
    top_k: -1,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    repetition_penalty: 1.0,
    min_p: 0.0
  })

  const [templateSettings, setTemplateSettings] = useState({
    prompt_template: `{system_prompt}

Character: {character_name}
Description: {character_description}
Personality: {character_personality}

Conversation History:
{conversation_history}

{user_name}: {user_message}
{character_name}:`
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load LLM settings
      const response = await fetch('http://localhost:5000/api/settings/llm')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
      }
      
      // Load template settings
      const templateResponse = await fetch('http://localhost:5000/api/settings/templates')
      if (templateResponse.ok) {
        const templateData = await templateResponse.json()
        setTemplateSettings(prev => ({ ...prev, ...templateData }))
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
      setError('Failed to load settings')
    }
  }

  const saveLLMSettings = async () => {
    setLoading(true)
    setError('')
    setSaveSuccess(false)

    try {
      // Ensure all numeric values are properly formatted
      const settingsToSave = {
        ...settings,
        temperature: Number(settings.temperature) || 0.7,
        top_p: Number(settings.top_p) || 1.0,
        top_k: Number(settings.top_k) || -1,
        frequency_penalty: Number(settings.frequency_penalty) || 0.0,
        presence_penalty: Number(settings.presence_penalty) || 0.0,
        repetition_penalty: Number(settings.repetition_penalty) || 1.0,
        min_p: Number(settings.min_p) || 0.0
      }

      const response = await fetch('http://localhost:5000/api/settings/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsToSave)
      })

      if (response.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        
        // Trigger notification system to recheck API configuration
        window.dispatchEvent(new CustomEvent('settingsUpdated'))
        
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save settings')
        return false
      }
    } catch (err) {
      setError('Network error. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const saveTemplateSettings = async () => {
    setLoading(true)
    setError('')
    setSaveSuccess(false)

    try {
      const response = await fetch('http://localhost:5000/api/settings/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateSettings)
      })

      if (response.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save template settings')
        return false
      }
    } catch (err) {
      setError('Network error. Please try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const resetLLMSettings = () => {
    setSettings(prev => ({
      ...prev,
      api_key: '',
      model: null,
      system_prompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      top_p: 1.0,
      top_k: -1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      repetition_penalty: 1.0,
      min_p: 0.0
    }))
  }

  const clearMessages = () => {
    setError('')
    setSaveSuccess(false)
  }

  return {
    // State
    settings,
    templateSettings,
    loading,
    error,
    saveSuccess,
    
    // Actions
    setSettings,
    setTemplateSettings,
    saveLLMSettings,
    saveTemplateSettings,
    resetLLMSettings,
    clearMessages,
    loadSettings
  }
}