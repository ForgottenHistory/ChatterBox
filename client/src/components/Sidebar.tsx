import React, { useState } from 'react';
import { Bot } from '../types';
import { useProfileModal } from '../hooks/useProfileModal';
import { useBots } from '../hooks/useBots';

import UserPanel from './UserPanel';
import UserAvatar from './UserAvatar';
import UserProfileModal from './UserProfileModal';
import BotManagementModal from './BotManagementModal';
import LoadingState from './ui/LoadingState';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  active?: boolean;
}

const CHANNELS: Channel[] = [
  { id: '1', name: 'general', type: 'text', active: true },
  { id: '2', name: 'random', type: 'text' },
  { id: '3', name: 'bot-playground', type: 'text' },
];

const Sidebar: React.FC = () => {
  const { bots, loading, refetch } = useBots();
  const { isOpen, selectedUser, showProfile, hideProfile } = useProfileModal();
  const [showBotManagement, setShowBotManagement] = useState(false);

  const handleBotClick = (bot: Bot) => showProfile(bot);
  const handleManageBots = () => setShowBotManagement(true);
  const handleBotManagementClose = () => {
    setShowBotManagement(false);
    refetch();
  };

  const renderChannels = () => (
    <div className="sidebar-section">
      <div className="section-header">
        <span>TEXT CHANNELS</span>
      </div>
      <div className="channels-list">
        {CHANNELS.map(channel => (
          <div key={channel.id} className={`channel-item ${channel.active ? 'active' : ''}`}>
            <span className="channel-hash">#</span>
            <span className="channel-name">{channel.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBotSection = () => (
    <div className="sidebar-section">
      <div className="section-header">
        <span>AI BOTS</span>
        <div className="section-header-actions">
          <span className="bot-count">{loading ? '...' : bots.length}</span>
          <button 
            className="manage-bots-btn"
            onClick={handleManageBots}
            title="Manage Bots"
          >
            ⚙️
          </button>
        </div>
      </div>
      <div className="bots-list">
        {loading ? (
          <LoadingState message="Loading bots..." className="bots-loading" />
        ) : bots.length === 0 ? (
          <div className="empty-bots-state">
            <p>No bots yet</p>
            <button className="create-first-bot-btn" onClick={handleManageBots}>
              Create your first bot
            </button>
          </div>
        ) : (
          bots.map(bot => (
            <div 
              key={bot.id} 
              className="bot-item clickable-bot" 
              onClick={() => handleBotClick(bot)}
            >
              <UserAvatar user={bot} size="medium" showStatus={true} />
              <div className="bot-info">
                <div className="bot-name">
                  {bot.username}
                  <span className="bot-badge">BOT</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="sidebar">
        {renderChannels()}
        {renderBotSection()}
        <UserPanel />
      </div>

      <UserProfileModal
        isOpen={isOpen}
        onClose={hideProfile}
        user={selectedUser}
      />

      <BotManagementModal
        isOpen={showBotManagement}
        onClose={handleBotManagementClose}
      />
    </>
  );
};

export default Sidebar;