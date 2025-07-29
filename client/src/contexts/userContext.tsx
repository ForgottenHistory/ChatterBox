import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  avatar: string;
  avatarType: 'initials' | 'uploaded' | 'generated';
  status: 'online' | 'away' | 'offline';
  joinedAt: string;
  lastActive: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  hasUser: boolean;
  isSetupComplete: boolean;
  createUser: (username: string) => void;
  completeSetup: () => void;
  setUserAvatar: (avatar: string, type: User['avatarType']) => void;
  setUserStatus: (status: User['status']) => void;
  updateLastActive: () => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Generate a random color for initials avatar
  const generateAvatarColor = (): string => {
    const colors = [
      '#5865F2', '#57F287', '#FEE75C', '#ED4245',
      '#7289DA', '#43B581', '#FAA61A', '#F04747',
      '#9C84EF', '#EB459E', '#00D9FF', '#FFA500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Initialize - check if user exists in localStorage
  useEffect(() => {
    const initializeUser = async () => {
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const savedUser = localStorage.getItem('chatterbox-user');
        const savedSetupComplete = localStorage.getItem('chatterbox-setup-complete');
        
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsSetupComplete(savedSetupComplete === 'true');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('chatterbox-user');
        localStorage.removeItem('chatterbox-setup-complete');
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Save user to localStorage whenever user changes
  useEffect(() => {
    if (user && !isLoading) {
      localStorage.setItem('chatterbox-user', JSON.stringify(user));
    }
  }, [user, isLoading]);

  // Save setup completion state
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('chatterbox-setup-complete', isSetupComplete.toString());
    }
  }, [isSetupComplete, isLoading]);

  const createUser = (username: string) => {
    const now = new Date().toISOString();
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: username.trim(),
      avatar: generateAvatarColor(),
      avatarType: 'initials',
      status: 'online',
      joinedAt: now,
      lastActive: now
    };
    setUser(newUser);
  };

  const setUserAvatar = (avatar: string, type: User['avatarType']) => {
    if (user) {
      setUser(prev => prev ? {
        ...prev,
        avatar,
        avatarType: type,
        lastActive: new Date().toISOString()
      } : null);
    }
  };

  const setUserStatus = (status: User['status']) => {
    if (user) {
      setUser(prev => prev ? {
        ...prev,
        status,
        lastActive: new Date().toISOString()
      } : null);
    }
  };

  const updateLastActive = () => {
    if (user) {
      setUser(prev => prev ? {
        ...prev,
        lastActive: new Date().toISOString()
      } : null);
    }
  };

  const completeSetup = () => {
    setIsSetupComplete(true);
  };

  const clearUser = () => {
    setUser(null);
    setIsSetupComplete(false);
    localStorage.removeItem('chatterbox-user');
    localStorage.removeItem('chatterbox-setup-complete');
  };

  const hasUser = user !== null && isSetupComplete;

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      hasUser,
      isSetupComplete,
      createUser,
      completeSetup,
      setUserAvatar,
      setUserStatus,
      updateLastActive,
      clearUser
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