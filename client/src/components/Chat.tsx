import React, { useState } from 'react';
import { useUser } from '../contexts/userContext';
import { Participant } from '../types';
import { useProfileModal } from '../hooks/useProfileModal';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';

import ChatHeader from './chat/ChatHeader';
import MessageList from './chat/MessageList';
import MessageInput from './chat/MessageInput';
import UserProfileModal from './UserProfileModal';
import PromptInspectorModal from './PromptInspectorModal';

const Chat: React.FC = () => {
  const { user, updateLastActive } = useUser();
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const { isOpen, selectedUser, showProfile, hideProfile } = useProfileModal();
  const { messages, addMessage } = useMessages();
  const { connected, sendMessage } = useSocket(addMessage);

  const handleSendMessage = (message: string) => {
    if (user) {
      sendMessage(message, user);
      updateLastActive();
    }
  };

  const handleUserClick = (messageUser: Participant) => {
    showProfile(messageUser);
  };

  const handleInspectPrompts = () => {
    setShowPromptInspector(true);
  };

  return (
    <>
      <div className="chat-container">
        <ChatHeader
          connected={connected}
          onInspectPrompts={handleInspectPrompts}
          roomName="general"
        />

        <MessageList
          messages={messages}
          onUserClick={handleUserClick}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!connected || !user}
        />
      </div>

      <UserProfileModal
        isOpen={isOpen}
        onClose={hideProfile}
        user={selectedUser}
      />

      <PromptInspectorModal
        isOpen={showPromptInspector}
        onClose={() => setShowPromptInspector(false)}
        currentMessage={undefined}
      />
    </>
  );
};

export default Chat;