import React, { useState } from 'react';
import { useUser } from '../contexts/userContext';
import UserAvatar from './UserAvatar';

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

  const handleAvatarClick = () => {
    // TODO: Open avatar settings modal
    console.log('Avatar clicked - will open settings modal');
  };

  if (!user) return null;

  return (
    <div className="sidebar-footer">
      <div className="user-info">
        <UserAvatar 
          user={user} 
          size="medium" 
          showStatus={true}
          onClick={handleAvatarClick}
        />
        
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