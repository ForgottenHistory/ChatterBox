import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface PromptData {
  systemPrompt: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
  currentMessage?: string;
  botName?: string;
}

interface PromptInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptData: PromptData | null;
}

const PromptInspectorModal: React.FC<PromptInspectorModalProps> = ({
  isOpen,
  onClose,
  promptData
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'history' | 'full'>('system');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!promptData) return null;

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
    return promptData.conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
  };

  const formatFullPrompt = () => {
    const sections = [];
    
    sections.push('=== SYSTEM PROMPT ===');
    sections.push(promptData.systemPrompt);
    
    if (promptData.conversationHistory.length > 0) {
      sections.push('\n=== CONVERSATION HISTORY ===');
      sections.push(formatConversationHistory());
    }
    
    if (promptData.currentMessage) {
      sections.push('\n=== CURRENT MESSAGE ===');
      sections.push(`user: ${promptData.currentMessage}`);
    }
    
    return sections.join('\n');
  };

  const renderSystemPrompt = () => (
    <div className="prompt-section">
      <div className="prompt-section-header">
        <h4>System Prompt</h4>
        <div className="prompt-actions">
          <Button
            size="small"
            variant="secondary"
            onClick={() => copyToClipboard(promptData.systemPrompt, 'system')}
          >
            {copiedSection === 'system' ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
      <div className="prompt-content">
        <pre className="prompt-text">{promptData.systemPrompt}</pre>
      </div>
      <div className="prompt-stats">
        <span>Characters: {promptData.systemPrompt.length}</span>
        <span>Lines: {promptData.systemPrompt.split('\n').length}</span>
      </div>
    </div>
  );

  const renderConversationHistory = () => (
    <div className="prompt-section">
      <div className="prompt-section-header">
        <h4>Conversation History ({promptData.conversationHistory.length} messages)</h4>
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
        {promptData.conversationHistory.length === 0 ? (
          <p className="empty-history">No conversation history</p>
        ) : (
          <div className="conversation-messages">
            {promptData.conversationHistory.map((msg, index) => (
              <div key={index} className={`conversation-message ${msg.role}`}>
                <div className="message-role">{msg.role}:</div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {promptData.currentMessage && (
        <div className="current-message">
          <div className="current-message-header">
            <strong>Current Message:</strong>
          </div>
          <div className="current-message-content">
            user: {promptData.currentMessage}
          </div>
        </div>
      )}
    </div>
  );

  const renderFullPrompt = () => {
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'system':
        return renderSystemPrompt();
      case 'history':
        return renderConversationHistory();
      case 'full':
        return renderFullPrompt();
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prompt Inspector"
      subtitle={promptData.botName ? `Analyzing prompt for ${promptData.botName}` : 'Analyzing AI prompt'}
      size="large"
      showCloseButton={true}
    >
      <div className="prompt-inspector">
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
            History ({promptData.conversationHistory.length})
          </button>
          <button
            className={`prompt-tab ${activeTab === 'full' ? 'active' : ''}`}
            onClick={() => setActiveTab('full')}
          >
            Full Prompt
          </button>
        </div>

        <div className="prompt-tab-content">
          {renderTabContent()}
        </div>
      </div>
    </Modal>
  );
};

export default PromptInspectorModal;