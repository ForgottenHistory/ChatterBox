import React from 'react';
import { User } from '../contexts/userContext';

interface UserAvatarProps {
  user: User;
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

  const getStatusColor = (status: User['status']): string => {
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

  const renderAvatarContent = () => {
    switch (user.avatarType) {
      case 'uploaded':
        return (
          <img 
            src={user.avatar} 
            alt={`${user.username}'s avatar`}
            className="avatar-image"
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.style.backgroundColor = user.avatar || 'var(--brand-blue)';
                parent.textContent = getUserInitials(user.username);
              }
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

  return (
    <div 
      className={`user-avatar ${getSizeClass(size)} ${onClick ? 'clickable' : ''} ${className}`}
      style={{ 
        backgroundColor: user.avatarType === 'initials' ? user.avatar : 'transparent'
      }}
      onClick={onClick}
      title={`${user.username} (${user.status})`}
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