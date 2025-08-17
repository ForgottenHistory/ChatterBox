import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { sendMessage } from '../../services/socket'
import Button from '../ui/Button'
import Input from '../ui/Input'

function MessageInput() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && user) {
      sendMessage({
        author: user.username,
        content: message.trim()
      })
      setMessage('')
    }
  }

  return (
    <div className="p-4 bg-[#36393F]">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Message #general`}
          className="flex-1"
        />
        <Button type="submit" size="lg" disabled={!message.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}

export default MessageInput