import React, { useState, useRef } from 'react';
import { useUser } from '../contexts/userContext';
import UserAvatar from './UserAvatar';
import avatarService from '../services/avatarService';

const UserSetup: React.FC = () => {
  const { user, createUser, setUserAvatar, completeSetup } = useUser();
  const [step, setStep] = useState<'username' | 'avatar'>('username');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    createUser(username);
    setStep('avatar');
  };

  const handleAvatarComplete = () => {
    completeSetup();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadError(null);

    // Validate file
    const validation = avatarService.validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);

    try {
      const result = await avatarService.uploadAvatar(file, user.id);
      setUserAvatar(result.avatarUrl, 'uploaded');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleBackToUsername = () => {
    setStep('username');
  };

  if (step === 'username') {
    return (
      <div className="setup-overlay">
        <div className="setup-container">
          <div className="setup-header">
            <h2>Create Your Profile</h2>
            <p>Choose a username to get started</p>
          </div>

          <form onSubmit={handleUsernameSubmit} className="setup-form">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username..."
                className={`setup-input ${error ? 'error' : ''}`}
                maxLength={20}
                autoFocus
              />
              {error && <span className="error-message">{error}</span>}
            </div>

            <button 
              type="submit" 
              className="setup-button"
              disabled={!username.trim()}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Avatar step
  return (
    <div className="setup-overlay">
      <div className="setup-container avatar-step">
        <div className="setup-header">
          <h2>Choose Your Avatar</h2>
          <p>Upload a picture or keep your colorful initials</p>
        </div>

        <div className="avatar-preview">
          {user && (
            <UserAvatar 
              user={user} 
              size="extra-large" 
              showStatus={false} 
            />
          )}
        </div>

        <div className="avatar-options">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          
          {uploadError && (
            <div className="upload-error">
              {uploadError}
            </div>
          )}
          
          <button 
            className="upload-button"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Custom Image'}
          </button>
          
          <p className="upload-info">Max 2MB • JPG, PNG, GIF, WebP</p>
          <p className="avatar-info">You can always change this later in settings</p>
        </div>

        <div className="setup-actions">
          <button 
            className="setup-button secondary"
            onClick={handleBackToUsername}
          >
            Back
          </button>
          <button 
            className="setup-button"
            onClick={handleAvatarComplete}
          >
            Complete Setup
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSetup;