import React from 'react';
import { Participant } from '../types';
import UserAvatar from './UserAvatar';
import Modal from './ui/Modal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Participant | null;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getBotPersonalityDescription = (personality: string): string => {
    const descriptions = {
      friendly: 'Warm and welcoming, always ready to chat',
      sarcastic: 'Sharp wit with a touch of sass',
      helpful: 'Always eager to assist and provide guidance',
      mysterious: 'Enigmatic responses with hidden depths',
      energetic: 'High energy and enthusiasm in every message'
    };
    return descriptions[personality as keyof typeof descriptions] || 'Unique personality';
  };

  const renderUserInfo = () => (
    <div className="profile-info-section">
      <div className="profile-field">
        <label>User ID</label>
        <span className="profile-id">{user.id}</span>
      </div>
      
      <div className="profile-field">
        <label>Joined ChatterBox</label>
        <span>{formatDate(user.joinedAt)}</span>
      </div>
    </div>
  );

  const renderBotInfo = () => {
    const bot = user as Extract<Participant, { type: 'bot' }>;
    
    return (
      <div className="profile-info-section">
        <div className="profile-field">
          <label>Bot ID</label>
          <span className="profile-id">{bot.id}</span>
        </div>
        
        <div className="profile-field">
          <label>Bio</label>
          <p className="bot-bio">
            {getBotPersonalityDescription(bot.personality)}
          </p>
        </div>
        
        <div className="profile-field">
          <label>Active Since</label>
          <span>{formatDate(bot.joinedAt)}</span>
        </div>
      </div>
    );
  };

  const isBot = user.type === 'bot';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user.username}
      subtitle={isBot ? `AI Bot • ${user.personality}` : 'ChatterBox User'}
      size="small"
      showCloseButton={true}
    >
      <div className="user-profile-modal compact">
        <div className="profile-header">
          <UserAvatar user={user} size="large" showStatus={true} />
          <div className="profile-header-info">
            <h3 className="profile-username">
              {user.username}
              {isBot && <span className="profile-bot-badge">BOT</span>}
            </h3>
            <p className="profile-type">
              {isBot ? `${user.personality.charAt(0).toUpperCase() + user.personality.slice(1)} Bot` : 'User'}
            </p>
          </div>
        </div>

        {isBot ? renderBotInfo() : renderUserInfo()}
      </div>
    </Modal>
  );
};

export default UserProfileModal;