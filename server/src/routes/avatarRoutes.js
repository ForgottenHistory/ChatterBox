const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userid_timestamp.extension
    const userId = req.body.userId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${userId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Upload avatar endpoint
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;
    
    if (!userId) {
      // Clean up uploaded file if no userId
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Delete old avatar files for this user
    const files = fs.readdirSync(uploadsDir);
    const userFiles = files.filter(file => file.startsWith(`${userId}_`));
    
    userFiles.forEach(file => {
      if (file !== req.file.filename) {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      }
    });

    // Return the URL for the uploaded file
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    res.json({
      success: true,
      avatarUrl: `http://localhost:${process.env.PORT || 5000}${avatarUrl}`,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Delete avatar endpoint
router.delete('/delete-avatar/:userId/:filename', (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    // Verify the filename belongs to the user (security check)
    if (!filename.startsWith(`${userId}_`)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Avatar deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Avatar deletion error:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

module.exports = router;