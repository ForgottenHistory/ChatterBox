import React, { useState } from 'react';
import { useUser } from '../contexts/userContext';

const UserPanel: React.FC = () => {
  const { user, setUsername, setUserStatus } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');

  const handleEditClick = () => {
    setEditUsername(user?.username || '');
    setIsEditing(true);
  };

  const handleSaveUsername = () => {
    if (editUsername.trim().length >= 2) {
      setUsername(editUsername.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditUsername('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveUsername();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'var(--success-green)';
      case 'away': return 'var(--warning-yellow)';
      case 'offline': return 'var(--text-muted)';
      default: return 'var(--success-green)';
    }
  };

  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) return null;

  return (
    <div className="sidebar-footer">
      <div className="user-info">
        <div className="user-avatar">
          <div 
            className="status-indicator" 
            style={{ backgroundColor: getStatusColor(user.status) }}
          />
          {getUserInitials(user.username)}
        </div>
        
        <div className="user-details">
          {isEditing ? (
            <div className="username-edit">
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                onBlur={handleSaveUsername}
                className="username-edit-input"
                maxLength={20}
                autoFocus
              />
            </div>
          ) : (
            <div className="username" onClick={handleEditClick} title="Click to edit username">
              {user.username}
            </div>
          )}
          
          <div className="user-controls">
            <select 
              className="status-select"
              value={user.status}
              onChange={(e) => setUserStatus(e.target.value as any)}
            >
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel;