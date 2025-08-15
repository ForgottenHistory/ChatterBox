function MessageList() {
  // Sample messages for now
  const messages = [
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
    },
    {
      id: 3,
      author: 'You',
      content: 'This is looking great!',
      timestamp: '12:36 PM',
      isBot: false
    }
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => (
        <div key={message.id} className="flex gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
            message.isBot ? 'bg-[#7289DA] text-white' : 'bg-[#5865F2] text-white'
          }`}>
            {message.author[0]}
          </div>
          
          {/* Message Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#FFFFFF] font-medium">{message.author}</span>
              {message.isBot && (
                <span className="bg-[#7289DA] text-white text-xs px-1.5 py-0.5 rounded text-[10px] font-medium">
                  BOT
                </span>
              )}
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