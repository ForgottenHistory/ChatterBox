import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { useUser } from '../contexts/userContext';
import { Message, Participant } from '../types';
import UserAvatar from './UserAvatar';
import Button from './ui/Button';

// Legacy message format for socket communication
interface LegacyMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isBot?: boolean;
  userId?: string;
  userAvatar?: string;
  userAvatarType?: 'initials' | 'uploaded' | 'generated';
  room?: string;
  author?: Participant;
  content?: string;
}

const Chat: React.FC = () => {
  const { user, updateLastActive } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      newSocket.emit('join_room', 'general');
    });

    newSocket.on('receive_message', (data: LegacyMessage) => {
      const message = convertLegacyMessage(data);
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Convert legacy message format to new Message format
  const convertLegacyMessage = (legacyMsg: LegacyMessage): Message => {
    // If it's already in new format, return as is
    if (legacyMsg.author && legacyMsg.content) {
      return legacyMsg as Message;
    }

    // Convert legacy format
    const participant: Participant = legacyMsg.isBot 
      ? {
          type: 'bot',
          id: legacyMsg.userId || `bot-${legacyMsg.username.toLowerCase()}`,
          username: legacyMsg.username,
          avatar: legacyMsg.userAvatar || '#7289DA',
          avatarType: legacyMsg.userAvatarType || 'initials',
          status: 'online',
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          personality: 'friendly',
          triggers: [],
          responses: [],
          responseChance: 0.7
        }
      : {
          type: 'user',
          id: legacyMsg.userId || `user-${legacyMsg.username.toLowerCase()}`,
          username: legacyMsg.username,
          avatar: legacyMsg.userAvatar || '#5865F2',
          avatarType: legacyMsg.userAvatarType || 'initials',
          status: 'online',
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };

    return {
      id: legacyMsg.id,
      content: legacyMsg.message || legacyMsg.content || '',
      timestamp: legacyMsg.timestamp,
      room: legacyMsg.room || 'general',
      author: participant
    };
  };

  const sendMessage = () => {
    if (currentMessage.trim() && socket && user) {
      // Create legacy format for socket communication
      const legacyMessageData: LegacyMessage = {
        id: Date.now().toString(),
        username: user.username,
        message: currentMessage,
        timestamp: new Date().toLocaleTimeString(),
        isBot: false,
        userId: user.id,
        userAvatar: user.avatar,
        userAvatarType: user.avatarType
      };

      socket.emit('send_message', { ...legacyMessageData, room: 'general' });
      setCurrentMessage('');
      updateLastActive();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
          />
          <span className={`username ${isBot ? 'bot-username' : ''}`}>
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
    <div className="chat-container">
      <div className="chat-header">
        <h3># general</h3>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <div className="messages-container">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          placeholder="Message #general"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="message-input"
        />
        <Button
          onClick={sendMessage}
          variant="primary"
          size="medium"
          disabled={!currentMessage.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default Chat;