import React, { useState } from 'react';
import { useUser, User } from '../contexts/userContext';
import AvatarSelector from './AvatarSelector';

interface UserSetupModalProps {
  isOpen: boolean;
}

const UserSetupModal: React.FC<UserSetupModalProps> = ({ isOpen }) => {
  const { user, setUsername, setUserAvatar } = useUser();
  const [currentStep, setCurrentStep] = useState<'username' | 'avatar'>('username');
  const [inputUsername, setInputUsername] = useState('');
  const [error, setError] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);

  const validateUsername = (username: string): string | null => {
    const trimmed = username.trim();
    
    if (trimmed.length < 2) {
      return 'Username must be at least 2 characters long';
    }
    
    if (trimmed.length > 20) {
      return 'Username must be less than 20 characters';
    }

    const validUsernameRegex = /^[a-zA-Z0-9\s_-]+$/;
    if (!validUsernameRegex.test(trimmed)) {
      return 'Username can only contain letters, numbers, spaces, underscores, and dashes';
    }

    return null;
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateUsername(inputUsername);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    
    // Create temporary user for avatar selection
    const now = new Date().toISOString();
    const tempUserData: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: inputUsername.trim(),
      avatar: '#5865F2', // default color
      avatarType: 'initials',
      status: 'online',
      joinedAt: now,
      lastActive: now
    };
    
    setTempUser(tempUserData);
    setCurrentStep('avatar');
  };

  const handleAvatarComplete = () => {
    if (tempUser) {
      // First set the username to create the user
      setUsername(tempUser.username);
      
      // Then set the avatar if it's not the default
      if (tempUser.avatar !== '#5865F2' || tempUser.avatarType !== 'initials') {
        setTimeout(() => {
          setUserAvatar(tempUser.avatar, tempUser.avatarType);
        }, 100);
      }
    }
  };

  const handleAvatarChange = (avatar: string, type: User['avatarType']) => {
    if (tempUser) {
      setTempUser({
        ...tempUser,
        avatar,
        avatarType: type
      });
    }
  };

  const handleSkipAvatar = () => {
    handleAvatarComplete();
  };

  const handleBackToUsername = () => {
    setCurrentStep('username');
    setTempUser(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleUsernameSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content user-setup-modal">
        {currentStep === 'username' ? (
          <>
            <div className="modal-header">
              <h2>Welcome to ChatterBox!</h2>
              <p>Choose your username to get started</p>
            </div>
            
            <form onSubmit={handleUsernameSubmit} className="username-form">
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your username..."
                  className={`username-input ${error ? 'error' : ''}`}
                  maxLength={20}
                  autoFocus
                />
                {error && <span className="error-message">{error}</span>}
              </div>
              
              <div className="modal-actions">
                <button 
                  type="submit" 
                  className="confirm-button"
                  disabled={!inputUsername.trim()}
                >
                  Continue
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h2>Choose Your Avatar</h2>
              <p>Personalize your profile with an avatar</p>
            </div>

            {tempUser && (
              <AvatarSelector 
                currentUser={tempUser}
                onAvatarChange={handleAvatarChange}
              />
            )}

            <div className="modal-actions">
              <button 
                className="secondary-button"
                onClick={handleBackToUsername}
              >
                Back
              </button>
              <button 
                className="secondary-button"
                onClick={handleSkipAvatar}
              >
                Skip
              </button>
              <button 
                className="confirm-button"
                onClick={handleAvatarComplete}
              >
                Complete Setup
              </button>
            </div>
          </>
        )}
        
        <div className="modal-footer">
          <p>
            {currentStep === 'username' 
              ? "You can change your username and avatar later in settings"
              : "You can always change your avatar later"
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserSetupModal;