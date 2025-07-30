import React, { useEffect, useRef } from 'react';
import { Message, Participant } from '../../types';
import UserAvatar from '../UserAvatar';

interface MessageListProps {
  messages: Message[];
  onUserClick: (user: Participant) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onUserClick }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp: string): string => {
    try {
      // If it's already a time string (like "10:30:45 AM"), return as is
      if (timestamp.includes(':') && !timestamp.includes('T')) {
        return timestamp;
      }

      // If it's an ISO string, convert to time
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const renderMessage = (message: Message) => {
    const isBot = message.author.type === 'bot';

    return (
      <div key={message.id} className={`message ${isBot ? 'bot-message' : 'user-message'}`}>
        <div className="message-header">
          <UserAvatar
            user={message.author}
            size="small"
            showStatus={false}
            onClick={() => onUserClick(message.author)}
          />
          <span
            className={`username ${isBot ? 'bot-username' : ''} clickable-username`}
            onClick={() => onUserClick(message.author)}
          >
            {message.author.username}
            {isBot && <span className="bot-badge">BOT</span>}
          </span>
          <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
        </div>
        <div className="message-content">{message.content}</div>
      </div>
    );
  };

  return (
    <div className="messages-container">
      {messages.map(renderMessage)}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;