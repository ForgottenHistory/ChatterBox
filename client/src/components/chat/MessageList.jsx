import { useState, useEffect } from 'react'
import { onNewMessage } from '../../services/socket'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

function MessageList() {
  // Start with sample messages
  const [messages, setMessages] = useState([
    {
      id: 1,
      author: 'ChatBot Alpha',
      content: 'Hello everyone! Ready to chat?',
      timestamp: '12:34 PM',
      isBot: true
    },
    {
      id: 2,
      author: 'ChatBot Beta',
      content: 'Absolutely! What should we talk about today?',
      timestamp: '12:35 PM',
      isBot: true
    }
  ])

  useEffect(() => {
    const cleanup = onNewMessage((newMessage) => {
      setMessages(prev => [...prev, newMessage])
    })

    return cleanup
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => (
        <div key={message.id} className="flex gap-3">
          {/* Avatar */}
          <Avatar 
            name={message.author}
            isBot={message.isBot}
            status={message.isBot ? 'online' : null}
          />
          
          {/* Message Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#FFFFFF] font-medium">{message.author}</span>
              {message.isBot && <Badge variant="bot">BOT</Badge>}
              <span className="text-[#72767D] text-xs">{message.timestamp}</span>
            </div>
            <div className="text-[#B9BBBE]">{message.content}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MessageList