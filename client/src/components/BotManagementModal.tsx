import React, { useState, useEffect } from 'react';
import { Bot, BotPersonality } from '../types';
import UserAvatar from './UserAvatar';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

interface BotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateBotForm {
  name: string;
  personality: BotPersonality;
  triggers: string;
  responses: string;
  avatar: string;
  responseChance: number;
}

const BotManagementModal: React.FC<BotManagementModalProps> = ({ isOpen, onClose }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateBotForm>({
    name: '',
    personality: 'friendly',
    triggers: '',
    responses: '',
    avatar: '#7289DA',
    responseChance: 0.7
  });

  const personalityOptions: { value: BotPersonality; label: string; description: string }[] = [
    { value: 'friendly', label: 'Friendly', description: 'Warm and welcoming' },
    { value: 'sarcastic', label: 'Sarcastic', description: 'Sharp wit with sass' },
    { value: 'helpful', label: 'Helpful', description: 'Always eager to assist' },
    { value: 'mysterious', label: 'Mysterious', description: 'Enigmatic responses' },
    { value: 'energetic', label: 'Energetic', description: 'High energy enthusiasm' }
  ];

  const avatarColors = [
    '#7289DA', '#43B581', '#FAA61A', '#F04747', '#9C84EF',
    '#EB459E', '#00D9FF', '#FFA500', '#5865F2', '#57F287'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchBots();
    }
  }, [isOpen]);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/bots');
      if (response.ok) {
        const botData = await response.json();
        const properBots: Bot[] = botData.map((bot: any) => ({
          type: 'bot' as const,
          id: bot.id,
          username: bot.username,
          avatar: bot.avatar,
          avatarType: bot.avatarType || 'initials',
          status: bot.status || 'online',
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          personality: bot.personality,
          triggers: [],
          responses: [],
          responseChance: 0.7
        }));
        setBots(properBots);
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
      setError('Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const triggers = form.triggers.split(',').map(t => t.trim()).filter(t => t);
      const responses = form.responses.split('\n').map(r => r.trim()).filter(r => r);

      if (triggers.length === 0) {
        setError('Please add at least one trigger word');
        return;
      }

      if (responses.length === 0) {
        setError('Please add at least one response');
        return;
      }

      const botData = {
        name: form.name.trim(),
        personality: form.personality,
        triggers,
        responses,
        avatar: form.avatar,
        responseChance: form.responseChance
      };

      const response = await fetch('http://localhost:5000/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botData)
      });

      if (response.ok) {
        // Reset form
        setForm({
          name: '',
          personality: 'friendly',
          triggers: '',
          responses: '',
          avatar: '#7289DA',
          responseChance: 0.7
        });
        setActiveTab('list');
        await fetchBots();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create bot');
      }
    } catch (error) {
      setError('Failed to create bot');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    setDeleting(botId);
    try {
      const response = await fetch(`http://localhost:5000/api/bots/${botId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchBots();
      } else {
        setError('Failed to delete bot');
      }
    } catch (error) {
      setError('Failed to delete bot');
    } finally {
      setDeleting(null);
    }
  };

  const renderBotList = () => (
    <div className="bot-list-content">
      {loading ? (
        <div className="loading-state">Loading bots...</div>
      ) : bots.length === 0 ? (
        <div className="empty-state">
          <p>No bots created yet</p>
          <Button onClick={() => setActiveTab('create')}>Create Your First Bot</Button>
        </div>
      ) : (
        <div className="bots-grid">
          {bots.map(bot => (
            <div key={bot.id} className="bot-card">
              <div className="bot-card-header">
                <UserAvatar user={bot} size="medium" showStatus={false} />
                <div className="bot-card-info">
                  <h4>{bot.username}</h4>
                  <span className="bot-personality">{bot.personality}</span>
                </div>
              </div>
              <div className="bot-card-actions">
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleDeleteBot(bot.id)}
                  disabled={deleting === bot.id}
                >
                  {deleting === bot.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateForm = () => (
    <form onSubmit={handleCreateBot} className="create-bot-form">
      <div className="form-row">
        <Input
          label="Bot Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter bot name..."
          maxLength={20}
          disabled={creating}
        />
      </div>

      <div className="form-row">
        <label className="form-label">Personality</label>
        <select
          value={form.personality}
          onChange={(e) => setForm({ ...form, personality: e.target.value as BotPersonality })}
          className="personality-select"
          disabled={creating}
        >
          {personalityOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label className="form-label">Avatar Color</label>
        <div className="color-picker">
          {avatarColors.map(color => (
            <button
              key={color}
              type="button"
              className={`color-option ${form.avatar === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setForm({ ...form, avatar: color })}
              disabled={creating}
            />
          ))}
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">Trigger Words (comma separated)</label>
        <Input
          value={form.triggers}
          onChange={(e) => setForm({ ...form, triggers: e.target.value })}
          placeholder="hello, hi, hey, help..."
          disabled={creating}
        />
      </div>

      <div className="form-row">
        <label className="form-label">Responses (one per line)</label>
        <textarea
          value={form.responses}
          onChange={(e) => setForm({ ...form, responses: e.target.value })}
          placeholder="Hello there! How can I help?&#10;Hi! Great to see you here!&#10;Hey! What's up?"
          className="responses-textarea"
          rows={4}
          disabled={creating}
        />
      </div>

      <div className="form-row">
        <label className="form-label">Response Chance ({Math.round(form.responseChance * 100)}%)</label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={form.responseChance}
          onChange={(e) => setForm({ ...form, responseChance: parseFloat(e.target.value) })}
          className="chance-slider"
          disabled={creating}
        />
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={() => setActiveTab('list')}>
          Cancel
        </Button>
        <Button type="submit" disabled={creating || !form.name.trim()}>
          {creating ? 'Creating...' : 'Create Bot'}
        </Button>
      </div>
    </form>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bot Management"
      subtitle="Create and manage your AI bots"
      size="large"
      showCloseButton={true}
    >
      <div className="bot-management-modal">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            My Bots ({bots.length})
          </button>
          <button
            className={`modal-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create New Bot
          </button>
        </div>

        <div className="modal-tab-content">
          {activeTab === 'list' ? renderBotList() : renderCreateForm()}
        </div>
      </div>
    </Modal>
  );
};

export default BotManagementModal;