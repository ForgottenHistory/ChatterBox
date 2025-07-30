import React, { useState } from 'react';
import { useUser } from '../contexts/userContext';
import UserAvatar from './UserAvatar';
import AvatarSelector from './AvatarSelector';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import { FormRow } from './ui/Form';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user, setUserAvatar, updateUsername } = useUser();
    const [activeTab, setActiveTab] = useState<'profile' | 'avatar'>('profile');
    const [username, setUsername] = useState(user?.username || '');
    const [error, setError] = useState('');

    if (!user) return null;

    const validateUsername = (username: string): string | null => {
        const trimmed = username.trim();
        if (trimmed.length < 2) return 'Username must be at least 2 characters long';
        if (trimmed.length > 20) return 'Username must be less than 20 characters';
        if (!/^[a-zA-Z0-9\s_-]+$/.test(trimmed)) {
            return 'Username can only contain letters, numbers, spaces, underscores, and dashes';
        }
        return null;
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
        if (error) setError('');
    };

    const handleSaveProfile = () => {
        const validationError = validateUsername(username);
        if (validationError) {
            setError(validationError);
            return;
        }
        updateUsername(username);
        setError('');
        onClose();
    };

    const handleAvatarChange = (avatar: string, type: typeof user.avatarType) => {
        setUserAvatar(avatar, type);
    };

    const tabs = [
        { id: 'profile' as const, label: 'Profile' },
        { id: 'avatar' as const, label: 'Avatar' }
    ];

    const renderTabContent = () => {
        if (activeTab === 'profile') {
            return (
                <div className="settings-tab-content">
                    <div className="profile-preview">
                        <UserAvatar user={user} size="large" showStatus={false} />
                        <div className="profile-info">
                            <h4>{user.username}</h4>
                            <p className="user-id">ID: {user.id}</p>
                            <p className="join-date">
                                Joined: {new Date(user.joinedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="profile-form">
                        <FormRow>
                            <Input
                                id="settings-username"
                                type="text"
                                value={username}
                                onChange={handleUsernameChange}
                                placeholder="Enter your username..."
                                error={!!error}
                                errorMessage={error}
                                maxLength={20}
                                label="Username"
                            />
                        </FormRow>
                    </div>

                    <div className="settings-actions">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={handleSaveProfile}>Save Changes</Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="settings-tab-content">
                <AvatarSelector
                    currentUser={user}
                    onAvatarChange={handleAvatarChange}
                />
                <div className="settings-actions">
                    <Button variant="primary" onClick={onClose}>Done</Button>
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="User Settings"
            subtitle="Manage your profile and preferences"
            size="medium"
            showCloseButton={true}
        >
            <div className="settings-modal">
                <div className="settings-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {renderTabContent()}
            </div>
        </Modal>
    );
};

export default UserSettingsModal;