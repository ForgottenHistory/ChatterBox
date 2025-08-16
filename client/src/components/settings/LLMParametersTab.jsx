import Button from '../ui/Button'
import ModelSelector from './ModelSelector'
import SamplingParameters from './SamplingParameters'
import PenaltyParameters from './PenaltyParameters'

function LLMParametersTab({ settingsHook, onClose }) {
  const { 
    settings, 
    setSettings, 
    saveLLMSettings, 
    resetLLMSettings, 
    loading,
    scrollToTop 
  } = settingsHook

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const success = await saveLLMSettings()
    if (success) {
      scrollToTop()
    }
  }

  const handleReset = () => {
    resetLLMSettings()
    scrollToTop()
  }

  return (
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
          Default System Prompt
        </label>
        <textarea
          name="system_prompt"
          value={settings.system_prompt}
          onChange={handleInputChange}
          placeholder="Default system prompt for all bots"
          className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2] min-h-[100px]"
        />
        <p className="text-[#72767D] text-xs mt-1">
          This is the fallback system prompt when bots don't have their own custom prompt
        </p>
      </div>

      {/* Sampling Parameters */}
      <SamplingParameters settings={settings} onChange={handleInputChange} />

      {/* Penalty Parameters */}
      <PenaltyParameters settings={settings} onChange={handleInputChange} />

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button 
          type="submit" 
          disabled={loading || !settings.model} 
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default LLMParametersTab