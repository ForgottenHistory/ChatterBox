import React, { useState, useRef } from 'react';
import { useUser, User } from '../contexts/userContext';
import UserAvatar from './UserAvatar';

interface AvatarSelectorProps {
  currentUser: User;
  onAvatarChange?: (avatar: string, type: User['avatarType']) => void;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({ currentUser, onAvatarChange }) => {
  const { setUserAvatar } = useUser();
  const [selectedType, setSelectedType] = useState<User['avatarType']>(currentUser.avatarType);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        setSelectedType('uploaded');
        setUserAvatar(result, 'uploaded');
        onAvatarChange?.(result, 'uploaded');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
      alert('Error uploading image. Please try again.');
    }
  };

  const handleRemoveAvatar = () => {
    setUploadedImage(null);
    setSelectedType('initials');
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
      <div className="avatar-preview">
        <h4>Profile Picture</h4>
        <UserAvatar user={previewUser} size="large" showStatus={false} />
      </div>

      <div className="avatar-options">
        <div className="option-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          
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
            <p className="initials-info">Or keep your colorful initials avatar</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;