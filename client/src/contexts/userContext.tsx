import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
}

interface UserContextType {
  user: User | null;
  setUsername: (username: string) => void;
  setUserStatus: (status: User['status']) => void;
  isUsernameSet: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user from localStorage on app start
    const savedUser = localStorage.getItem('chatterbox-user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  }, []);

  const setUsername = (username: string) => {
    const userData: User = {
      id: user?.id || `user-${Date.now()}`,
      username: username.trim(),
      status: 'online'
    };
    
    setUser(userData);
    localStorage.setItem('chatterbox-user', JSON.stringify(userData));
  };

  const setUserStatus = (status: User['status']) => {
    if (user) {
      const updatedUser = { ...user, status };
      setUser(updatedUser);
      localStorage.setItem('chatterbox-user', JSON.stringify(updatedUser));
    }
  };

  const isUsernameSet = user !== null && user.username.length > 0;

  return (
    <UserContext.Provider value={{
      user,
      setUsername,
      setUserStatus,
      isUsernameSet
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};