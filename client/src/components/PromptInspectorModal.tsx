import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import LoadingState from './ui/LoadingState';
import { usePromptInspector } from '../hooks/usePromptInspector';

interface PromptInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMessage?: string;
}

const PromptInspectorModal: React.FC<PromptInspectorModalProps> = ({
  isOpen,
  onClose,
  currentMessage
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'history' | 'full'>('system');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  const {
    promptData,
    loading,
    error,
    selectedBotId,
    fetchPromptData,
    selectBot,
    clearData
  } = usePromptInspector();

  useEffect(() => {
    if (isOpen) {
      fetchPromptData(currentMessage);
    } else {
      clearData();
    }
  }, [isOpen, currentMessage]);

  const selectedBot = promptData?.find(bot => bot.botId === selectedBotId);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatConversationHistory = () => {
    if (!selectedBot) return '';
    return selectedBot.conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
  };

  const formatFullPrompt = () => {
    if (!selectedBot) return '';
    
    const sections = [];
    
    sections.push('=== SYSTEM PROMPT ===');
    sections.push(selectedBot.systemPrompt);
    
    if (selectedBot.conversationHistory.length > 0) {
      sections.push('\n=== CONVERSATION HISTORY ===');
      sections.push(formatConversationHistory());
    }
    
    if (selectedBot.currentMessage) {
      sections.push('\n=== CURRENT MESSAGE ===');
      sections.push(`user: ${selectedBot.currentMessage}`);
    }
    
    return sections.join('\n');
  };

  const renderBotSelector = () => {
    if (!promptData || promptData.length <= 1) return null;

    return (
      <div className="bot-selector">
        <label className="bot-selector-label">Select Bot:</label>
        <select
          value={selectedBotId || ''}
          onChange={(e) => selectBot(e.target.value)}
          className="bot-selector-dropdown"
        >
          {promptData.map(bot => (
            <option key={bot.botId} value={bot.botId}>
              {bot.botName}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderSystemPrompt = () => {
    if (!selectedBot) return null;

    return (
      <div className="prompt-section">
        <div className="prompt-section-header">
          <h4>System Prompt</h4>
          <div className="prompt-actions">
            <Button
              size="small"
              variant="secondary"
              onClick={() => copyToClipboard(selectedBot.systemPrompt, 'system')}
            >
              {copiedSection === 'system' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="prompt-content">
          <pre className="prompt-text">{selectedBot.systemPrompt}</pre>
        </div>
        <div className="prompt-stats">
          <span>Characters: {selectedBot.systemPrompt.length}</span>
          <span>Lines: {selectedBot.systemPrompt.split('\n').length}</span>
          {selectedBot.botContext.hasCustomSettings && (
            <span className="custom-settings-indicator">🔧 Custom Settings</span>
          )}
        </div>
      </div>
    );
  };

  const renderConversationHistory = () => {
    if (!selectedBot) return null;

    return (
      <div className="prompt-section">
        <div className="prompt-section-header">
          <h4>Conversation History ({selectedBot.conversationHistory.length} messages)</h4>
          <div className="prompt-actions">
            <Button
              size="small"
              variant="secondary"
              onClick={() => copyToClipboard(formatConversationHistory(), 'history')}
            >
              {copiedSection === 'history' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="prompt-content">
          {selectedBot.conversationHistory.length === 0 ? (
            <p className="empty-history">No conversation history</p>
          ) : (
            <div className="conversation-messages">
              {selectedBot.conversationHistory.map((msg, index) => (
                <div key={index} className={`conversation-message ${msg.role}`}>
                  <div className="message-role">{msg.role}:</div>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedBot.currentMessage && (
          <div className="current-message">
            <div className="current-message-header">
              <strong>Current Message:</strong>
            </div>
            <div className="current-message-content">
              user: {selectedBot.currentMessage}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFullPrompt = () => {
    if (!selectedBot) return null;

    const fullPrompt = formatFullPrompt();
    
    return (
      <div className="prompt-section">
        <div className="prompt-section-header">
          <h4>Complete Prompt</h4>
          <div className="prompt-actions">
            <Button
              size="small"
              variant="secondary"
              onClick={() => copyToClipboard(fullPrompt, 'full')}
            >
              {copiedSection === 'full' ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
        </div>
        <div className="prompt-content">
          <pre className="prompt-text">{fullPrompt}</pre>
        </div>
        <div className="prompt-stats">
          <span>Total Characters: {fullPrompt.length}</span>
          <span>Total Lines: {fullPrompt.split('\n').length}</span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingState message="Loading prompt data..." />;
    }

    if (error) {
      return (
        <div className="prompt-error">
          <p>Error loading prompt data: {error}</p>
          <Button onClick={() => fetchPromptData(currentMessage)}>
            Retry
          </Button>
        </div>
      );
    }

    if (!promptData || promptData.length === 0) {
      return (
        <div className="prompt-empty">
          <p>No active bots found</p>
        </div>
      );
    }

    return (
      <>
        {renderBotSelector()}
        
        <div className="prompt-tabs">
          <button
            className={`prompt-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            System Prompt
          </button>
          <button
            className={`prompt-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History ({selectedBot?.conversationHistory.length || 0})
          </button>
          <button
            className={`prompt-tab ${activeTab === 'full' ? 'active' : ''}`}
            onClick={() => setActiveTab('full')}
          >
            Full Prompt
          </button>
        </div>

        <div className="prompt-tab-content">
          {activeTab === 'system' && renderSystemPrompt()}
          {activeTab === 'history' && renderConversationHistory()}
          {activeTab === 'full' && renderFullPrompt()}
        </div>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prompt Inspector"
      subtitle={selectedBot ? `Analyzing prompt for ${selectedBot.botName}` : 'Analyzing AI prompts'}
      size="large"
      showCloseButton={true}
    >
      <div className="prompt-inspector">
        {renderContent()}
      </div>
    </Modal>
  );
};

export default PromptInspectorModal;