import React, { useState } from 'react';
import { useUser } from '../contexts/userContext';
import UserAvatar from './UserAvatar';

const UserPanel: React.FC = () => {
  const { user, setUserStatus } = useUser();
  const [isEditing, setIsEditing] = useState(false);

  const handleAvatarClick = () => {
    console.log('Avatar clicked - settings coming soon');
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
          <div className="username">
            {user.username}
          </div>
          
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