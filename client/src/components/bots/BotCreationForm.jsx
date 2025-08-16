import { useState } from 'react'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import FileUpload from '../ui/FileUpload'
import ErrorMessage from '../ui/ErrorMessage'
import LoadingSpinner from '../ui/LoadingSpinner'

function BotCreationForm({ onClose, onBotCreated }) {
  const [formData, setFormData] = useState({
    username: '',
    description: '',
    personality: '',
    mes_example: '',
    creator_notes: '',
    tags: '',
    creator: '',
    character_version: '',
    triggerInterval: 10
  })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importMode, setImportMode] = useState(false)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatar(file)
      const reader = new FileReader()
      reader.onload = (e) => setAvatarPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleCharacterCardImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      // Import the character parser
      const { characterImageParser } = await import('../../utils/characterImageParser.js')
      
      const characterData = await characterImageParser.extractFromPNG(file)
      
      if (!characterData) {
        setError('No character data found in this image')
        return
      }

      const data = characterData.data

      // Map character card data to form
      setFormData({
        username: data.name || '',
        description: data.description || '',
        personality: data.personality || '',
        mes_example: data.mes_example || '',
        creator_notes: data.creator_notes || '',
        tags: data.tags ? data.tags.join(', ') : '',
        creator: data.creator || '',
        character_version: data.character_version || '',
        triggerInterval: 10
      })

      // Use the character card image as avatar
      setAvatar(file)
      setAvatarPreview(URL.createObjectURL(file))
      setImportMode(false)

    } catch (err) {
      console.error('Character card import error:', err)
      setError('Failed to import character card: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let avatarUrl = null

      // Upload avatar if provided
      if (avatar) {
        const avatarFormData = new FormData()
        avatarFormData.append('avatar', avatar)

        const avatarResponse = await fetch('http://localhost:5000/api/upload/avatar', {
          method: 'POST',
          body: avatarFormData
        })

        if (avatarResponse.ok) {
          const avatarResult = await avatarResponse.json()
          avatarUrl = avatarResult.avatar
        }
      }

      // Create bot
      const botResponse = await fetch('http://localhost:5000/api/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          avatar: avatarUrl,
          bio: formData.personality,
          systemPrompt: formData.description,
          personality: formData.mes_example,
          triggerInterval: parseInt(formData.triggerInterval),
          creator_notes: formData.creator_notes,
          tags: formData.tags,
          creator: formData.creator,
          character_version: formData.character_version
        })
      })

      if (botResponse.ok) {
        const botData = await botResponse.json()
        onBotCreated?.(botData)
        onClose?.()
      } else {
        const errorData = await botResponse.json()
        setError(errorData.error || 'Failed to create bot')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#2F3136] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#FFFFFF] text-xl font-bold">Create AI Bot</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {loading && (
          <div className="mb-4">
            <LoadingSpinner text="Processing..." />
          </div>
        )}

        <ErrorMessage message={error} className="mb-4" />

        {/* Import Toggle */}
        <div className="mb-6 flex gap-2">
          <Button 
            variant={!importMode ? "primary" : "secondary"}
            size="sm"
            onClick={() => setImportMode(false)}
          >
            Manual Creation
          </Button>
          <Button 
            variant={importMode ? "primary" : "secondary"}
            size="sm"
            onClick={() => setImportMode(true)}
          >
            Import Character Card
          </Button>
        </div>

        {importMode ? (
          <div className="mb-6">
            <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
              Character Card Image (PNG)
            </label>
            <input
              type="file"
              accept="image/png"
              onChange={handleCharacterCardImport}
              className="w-full bg-[#40444B] text-[#FFFFFF] p-3 rounded-lg border border-[#40444B]"
            />
            <p className="text-[#72767D] text-xs mt-1">
              Upload a PNG image with embedded V2 character card data
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Bot Name"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter bot name"
              required
            />

            <FormField
              label="Trigger Interval (minutes)"
              name="triggerInterval"
              type="number"
              value={formData.triggerInterval}
              onChange={handleInputChange}
              placeholder="10"
            />
          </div>

          <FormField
            label="Short Description (Bio)"
            name="personality"
            value={formData.personality}
            onChange={handleInputChange}
            placeholder="Brief personality description"
          />

          <div>
            <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
              System Prompt (Full Description)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed character description and behavior"
              className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2] min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
              Example Messages
            </label>
            <textarea
              name="mes_example"
              value={formData.mes_example}
              onChange={handleInputChange}
              placeholder="Example dialogue or message patterns"
              className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2] min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
              Avatar
            </label>
            <FileUpload
              file={avatar}
              preview={avatarPreview}
              onFileChange={handleAvatarChange}
            />
          </div>

          {/* Metadata fields */}
          <div className="border-t border-[#40444B] pt-4">
            <h3 className="text-[#FFFFFF] font-medium mb-3">Metadata (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Creator"
                name="creator"
                value={formData.creator}
                onChange={handleInputChange}
                placeholder="Character creator"
              />

              <FormField
                label="Version"
                name="character_version"
                value={formData.character_version}
                onChange={handleInputChange}
                placeholder="1.0"
              />
            </div>

            <FormField
              label="Tags (comma-separated)"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="fantasy, helpful, friendly"
            />

            <div>
              <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
                Creator Notes
              </label>
              <textarea
                name="creator_notes"
                value={formData.creator_notes}
                onChange={handleInputChange}
                placeholder="Notes about this character"
                className="w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2] min-h-[60px]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading || !formData.username} className="flex-1">
              {loading ? 'Creating Bot...' : 'Create Bot'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BotCreationForm