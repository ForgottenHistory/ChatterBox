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
  const [selectedColor, setSelectedColor] = useState(currentUser.avatar);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const predefinedColors = [
    '#5865F2', '#57F287', '#FEE75C', '#ED4245',
    '#7289DA', '#43B581', '#FAA61A', '#F04747',
    '#9C84EF', '#EB459E', '#00D9FF', '#FFA500',
    '#36393F', '#2F3136', '#8B4513', '#FF6347'
  ];

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setSelectedType('initials');
    const newAvatar = color;
    setUserAvatar(newAvatar, 'initials');
    onAvatarChange?.(newAvatar, 'initials');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        setSelectedType('uploaded');
        setUserAvatar(result, 'uploaded');
        onAvatarChange?.(result, 'uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRandomAvatar = async () => {
    try {
      // Using DiceBear API for generated avatars
      const styles = ['adventurer', 'avataaars', 'bottts', 'identicon', 'initials'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const seed = currentUser.username + Date.now();
      const avatarUrl = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${encodeURIComponent(seed)}`;
      
      setSelectedType('generated');
      setUserAvatar(avatarUrl, 'generated');
      onAvatarChange?.(avatarUrl, 'generated');
    } catch (error) {
      console.error('Error generating avatar:', error);
      // Fallback to a random color
      handleColorSelect('#' + Math.floor(Math.random()*16777215).toString(16));
    }
  };

  const previewUser: User = {
    ...currentUser,
    avatar: selectedType === 'uploaded' && uploadedImage ? uploadedImage : 
            selectedType === 'initials' ? selectedColor : currentUser.avatar,
    avatarType: selectedType
  };

  return (
    <div className="avatar-selector">
      <div className="avatar-preview">
        <h4>Preview</h4>
        <UserAvatar user={previewUser} size="large" showStatus={false} />
      </div>

      <div className="avatar-options">
        <div className="option-section">
          <h4>Color Avatar</h4>
          <div className="color-grid">
            {predefinedColors.map((color) => (
              <button
                key={color}
                className={`color-option ${selectedType === 'initials' && selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={`Select ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="option-section">
          <h4>Upload Image</h4>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button 
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Image
          </button>
          <p className="upload-info">Max 2MB • JPG, PNG, GIF, WebP</p>
        </div>

        <div className="option-section">
          <h4>Generated Avatar</h4>
          <button 
            className="generate-btn"
            onClick={generateRandomAvatar}
          >
            Generate Random
          </button>
          <p className="generate-info">Creates a unique avatar based on your username</p>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;