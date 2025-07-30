import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { Message, Participant, User } from '../types';

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

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  sendMessage: (message: string, user: User) => void;
}

export const useSocket = (
  onMessageReceived: (message: Message) => void
): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

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

  const sendMessage = (message: string, user: User) => {
    if (socket && message.trim()) {
      // Create legacy format for socket communication
      const legacyMessageData: LegacyMessage = {
        id: Date.now().toString(),
        username: user.username,
        message: message,
        timestamp: new Date().toLocaleTimeString(),
        isBot: false,
        userId: user.id,
        userAvatar: user.avatar,
        userAvatarType: user.avatarType
      };

      socket.emit('send_message', { ...legacyMessageData, room: 'general' });
    }
  };

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
      onMessageReceived(message);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [onMessageReceived]);

  return {
    socket,
    connected,
    sendMessage
  };
};