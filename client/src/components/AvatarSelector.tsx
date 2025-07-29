import React, { useState, useRef } from 'react';
import { useUser, User } from '../contexts/userContext';
import UserAvatar from './UserAvatar';
import avatarService from '../services/avatarService';

interface AvatarSelectorProps {
  currentUser: User;
  onAvatarChange?: (avatar: string, type: User['avatarType']) => void;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({ currentUser, onAvatarChange }) => {
  const { user, setUserAvatar } = useUser();
  const [selectedType, setSelectedType] = useState<User['avatarType']>(currentUser.avatarType);
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    currentUser.avatarType === 'uploaded' ? currentUser.avatar : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file
    const validation = avatarService.validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);

    try {
      // Use the actual user ID from context, fallback to currentUser
      const userId = user?.id || currentUser.id;
      console.log('Uploading for user ID:', userId); // Debug log
      
      // Upload to server
      const result = await avatarService.uploadAvatar(file, userId);
      
      console.log('Avatar upload result:', result); // Debug log
      
      setUploadedImage(result.avatarUrl);
      setSelectedType('uploaded');
      setUserAvatar(result.avatarUrl, 'uploaded');
      onAvatarChange?.(result.avatarUrl, 'uploaded');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (uploadedImage && selectedType === 'uploaded') {
      try {
        // Extract filename from URL
        const filename = avatarService.getFilenameFromUrl(uploadedImage);
        const userId = user?.id || currentUser.id;
        
        if (filename && avatarService.isServerAvatar(uploadedImage)) {
          // Delete from server
          await avatarService.deleteAvatar(userId, filename);
        }
      } catch (error) {
        console.error('Error deleting avatar from server:', error);
        // Continue with local removal even if server deletion fails
      }
    }

    setUploadedImage(null);
    setSelectedType('initials');
    setUploadError(null);
    
    // Reset to default initials avatar
    setUserAvatar(currentUser.avatar, 'initials');
    onAvatarChange?.(currentUser.avatar, 'initials');
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const previewUser: User = {
    ...currentUser,
    avatar: selectedType === 'uploaded' && uploadedImage ? uploadedImage : currentUser.avatar,
    avatarType: selectedType
  };

  return (
    <div className="avatar-selector">
      <div className="avatar-preview-section">
        <h4>Profile Picture</h4>
        <div className="avatar-display">
          <UserAvatar user={previewUser} size="extra-large" showStatus={false} />
        </div>
      </div>

      <div className="avatar-controls">
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
        
        {selectedType === 'uploaded' ? (
          <div className="upload-actions">
            <button 
              className="upload-btn secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Change Image'}
            </button>
            <button 
              className="remove-btn"
              onClick={handleRemoveAvatar}
              disabled={isUploading}
            >
              Remove
            </button>
          </div>
        ) : (
          <button 
            className="upload-btn primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        )}
        
        <p className="upload-info">Max 2MB • JPG, PNG, GIF, WebP</p>
        {selectedType === 'initials' && (
          <p className="initials-info">Or keep your colorful initials</p>
        )}
      </div>
    </div>
  );
};

export default AvatarSelector;