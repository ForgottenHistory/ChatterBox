import { useState } from 'react';
import { Participant } from '../types';

export const useProfileModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);

  const showProfile = (user: Participant) => {
    setSelectedUser(user);
    setIsOpen(true);
  };

  const hideProfile = () => {
    setIsOpen(false);
    // Keep selectedUser until modal fully closes for smooth animation
    setTimeout(() => setSelectedUser(null), 200);
  };

  return {
    isOpen,
    selectedUser,
    showProfile,
    hideProfile
  };
};