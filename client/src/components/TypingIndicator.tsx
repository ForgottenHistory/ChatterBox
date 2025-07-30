import React from 'react';
import { Participant } from '../types';
import UserAvatar from './UserAvatar';

interface TypingIndicatorProps {
  typingUsers: Participant[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const formatTypingText = (users: Participant[]): string => {
    if (users.length === 1) {
      return `${users[0].username} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].username} and ${users[1].username} are typing...`;
    } else if (users.length === 3) {
      return `${users[0].username}, ${users[1].username}, and ${users[2].username} are typing...`;
    } else {
      return `${users[0].username}, ${users[1].username}, and ${users.length - 2} others are typing...`;
    }
  };

  return (
    <div className="typing-indicator">
      <div className="typing-text">
        <span>{formatTypingText(typingUsers)}</span>
        <div className="typing-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;