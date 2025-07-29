import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { useUser } from '../contexts/userContext';
import UserAvatar from './UserAvatar';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isBot?: boolean;
  userId?: string;
  userAvatar?: string;
  userAvatarType?: 'initials' | 'uploaded' | 'generated';
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

    newSocket.on('receive_message', (data: Message) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = () => {
    if (currentMessage.trim() && socket && user) {
      const messageData: Message = {
        id: Date.now().toString(),
        username: user.username,
        message: currentMessage,
        timestamp: new Date().toLocaleTimeString(),
        isBot: false,
        userId: user.id,
        userAvatar: user.avatar,
        userAvatarType: user.avatarType
      };

      socket.emit('send_message', { ...messageData, room: 'general' });
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

  const createUserFromMessage = (msg: Message) => {
    return {
      id: msg.userId || `temp-${msg.username}`,
      username: msg.username,
      avatar: msg.userAvatar || '#5865F2',
      avatarType: msg.userAvatarType || 'initials' as const,
      status: 'online' as const,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
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
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.isBot ? 'bot-message' : 'user-message'}`}>
            <div className="message-header">
              {!msg.isBot && (
                <UserAvatar 
                  user={createUserFromMessage(msg)}
                  size="small"
                  showStatus={false}
                />
              )}
              <span className={`username ${msg.isBot ? 'bot-username' : ''}`}>
                {msg.username}
                {msg.isBot && <span className="bot-badge">BOT</span>}
              </span>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
            <div className="message-content">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          placeholder={`Message #general`}
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="message-input"
        />
        <button onClick={sendMessage} className="send-button" disabled={!currentMessage.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;