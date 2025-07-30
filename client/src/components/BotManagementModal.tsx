import React, { useState, useEffect, useRef } from 'react';
import { Bot } from '../types';
import { CharacterCardV2 } from '../types/character';
import { characterImageParser } from '../utils/characterImageParser';
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
  description: string;
  exampleMessages: string;
  avatar: string;
  avatarType: 'initials' | 'uploaded';
}

const BotManagementModal: React.FC<BotManagementModalProps> = ({ isOpen, onClose }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CreateBotForm>({
    name: '',
    description: '',
    exampleMessages: '',
    avatar: '#7289DA',
    avatarType: 'initials'
  });

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
          personality: 'friendly', // Legacy compatibility
          triggers: [],
          responses: [],
          responseChance: 1.0
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

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      exampleMessages: '',
      avatar: '#7289DA',
      avatarType: 'initials'
    });
  };

  const handleImportCharacter = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      console.log('Importing character from file:', file.name);
      
      // Try to extract character data
      let characterData: CharacterCardV2 | null = null;
      
      if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
        characterData = await characterImageParser.extractFromPNG(file);
        
        // Try alternative method if first one fails
        if (!characterData) {
          characterData = await characterImageParser.extractFromPNGAlternative(file);
        }
      } else if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed.spec === 'chara_card_v2') {
          characterData = parsed;
        }
      }

      if (characterData) {
        console.log('Character data imported:', characterData.data.name);
        
        // Map character data to bot form
        const data = characterData.data;

        setForm({
          name: data.name,
          description: data.description || '',
          exampleMessages: data.mes_example || '',
          avatar: data.avatar || avatarColors[Math.floor(Math.random() * avatarColors.length)],
          avatarType: data.avatar ? 'uploaded' : 'initials'
        });

        setActiveTab('create');
        setError(null);
      } else {
        setError('No character data found in file. Make sure it\'s a valid V2 character card.');
      }
    } catch (error) {
      console.error('Error importing character:', error);
      setError(`Failed to import character: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      if (!form.name.trim()) {
        setError('Bot name is required');
        return;
      }

      const botData = {
        name: form.name.trim(),
        description: form.description,
        exampleMessages: form.exampleMessages,
        avatar: form.avatar,
        avatarType: form.avatarType
      };

      const response = await fetch('http://localhost:5000/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botData)
      });

      if (response.ok) {
        resetForm();
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
      <div className="import-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.json,image/png,application/json"
          onChange={handleImportCharacter}
          style={{ display: 'none' }}
          disabled={importing}
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Import V2 Character Card'}
        </Button>
        <p className="import-info">Import from .png or .json character card files</p>
      </div>

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
                  <span className="bot-description">AI Assistant</span>
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
          maxLength={50}
          disabled={creating}
        />
      </div>

      <div className="form-row">
        <label className="form-label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the character's appearance, background, and traits..."
          className="form-textarea"
          rows={4}
          disabled={creating}
        />
      </div>

      <div className="form-row">
        <label className="form-label">Avatar</label>
        {form.avatarType === 'initials' ? (
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
        ) : (
          <div className="uploaded-avatar-preview">
            <img src={form.avatar} alt="Bot avatar" className="avatar-preview-img" />
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setForm({ ...form, avatarType: 'initials', avatar: '#7289DA' })}
            >
              Use Initials Instead
            </Button>
          </div>
        )}
      </div>

      <div className="form-row">
        <label className="form-label">Example Messages (Optional)</label>
        <textarea
          value={form.exampleMessages}
          onChange={(e) => setForm({ ...form, exampleMessages: e.target.value })}
          placeholder="Example conversation to help the AI understand the character's speaking style..."
          className="form-textarea"
          rows={3}
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