import React, { useState, useRef } from 'react';
import { useUser } from '../contexts/userContext';
import UserAvatar from './UserAvatar';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadError(null);

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

  if (step === 'username') {
    return (
      <Modal
        isOpen={true}
        title="Create Your Profile"
        subtitle="Choose a username to get started"
        size="small"
      >
        <form onSubmit={handleUsernameSubmit} className="setup-form">
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username..."
            error={!!error}
            errorMessage={error}
            maxLength={20}
            autoFocus
            label="Username"
          />

          <Button
            type="submit"
            variant="primary"
            size="large"
            disabled={!username.trim()}
          >
            Continue
          </Button>
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      title="Choose Your Avatar"
      subtitle="Upload a picture or keep your colorful initials"
      size="medium"
    >
      <div className="avatar-setup-content">
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
          
          <Button
            variant="secondary"
            size="medium"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="upload-button-spacing"
          >
            {isUploading ? 'Uploading...' : 'Upload Custom Image'}
          </Button>
          
          <p className="upload-info">Max 2MB • JPG, PNG, GIF, WebP</p>
          <p className="avatar-info">You can always change this later in settings</p>
        </div>

        <div className="setup-actions">
          <Button
            variant="secondary"
            size="medium"
            onClick={() => setStep('username')}
          >
            Back
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={completeSetup}
          >
            Complete Setup
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserSetup;