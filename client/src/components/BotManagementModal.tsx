import React, { useState, useEffect, useRef } from 'react';
import { Bot } from '../types';
import { CharacterCardV2 } from '../types/character';
import { characterImageParser } from '../utils/characterImageParser';
import { useApi } from '../hooks/useApi';
import { useFormState } from '../hooks/useFormState';

import UserAvatar from './UserAvatar';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import Form, { FormRow, FormTextarea, FormColorPicker } from './ui/Form';
import ErrorBanner from './ui/ErrorBanner';
import LoadingState from './ui/LoadingState';

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

const AVATAR_COLORS = [
  '#7289DA', '#43B581', '#FAA61A', '#F04747', '#9C84EF',
  '#EB459E', '#00D9FF', '#FFA500', '#5865F2', '#57F287'
];

const INITIAL_FORM: CreateBotForm = {
  name: '',
  description: '',
  exampleMessages: '',
  avatar: '#7289DA',
  avatarType: 'initials'
};

const BotManagementModal: React.FC<BotManagementModalProps> = ({ isOpen, onClose }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const { state: form, updateField, updateFields, reset: resetForm } = useFormState<CreateBotForm>(INITIAL_FORM);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBots = useApi<Bot[]>('/bots', 'GET');
  const createBot = useApi('/bots', 'POST');
  const deleteBot = useApi('/bots', 'DELETE');
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBots.execute(); // Refresh after successful creation // No parameters needed for GET
    }
  }, [isOpen]);

  useEffect(() => {
    if (fetchBots.data) {
      setBots(fetchBots.data.map(mapBotData));
    }
  }, [fetchBots.data]);

  const mapBotData = (bot: any): Bot => ({
    type: 'bot' as const,
    id: bot.id,
    username: bot.username,
    avatar: bot.avatar,
    avatarType: bot.avatarType || 'initials',
    status: bot.status || 'online',
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    personality: 'friendly',
    triggers: [],
    responses: [],
    responseChance: 1.0
  });

  const updateForm = (updates: Partial<CreateBotForm>) => updateFields(updates);

  const handleImportCharacter = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      let characterData: CharacterCardV2 | null = null;
      
      if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
        characterData = await characterImageParser.extractFromPNG(file) ||
                       await characterImageParser.extractFromPNGAlternative(file);
      } else if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(await file.text());
        if (parsed.spec === 'chara_card_v2') characterData = parsed;
      }

      if (characterData) {
        const { name, description = '', mes_example = '', avatar } = characterData.data;
        updateForm({
          name,
          description,
          exampleMessages: mes_example,
          avatar: avatar || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          avatarType: avatar ? 'uploaded' : 'initials'
        });
        setActiveTab('create');
      } else {
        setError('No character data found in file. Make sure it\'s a valid V2 character card.');
      }
    } catch (error) {
      setError(`Failed to import character: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Bot name is required');
      return;
    }

    const result = await createBot.execute(undefined, form); // Pass form as body, no pathParams
    if (result) {
      resetForm();
      setActiveTab('list');
      fetchBots.execute();
    }
  };

  const handleDeleteBot = async (botId: string) => {
    setDeletingBotId(botId);
    const result = await deleteBot.execute(botId); // Pass botId as pathParams
    if (result) {
      fetchBots.execute(); // Refresh the bot list
    }
    setDeletingBotId(null);
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

      {fetchBots.loading ? (
        <LoadingState message="Loading bots..." />
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
                  disabled={deletingBotId === bot.id}
                >
                  {deletingBotId === bot.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateForm = () => (
    <Form
      onSubmit={handleCreateBot}
      actions={{
        cancel: { label: 'Cancel', onClick: () => setActiveTab('list') },
        submit: { label: createBot.loading ? 'Creating...' : 'Create Bot', disabled: createBot.loading || !form.name.trim() }
      }}
    >
      <FormRow>
        <Input
          label="Bot Name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Enter bot name..."
          maxLength={50}
          disabled={createBot.loading}
        />
      </FormRow>

      <FormTextarea
        label="Description"
        value={form.description}
        onChange={(e) => updateField('description', e.target.value)}
        placeholder="Describe the character's appearance, background, and traits..."
        rows={4}
        disabled={createBot.loading}
      />

      <FormRow>
        <label className="form-label">Avatar</label>
        {form.avatarType === 'initials' ? (
          <FormColorPicker
            colors={AVATAR_COLORS}
            selectedColor={form.avatar}
            onColorSelect={(avatar) => updateField('avatar', avatar)}
            disabled={createBot.loading}
          />
        ) : (
          <div className="uploaded-avatar-preview">
            <img src={form.avatar} alt="Bot avatar" className="avatar-preview-img" />
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => updateFields({ avatarType: 'initials', avatar: '#7289DA' })}
            >
              Use Initials Instead
            </Button>
          </div>
        )}
      </FormRow>

      <FormTextarea
        label="Example Messages"
        value={form.exampleMessages}
        onChange={(e) => updateField('exampleMessages', e.target.value)}
        placeholder="Example conversation to help the AI understand the character's speaking style..."
        rows={3}
        disabled={createBot.loading}
        help="Optional conversation examples for the AI"
      />
    </Form>
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
        <ErrorBanner 
          error={error || fetchBots.error || createBot.error || deleteBot.error} 
          onDismiss={() => {
            setError(null);
            fetchBots.reset();
            createBot.reset();
            deleteBot.reset();
          }} 
        />

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