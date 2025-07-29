class AvatarService {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.SERVER_URL 
      : 'http://localhost:5000';
  }

  // Upload avatar file
  async uploadAvatar(file, userId) {
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', userId);

    try {
      const response = await fetch(`${this.baseUrl}/api/upload-avatar`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  }

  // Delete avatar file
  async deleteAvatar(userId, filename) {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete-avatar/${userId}/${filename}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Avatar deletion error:', error);
      throw error;
    }
  }

  // Extract filename from avatar URL
  getFilenameFromUrl(avatarUrl) {
    if (!avatarUrl || typeof avatarUrl !== 'string') return null;
    
    const match = avatarUrl.match(/\/uploads\/avatars\/(.+)$/);
    return match ? match[1] : null;
  }

  // Check if URL is a server-hosted avatar
  isServerAvatar(avatarUrl) {
    return avatarUrl && avatarUrl.includes('/uploads/avatars/');
  }
}

module.exports = new AvatarService();