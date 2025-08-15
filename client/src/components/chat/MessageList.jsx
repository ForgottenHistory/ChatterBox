import { useState, useEffect } from 'react'
import { onNewMessage, onLoadMessages } from '../../services/socket'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

function MessageList() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    // Load existing messages
    const cleanupLoad = onLoadMessages((loadedMessages) => {
      const formattedMessages = loadedMessages.map(msg => ({
        id: msg.id,
        author: msg.user.username,
        avatar: msg.user.avatar,
        content: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString(),
        isBot: msg.user.isBot
      }))
      setMessages(formattedMessages)
    })

    // Listen for new messages
    const cleanupNew = onNewMessage((newMessage) => {
      setMessages(prev => [...prev, newMessage])
    })

    return () => {
      cleanupLoad()
      cleanupNew()
    }
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => (
        <div key={message.id} className="flex gap-3">
          {/* Avatar */}
          <Avatar 
            name={message.author}
            avatar={message.avatar}
            isBot={message.isBot}
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