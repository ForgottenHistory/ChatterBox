class AvatarService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.REACT_APP_SERVER_URL || ''
      : 'http://localhost:5000';
  }

  // Upload avatar file to server
  async uploadAvatar(file: File, userId: string): Promise<{ avatarUrl: string; filename: string }> {
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

      const data = await response.json();
      return {
        avatarUrl: data.avatarUrl,
        filename: data.filename
      };
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  }

  // Delete avatar file from server
  async deleteAvatar(userId: string, filename: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete-avatar/${userId}/${filename}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Avatar deletion error:', error);
      throw error;
    }
  }

  // Extract filename from avatar URL
  getFilenameFromUrl(avatarUrl: string): string | null {
    if (!avatarUrl || typeof avatarUrl !== 'string') return null;
    
    const match = avatarUrl.match(/\/uploads\/avatars\/(.+)$/);
    return match ? match[1] : null;
  }

  // Check if URL is a server-hosted avatar
  isServerAvatar(avatarUrl: string): boolean {
    return Boolean(avatarUrl) && avatarUrl.includes('/uploads/avatars/');
  }

  // Validate file before upload
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return { valid: false, error: 'File size must be less than 2MB' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' };
    }

    return { valid: true };
  }
}

export default new AvatarService();