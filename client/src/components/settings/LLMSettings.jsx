import { useState, useEffect, useRef } from 'react'
import Button from '../ui/Button'
import ErrorMessage from '../ui/ErrorMessage'
import LoadingSpinner from '../ui/LoadingSpinner'
import ModelSelector from './ModelSelector'
import SamplingParameters from './SamplingParameters'
import PenaltyParameters from './PenaltyParameters'

function LLMSettings({ onClose }) {
  const scrollRef = useRef(null)
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings/llm')
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
    }))
  }

  const handleModelSelect = (model) => {
    setSettings(prev => ({ ...prev, model }))
  }

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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

      console.log('Saving settings:', settingsToSave)

      const response = await fetch('http://localhost:5000/api/settings/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsToSave)
      })

      if (response.ok) {
        setSaveSuccess(true)
        scrollToTop()
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save settings')
        console.error('Save error:', errorData)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Network error:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaults = () => {
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
    scrollToTop()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={scrollRef} className="bg-[#2F3136] rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#FFFFFF] text-xl font-bold">LLM Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {loading && (
          <div className="mb-4">
            <LoadingSpinner text="Saving settings..." />
          </div>
        )}

        <ErrorMessage message={error} className="mb-4" />
        
        {saveSuccess && (
          <div className="bg-[#57F287] text-black p-3 rounded-lg text-sm mb-4">
            Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
              Provider
            </label>
            <select
              name="provider"
              value={settings.provider}
              onChange={handleInputChange}
              className="w-full bg-[#40444B] text-[#FFFFFF] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2]"
            >
              <option value="featherless">Featherless</option>
              <option value="openai" disabled>OpenAI (Coming Soon)</option>
              <option value="anthropic" disabled>Anthropic (Coming Soon)</option>
              <option value="local" disabled>Local (Coming Soon)</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
              API Key
              <span className="text-[#72767D] ml-1">
                ({settings.provider === 'featherless' ? 'Featherless' : 'Provider'} API Key)
              </span>
            </label>
            <input
              type="password"
              name="api_key"
              value={settings.api_key}
              onChange={handleInputChange}
              placeholder={`Enter your ${settings.provider === 'featherless' ? 'Featherless' : 'provider'} API key`}
              className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2]"
            />
            {settings.provider === 'featherless' && (
              <p className="text-[#72767D] text-xs mt-1">
                Get your API key from{' '}
                <a 
                  href="https://featherless.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#5865F2] hover:underline"
                >
                  featherless.ai
                </a>
              </p>
            )}
            {settings.api_key && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-[#57F287] rounded-full"></div>
                <span className="text-[#57F287] text-xs">API key saved</span>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <ModelSelector
            selectedModel={settings.model}
            onModelSelect={handleModelSelect}
          />

          {/* System Prompt */}
          <div>
            <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
              System Prompt
            </label>
            <textarea
              name="system_prompt"
              value={settings.system_prompt}
              onChange={handleInputChange}
              placeholder="Default system prompt for all bots"
              className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2] min-h-[100px]"
            />
          </div>

          {/* Sampling Parameters */}
          <SamplingParameters settings={settings} onChange={handleInputChange} />

          {/* Penalty Parameters */}
          <PenaltyParameters settings={settings} onChange={handleInputChange} />

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={loading || !settings.model} 
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LLMSettings