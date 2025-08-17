import { useState } from 'react'
import Button from '../ui/Button'

function TemplateVariables({ settings, onSettingsChange, onSave, loading }) {
  const [showHelp, setShowHelp] = useState(false)

  const availableVariables = [
    { 
      name: '{system_prompt}', 
      description: 'Default system prompt or bot-specific system prompt',
      example: 'You are a helpful AI assistant.'
    },
    { 
      name: '{character_name}', 
      description: 'Name of the bot/character',
      example: 'Assistant'
    },
    { 
      name: '{character_description}', 
      description: 'Bot\'s description/background',
      example: 'A friendly AI assistant who loves to help users.'
    },
    { 
      name: '{character_personality}', 
      description: 'Bot\'s personality traits',
      example: 'Enthusiastic, helpful, and curious.'
    },
    { 
      name: '{conversation_history}', 
      description: 'Recent chat messages for context',
      example: 'User: Hello!\nBot: Hi there! How can I help you today?'
    },
    { 
      name: '{user_name}', 
      description: 'Name of the current user',
      example: 'John'
    },
    { 
      name: '{user_message}', 
      description: 'The latest message from the user',
      example: 'What\'s the weather like?'
    },
    { 
      name: '{channel_name}', 
      description: 'Current channel name',
      example: 'general'
    },
    { 
      name: '{timestamp}', 
      description: 'Current timestamp',
      example: '2025-08-16 14:30:00'
    }
  ]

  const handleTemplateChange = (e) => {
    onSettingsChange({
      ...settings,
      prompt_template: e.target.value
    })
  }

  const insertVariable = (variable) => {
    const textarea = document.getElementById('prompt-template')
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = settings.prompt_template
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)
    
    const newValue = before + variable + after
    onSettingsChange({
      ...settings,
      prompt_template: newValue
    })

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const resetToDefault = () => {
    onSettingsChange({
      ...settings,
      prompt_template: `{system_prompt}

Character: {character_name}
Description: {character_description}
Personality: {character_personality}

Conversation History:
{conversation_history}

{user_name}: {user_message}
{character_name}:`
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-[#FFFFFF] text-lg font-medium">Prompt Template</h3>
          <p className="text-[#B9BBBE] text-sm mt-1">
            Customize how variables are arranged in the final prompt sent to the LLM
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowHelp(!showHelp)}
        >
          {showHelp ? '📖 Hide Help' : '❓ Show Help'}
        </Button>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-[#40444B] p-4 rounded-lg">
          <h4 className="text-[#FFFFFF] font-medium mb-3">Available Variables</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {availableVariables.map((variable) => (
              <div key={variable.name} className="space-y-1">
                <button
                  onClick={() => insertVariable(variable.name)}
                  className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-[#36393F] transition-colors"
                >
                  <code className="bg-[#2F3136] px-2 py-1 rounded text-[#5865F2] font-mono text-xs">
                    {variable.name}
                  </code>
                  <span className="text-[#B9BBBE] text-xs">Click to insert</span>
                </button>
                <p className="text-[#72767D] text-xs ml-2">{variable.description}</p>
                <p className="text-[#8E9297] text-xs ml-2 italic">Example: {variable.example}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[#2F3136] rounded text-xs">
            <p className="text-[#FEE75C] font-medium mb-1">💡 Tips:</p>
            <ul className="text-[#B9BBBE] space-y-1">
              <li>• Click any variable above to insert it at your cursor position</li>
              <li>• Variables will be replaced with actual values when sending to the LLM</li>
              <li>• Order matters - arrange variables in the way that works best for your model</li>
              <li>• Add your own text around variables for better context</li>
            </ul>
          </div>
        </div>
      )}

      {/* Template Editor */}
      <div>
        <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
          Prompt Template
        </label>
        <textarea
          id="prompt-template"
          value={settings.prompt_template}
          onChange={handleTemplateChange}
          placeholder="Enter your custom prompt template using variables..."
          className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2] font-mono text-sm"
          rows={15}
        />
        <p className="text-[#72767D] text-xs mt-1">
          Use variables like {`{system_prompt}`}, {`{character_name}`}, {`{conversation_history}`} to customize your template
        </p>
      </div>

      {/* Preview Section */}
      <div>
        <h4 className="text-[#B9BBBE] text-sm font-medium mb-2">Preview</h4>
        <div className="bg-[#2F3136] p-4 rounded-lg border border-[#40444B]">
          <pre className="text-[#B9BBBE] text-xs whitespace-pre-wrap font-mono">
            {settings.prompt_template
              .replace('{system_prompt}', 'You are a helpful AI assistant.')
              .replace('{character_name}', 'Assistant')
              .replace('{character_description}', 'A friendly AI assistant who loves to help users.')
              .replace('{character_personality}', 'Enthusiastic, helpful, and curious.')
              .replace('{conversation_history}', 'User: Hello!\nAssistant: Hi there! How can I help you today?')
              .replace('{user_name}', 'John')
              .replace('{user_message}', 'What\'s the weather like?')
              .replace('{channel_name}', 'general')
              .replace('{timestamp}', '2025-08-16 14:30:00')
            }
          </pre>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button 
          onClick={onSave}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Save Template'}
        </Button>
        <Button 
          variant="secondary" 
          onClick={resetToDefault}
        >
          Reset to Default
        </Button>
      </div>
    </div>
  )
}

export default TemplateVariables