import { useState, useCallback } from 'react';
import { Message } from '../types';

interface UseMessagesReturn {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useMessages = (): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addMessage,
    clearMessages
  };
};