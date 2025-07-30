import React, { useState } from 'react';
import { useUser } from '../contexts/userContext';
import UserAvatar from './UserAvatar';
import UserSettingsModal from './UserSettingsModal';

const UserPanel: React.FC = () => {
  const { user, setUserStatus } = useUser();
  const [showSettings, setShowSettings] = useState(false);

  const handleAvatarClick = () => {
    setShowSettings(true);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  if (!user) return null;

  return (
    <>
      <div className="sidebar-footer">
        <div className="user-info">
          <UserAvatar 
            user={user} 
            size="medium" 
            showStatus={true}
            onClick={handleAvatarClick}
          />
          
          <div className="user-details">
            <div className="username" onClick={handleAvatarClick}>
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

          <div className="user-actions">
            <button 
              className="settings-button"
              onClick={handleSettingsClick}
              title="User Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <UserSettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};

export default UserPanel;