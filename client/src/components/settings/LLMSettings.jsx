import { useState, useEffect, useRef } from 'react'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import ErrorMessage from '../ui/ErrorMessage'
import LoadingSpinner from '../ui/LoadingSpinner'

function LLMSettings({ onClose }) {
  const scrollRef = useRef(null)
  const [settings, setSettings] = useState({
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
        setSettings(data)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type } = e.target
    setSettings({
      ...settings,
      [name]: type === 'number' ? parseFloat(value) : value
    })
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
      const response = await fetch('http://localhost:5000/api/settings/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setSaveSuccess(true)
        scrollToTop() // Scroll to top to show success message
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaults = () => {
    setSettings({
      system_prompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      top_p: 1.0,
      top_k: -1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      repetition_penalty: 1.0,
      min_p: 0.0
    })
    scrollToTop() // Scroll to top after reset
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={scrollRef} className="bg-[#2F3136] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="border-t border-[#40444B] pt-4">
            <h3 className="text-[#FFFFFF] font-medium mb-3">Sampling Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormField
                  label="Temperature"
                  name="temperature"
                  type="number"
                  step="0.01"
                  min="0"
                  max="2"
                  value={settings.temperature}
                  onChange={handleInputChange}
                  placeholder="0.7"
                />
                <p className="text-[#72767D] text-xs mt-1">
                  Controls randomness. Lower = more deterministic, higher = more random
                </p>
              </div>

              <div>
                <FormField
                  label="Top P"
                  name="top_p"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1"
                  value={settings.top_p}
                  onChange={handleInputChange}
                  placeholder="1.0"
                />
                <p className="text-[#72767D] text-xs mt-1">
                  Cumulative probability of top tokens. Must be in (0, 1]
                </p>
              </div>

              <div>
                <FormField
                  label="Top K"
                  name="top_k"
                  type="number"
                  min="-1"
                  value={settings.top_k}
                  onChange={handleInputChange}
                  placeholder="-1"
                />
                <p className="text-[#72767D] text-xs mt-1">
                  Limits top tokens to consider. Set to -1 for all tokens
                </p>
              </div>

              <div>
                <FormField
                  label="Min P"
                  name="min_p"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.min_p}
                  onChange={handleInputChange}
                  placeholder="0.0"
                />
                <p className="text-[#72767D] text-xs mt-1">
                  Minimum probability relative to most likely token
                </p>
              </div>
            </div>
          </div>

          {/* Penalty Parameters */}
          <div className="border-t border-[#40444B] pt-4">
            <h3 className="text-[#FFFFFF] font-medium mb-3">Penalty Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormField
                  label="Frequency Penalty"
                  name="frequency_penalty"
                  type="number"
                  step="0.01"
                  min="-2"
                  max="2"
                  value={settings.frequency_penalty}
                  onChange={handleInputChange}
                  placeholder="0.0"
                />
                <p className="text-[#72767D] text-xs mt-1">
                  Penalizes based on frequency. Positive = new tokens, negative = repetition
                </p>
              </div>

              <div>
                <FormField
                  label="Presence Penalty"
                  name="presence_penalty"
                  type="number"
                  step="0.01"
                  min="-2"
                  max="2"
                  value={settings.presence_penalty}
                  onChange={handleInputChange}
                  placeholder="0.0"
                />
                <p className="text-[#72767D] text-xs mt-1">
                  Penalizes based on presence. Positive = new tokens, negative = repetition
                </p>
              </div>

              <div className="md:col-span-2">
                <FormField
                  label="Repetition Penalty"
                  name="repetition_penalty"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="2"
                  value={settings.repetition_penalty}
                  onChange={handleInputChange}
                  placeholder="1.0"
                />
                <p className="text-[#72767D] text-xs mt-1">
                  Penalizes repetition. Values &gt; 1 = new tokens, &lt; 1 = repetition
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
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