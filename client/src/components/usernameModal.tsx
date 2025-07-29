import React, { useState } from 'react';
import { useUser } from '../contexts/userContext';

interface UsernameModalProps {
  isOpen: boolean;
}

const UsernameModal: React.FC<UsernameModalProps> = ({ isOpen }) => {
  const { setUsername } = useUser();
  const [inputUsername, setInputUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputUsername.trim().length < 2) {
      setError('Username must be at least 2 characters long');
      return;
    }
    
    if (inputUsername.trim().length > 20) {
      setError('Username must be less than 20 characters');
      return;
    }

    // Check for valid characters (alphanumeric, spaces, underscores, dashes)
    const validUsernameRegex = /^[a-zA-Z0-9\s_-]+$/;
    if (!validUsernameRegex.test(inputUsername.trim())) {
      setError('Username can only contain letters, numbers, spaces, underscores, and dashes');
      return;
    }

    setError('');
    setUsername(inputUsername.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Welcome to ChatterBox!</h2>
          <p>Please choose a username to get started</p>
        </div>
        
        <form onSubmit={handleSubmit} className="username-form">
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
              Join Chat
            </button>
          </div>
        </form>
        
        <div className="modal-footer">
          <p>You can change your username later in settings</p>
        </div>
      </div>
    </div>
  );
};

export default UsernameModal;