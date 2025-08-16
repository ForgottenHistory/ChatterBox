import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class PromptLogger {
  constructor() {
    // Create logs directory if it doesn't exist
    this.logsDir = path.join(__dirname, '../../logs')
    this.ensureLogsDirectory()
  }

  ensureLogsDirectory() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true })
        console.log('📁 Created logs directory')
      }
    } catch (error) {
      console.error('❌ Error creating logs directory:', error)
    }
  }

  logPrompt(prompt, metadata = {}) {
    try {
      const timestamp = new Date().toISOString()
      const logContent = this.formatLogContent(prompt, metadata, timestamp)
      
      // Write to latest_prompt.txt (overwrites previous)
      const latestPromptPath = path.join(this.logsDir, 'latest_prompt.txt')
      fs.writeFileSync(latestPromptPath, logContent, 'utf8')
      
      console.log('📝 Prompt logged to latest_prompt.txt')
      
      // Optionally also append to a timestamped log file for history
      if (metadata.saveHistory) {
        const timestampedPath = path.join(this.logsDir, `prompt_${timestamp.replace(/[:.]/g, '-')}.txt`)
        fs.writeFileSync(timestampedPath, logContent, 'utf8')
        console.log(`📜 Prompt also saved to ${path.basename(timestampedPath)}`)
      }
      
    } catch (error) {
      console.error('❌ Error logging prompt:', error)
    }
  }

  formatLogContent(prompt, metadata, timestamp) {
    const separator = '=' + '='.repeat(60) + '='
    
    return `${separator}
CHATTERBOX AI PROMPT LOG
Generated: ${timestamp}
${separator}

MODEL INFORMATION:
- Provider: ${metadata.provider || 'Unknown'}
- Model: ${metadata.model || 'Unknown'}
- Bot: ${metadata.botName || 'Unknown'}

GENERATION PARAMETERS:
- Temperature: ${metadata.temperature || 'Unknown'}
- Top P: ${metadata.topP || 'Unknown'}
- Top K: ${metadata.topK || 'Unknown'}
- Max Tokens: ${metadata.maxTokens || 'Unknown'}

FINAL PROMPT SENT TO LLM:
${separator}

${prompt}

${separator}
END OF PROMPT
${separator}`
  }

  formatTemplateVariables(variables) {
    if (!variables || typeof variables !== 'object') {
      return '- No template variables recorded'
    }

    return Object.entries(variables)
      .map(([key, value]) => {
        const preview = typeof value === 'string' 
          ? (value.length > 100 ? value.substring(0, 100) + '...' : value)
          : String(value)
        return `- {${key}}: ${preview.replace(/\n/g, '\\n')}`
      })
      .join('\n')
  }

  logResponse(response, metadata = {}) {
    try {
      const timestamp = new Date().toISOString()
      const responseContent = `${timestamp} - RESPONSE: ${response}\nMetadata: ${JSON.stringify(metadata, null, 2)}\n\n`
      
      // Append to latest_response.txt
      const latestResponsePath = path.join(this.logsDir, 'latest_response.txt')
      fs.writeFileSync(latestResponsePath, responseContent, 'utf8')
      
      console.log('📝 Response logged to latest_response.txt')
      
    } catch (error) {
      console.error('❌ Error logging response:', error)
    }
  }

  // Utility method to read the latest prompt (for debugging)
  getLatestPrompt() {
    try {
      const latestPromptPath = path.join(this.logsDir, 'latest_prompt.txt')
      if (fs.existsSync(latestPromptPath)) {
        return fs.readFileSync(latestPromptPath, 'utf8')
      }
      return null
    } catch (error) {
      console.error('❌ Error reading latest prompt:', error)
      return null
    }
  }
}

export const promptLogger = new PromptLogger()