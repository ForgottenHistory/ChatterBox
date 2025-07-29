import React from 'react';
import { Participant, ParticipantStatus } from '../types';

interface UserAvatarProps {
  user: Participant;
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'medium', 
  showStatus = true, 
  onClick,
  className = '' 
}) => {
  const getUserInitials = (username: string): string => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: ParticipantStatus): string => {
    switch (status) {
      case 'online': return 'var(--success-green)';
      case 'away': return 'var(--warning-yellow)';
      case 'offline': return 'var(--text-muted)';
      default: return 'var(--success-green)';
    }
  };

  const getSizeClass = (size: string): string => {
    switch (size) {
      case 'small': return 'avatar-small';
      case 'large': return 'avatar-large';
      case 'extra-large': return 'avatar-extra-large';
      default: return 'avatar-medium';
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const parent = target.parentElement;
    
    if (parent) {
      // Hide the failed image
      target.style.display = 'none';
      
      // Show initials as fallback
      parent.style.backgroundColor = user.avatar.startsWith('#') ? user.avatar : 'var(--brand-blue)';
      parent.style.color = 'var(--text-primary)';
      parent.style.fontSize = parent.classList.contains('avatar-extra-large') ? '3rem' : 
                               parent.classList.contains('avatar-large') ? '1.2rem' : 
                               parent.classList.contains('avatar-small') ? '0.7rem' : '0.8rem';
      parent.textContent = getUserInitials(user.username);
    }
  };

  const renderAvatarContent = () => {
    switch (user.avatarType) {
      case 'uploaded':
        return (
          <img 
            src={user.avatar} 
            alt={`${user.username}'s avatar`}
            className="avatar-image"
            onError={handleImageError}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              display: 'block'
            }}
          />
        );
      case 'generated':
        return (
          <div 
            className="avatar-generated"
            style={{ backgroundImage: `url(${user.avatar})` }}
          />
        );
      case 'initials':
      default:
        return getUserInitials(user.username);
    }
  };

  // For uploaded avatars, don't set background color
  const getBackgroundColor = () => {
    if (user.avatarType === 'uploaded') {
      return 'transparent';
    }
    if (user.avatarType === 'initials') {
      return user.avatar.startsWith('#') ? user.avatar : 'var(--brand-blue)';
    }
    return 'transparent';
  };

  // Get participant type for title
  const getParticipantTypeLabel = (participant: Participant): string => {
    if (participant.type === 'bot') {
      return `Bot - ${participant.personality}`;
    }
    return 'User';
  };

  return (
    <div 
      className={`user-avatar ${getSizeClass(size)} ${onClick ? 'clickable' : ''} ${className}`}
      style={{ 
        backgroundColor: getBackgroundColor(),
        color: user.avatarType === 'initials' ? 'var(--text-primary)' : 'transparent'
      }}
      data-type={user.avatarType}
      onClick={onClick}
      title={`${user.username} (${user.status}) - ${getParticipantTypeLabel(user)}`}
    >
      {renderAvatarContent()}
      
      {showStatus && (
        <div 
          className="status-indicator"
          style={{ backgroundColor: getStatusColor(user.status) }}
        />
      )}
    </div>
  );
};

export default UserAvatar;