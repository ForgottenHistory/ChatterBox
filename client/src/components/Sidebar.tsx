import React, { useState, useEffect } from 'react';
import { Bot, ParticipantStatus } from '../types';
import { useProfileModal } from '../hooks/useProfileModal';
import UserPanel from './UserPanel';
import UserAvatar from './UserAvatar';
import UserProfileModal from './UserProfileModal';
import BotManagementModal from './BotManagementModal';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  active?: boolean;
}

const Sidebar: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBotManagement, setShowBotManagement] = useState(false);
  const { isOpen, selectedUser, showProfile, hideProfile } = useProfileModal();

  const channels: Channel[] = [
    { id: '1', name: 'general', type: 'text', active: true },
    { id: '2', name: 'random', type: 'text' },
    { id: '3', name: 'bot-playground', type: 'text' },
  ];

  // Fetch bots from the API
  const fetchBots = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/bots');
      if (response.ok) {
        const botData = await response.json();
        
        // Convert API response to proper Bot objects
        const properBots: Bot[] = botData.map((bot: any) => ({
          type: 'bot' as const,
          id: bot.id,
          username: bot.username,
          avatar: bot.avatar,
          avatarType: bot.avatarType || 'initials',
          status: bot.status || 'online',
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          personality: 'friendly', // Legacy compatibility
          triggers: [],
          responses: [],
          responseChance: 1.0
        }));
        
        setBots(properBots);
      } else {
        console.error('Failed to fetch bots');
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleBotClick = (bot: Bot) => {
    showProfile(bot);
  };

  const handleManageBots = () => {
    setShowBotManagement(true);
  };

  const handleBotManagementClose = () => {
    setShowBotManagement(false);
    // Refresh bots list when modal closes
    fetchBots();
  };

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-section">
          <div className="section-header">
            <span>TEXT CHANNELS</span>
          </div>
          <div className="channels-list">
            {channels.map(channel => (
              <div key={channel.id} className={`channel-item ${channel.active ? 'active' : ''}`}>
                <span className="channel-hash">#</span>
                <span className="channel-name">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>

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
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>
                Loading bots...
              </div>
            ) : bots.length === 0 ? (
              <div className="empty-bots-state">
                <p>No bots yet</p>
                <button 
                  className="create-first-bot-btn"
                  onClick={handleManageBots}
                >
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
                  <UserAvatar
                    user={bot}
                    size="medium"
                    showStatus={true}
                  />
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