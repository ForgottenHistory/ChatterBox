import { useState } from 'react'
import { sendMessage } from '../../services/socket'

function MessageInput() {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim()) {
      sendMessage({
        author: 'You',
        content: message.trim()
      })
      setMessage('')
    }
  }

  return (
    <div className="p-4 bg-[#36393F]">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message #general"
          className="flex-1 bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-[#5865F2]"
        />
        <button
          type="submit"
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default MessageInput