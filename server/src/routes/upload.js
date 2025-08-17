import express from 'express'
import upload from '../middleware/upload.js'

const router = express.Router()

// Upload avatar
router.post('/avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Return the file URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`
    
    res.json({
      success: true,
      avatar: avatarUrl,
      filename: req.file.filename,
      size: req.file.size
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload avatar' })
  }
})

export default router