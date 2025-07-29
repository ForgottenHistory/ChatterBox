import React from 'react';
import UserPanel from './userPanel';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  active?: boolean;
}

interface Bot {
  id: string;
  name: string;
  status: 'online' | 'away' | 'offline';
  personality: string;
}

const Sidebar: React.FC = () => {
  const channels: Channel[] = [
    { id: '1', name: 'general', type: 'text', active: true },
    { id: '2', name: 'random', type: 'text' },
    { id: '3', name: 'bot-playground', type: 'text' },
  ];

  const bots: Bot[] = [
    { id: '1', name: 'ChattyBot', status: 'online', personality: 'Friendly' },
    { id: '2', name: 'SarcasticAI', status: 'away', personality: 'Sarcastic' },
    { id: '3', name: 'HelperBot', status: 'offline', personality: 'Helpful' },
  ];

  const getStatusColor = (status: Bot['status']) => {
    switch (status) {
      case 'online': return 'var(--success-green)';
      case 'away': return 'var(--warning-yellow)';
      case 'offline': return 'var(--text-muted)';
    }
  };

  return (
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
          <span className="bot-count">{bots.length}</span>
        </div>
        <div className="bots-list">
          {bots.map(bot => (
            <div key={bot.id} className="bot-item">
              <div className="bot-avatar">
                <div 
                  className="status-indicator" 
                  style={{ backgroundColor: getStatusColor(bot.status) }}
                />
              </div>
              <div className="bot-info">
                <div className="bot-name">
                  {bot.name}
                  <span className="bot-badge">BOT</span>
                </div>
                <div className="bot-personality">{bot.personality}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <UserPanel />
    </div>
  );
};

export default Sidebar;