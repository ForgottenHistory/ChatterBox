import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import FileUpload from '../ui/FileUpload'
import ErrorMessage from '../ui/ErrorMessage'

function RegisterPage() {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: ''
  })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      // Create user
      const userResponse = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          avatar: avatarUrl
        })
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        login(userData)
      } else {
        const errorData = await userResponse.json()
        setError(errorData.error || 'Failed to create account')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#36393F] flex items-center justify-center p-4">
      <div className="bg-[#2F3136] rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-[#FFFFFF] text-2xl font-bold mb-2">Welcome to ChatterBox</h1>
          <p className="text-[#B9BBBE]">Create your account to start chatting</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage message={error} />

          <FormField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Enter your username"
            required
          />

          <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email (optional)"
          />

          <FormField
            label="Bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us about yourself (optional)"
          />

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

          <Button 
            type="submit" 
            className="w-full" 
            size="lg" 
            disabled={loading || !formData.username}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage