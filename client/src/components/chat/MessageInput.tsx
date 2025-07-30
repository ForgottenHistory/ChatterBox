import React, { useState } from 'react';
import Button from '../ui/Button';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
  const [currentMessage, setCurrentMessage] = useState('');

  const handleSend = () => {
    if (currentMessage.trim() && !disabled) {
      onSendMessage(currentMessage.trim());
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-container">
      <input
        type="text"
        placeholder="Message #general"
        value={currentMessage}
        onChange={(e) => setCurrentMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        className="message-input"
        disabled={disabled}
      />
      <Button
        onClick={handleSend}
        variant="primary"
        size="medium"
        disabled={!currentMessage.trim() || disabled}
      >
        Send
      </Button>
    </div>
  );
};

export default MessageInput;