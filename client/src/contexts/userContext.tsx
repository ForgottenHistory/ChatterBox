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
  setUsername: (username: string) => void;
  setUserAvatar: (avatar: string, type: User['avatarType']) => void;
  setUserStatus: (status: User['status']) => void;
  updateLastActive: () => void;
  isUsernameSet: boolean;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate a random color for initials avatar
  const generateAvatarColor = (): string => {
    const colors = [
      '#5865F2', '#57F287', '#FEE75C', '#ED4245',
      '#7289DA', '#43B581', '#FAA61A', '#F04747',
      '#9C84EF', '#EB459E', '#00D9FF', '#FFA500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Initialize user data on app start
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Simulate minimum loading time for smooth UX
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1000));
        
        const savedUser = localStorage.getItem('chatterbox-user');
        
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          
          // Migrate old user data if needed
          if (!userData.avatarType) {
            userData.avatarType = 'initials';
            userData.avatar = userData.avatar || generateAvatarColor();
            userData.joinedAt = userData.joinedAt || new Date().toISOString();
            userData.lastActive = new Date().toISOString();
          }
          
          await minLoadingTime;
          setUser(userData);
        } else {
          await minLoadingTime;
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('chatterbox-user');
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

  const setUsername = (username: string) => {
    const trimmedUsername = username.trim();
    const now = new Date().toISOString();
    
    if (user) {
      // Update existing user
      setUser(prev => prev ? {
        ...prev,
        username: trimmedUsername,
        lastActive: now
      } : null);
    } else {
      // Create new user
      const userData: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: trimmedUsername,
        avatar: generateAvatarColor(),
        avatarType: 'initials',
        status: 'online',
        joinedAt: now,
        lastActive: now
      };
      setUser(userData);
    }
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

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem('chatterbox-user');
  };

  const isUsernameSet = user !== null && user.username.length > 0;

  return (
    <UserContext.Provider value={{
      user,
      isLoading,
      setUsername,
      setUserAvatar,
      setUserStatus,
      updateLastActive,
      isUsernameSet,
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