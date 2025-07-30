import React, { useState, useEffect } from 'react';
import { Bot } from '../types';
import { useApi } from '../hooks/useApi';
import { useBotForm } from '../hooks/useBotForm';

import Modal from './ui/Modal';
import ErrorBanner from './ui/ErrorBanner';
import BotListTab from './bot/BotListTab';
import CreateBotTab from './bot/CreateBotTab';
import AIConfigTab from './bot/AIConfigTab';

interface BotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'list' | 'create' | 'config';

const BotManagementModal: React.FC<BotManagementModalProps> = ({ isOpen, onClose }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [error, setError] = useState<string | null>(null);
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);

  const {
    form,
    updateField,
    updateForm,
    resetForm,
    llmSettings,
    setLlmSettings,
    hasUnsavedLlmChanges,
    saveLlmSettings,
    cancelLlmChanges,
    importCharacterData,
    getCreateBotData,
    avatarColors
  } = useBotForm();

  const fetchBots = useApi<Bot[]>('/bots', 'GET');
  const createBot = useApi('/bots', 'POST');
  const deleteBot = useApi('/bots', 'DELETE');

  useEffect(() => {
    if (isOpen) {
      fetchBots.execute();
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

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Bot name is required');
      return;
    }

    const result = await createBot.execute(undefined, getCreateBotData());
    if (result) {
      resetForm();
      setActiveTab('list');
      fetchBots.execute();
    }
  };

  const handleDeleteBot = async (botId: string) => {
    setDeletingBotId(botId);
    const result = await deleteBot.execute(botId);
    if (result) {
      fetchBots.execute();
    }
    setDeletingBotId(null);
  };

  const handleImportCharacter = (characterData: any) => {
    importCharacterData(characterData);
    setActiveTab('create');
  };

  const handleSaveLlmSettings = () => {
    // TODO: Save to backend when implemented
    saveLlmSettings();
    setActiveTab('list');
  };

  const handleCancelLlmSettings = () => {
    cancelLlmChanges();
    setActiveTab('list');
  };

  const dismissAllErrors = () => {
    setError(null);
    fetchBots.reset();
    createBot.reset();
    deleteBot.reset();
  };

  const getTabTitle = (tab: TabType): string => {
    switch (tab) {
      case 'list': return `My Bots (${bots.length})`;
      case 'create': return 'Create New Bot';
      case 'config': return 'AI Configuration';
      default: return '';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'list':
        return (
          <BotListTab
            bots={bots}
            loading={fetchBots.loading}
            error={fetchBots.error}
            onDeleteBot={handleDeleteBot}
            onImportCharacter={handleImportCharacter}
            onCreateNew={() => setActiveTab('create')}
            deletingBotId={deletingBotId}
          />
        );

      case 'create':
        return (
          <CreateBotTab
            form={form}
            onUpdateField={updateField}
            onUpdateFields={updateForm}
            onSubmit={handleCreateBot}
            onCancel={() => setActiveTab('list')}
            loading={createBot.loading}
            avatarColors={avatarColors}
          />
        );

      case 'config':
        return (
          <AIConfigTab
            llmSettings={llmSettings}
            onSettingsChange={setLlmSettings}
            onSave={handleSaveLlmSettings}
            onCancel={handleCancelLlmSettings}
            loading={false} // TODO: Add loading state when backend is implemented
            hasUnsavedChanges={hasUnsavedLlmChanges}
          />
        );

      default:
        return null;
    }
  };

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
          onDismiss={dismissAllErrors}
        />

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            {getTabTitle('list')}
          </button>
          <button
            className={`modal-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            {getTabTitle('create')}
          </button>
          <button
            className={`modal-tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            {getTabTitle('config')}
          </button>
        </div>

        <div className="modal-tab-content">
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
};

export default BotManagementModal;