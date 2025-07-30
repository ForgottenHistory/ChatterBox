import React from 'react';
import Button from '../ui/Button';

interface ChatHeaderProps {
  connected: boolean;
  onInspectPrompts: () => void;
  roomName?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  connected, 
  onInspectPrompts, 
  roomName = 'general' 
}) => {
  return (
    <div className="chat-header">
      <h3># {roomName}</h3>
      <div className="header-controls">
        <Button
          size="small"
          variant="secondary"
          onClick={onInspectPrompts}
        >
          🔍 Inspect Prompts
        </Button>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;