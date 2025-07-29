const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const botService = require('./services/botService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
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

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads/avatars', express.static(uploadsDir));

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Avatar upload endpoint
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
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
      avatarUrl: `http://localhost:${PORT}${avatarUrl}`,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Delete avatar endpoint
app.delete('/api/delete-avatar/:userId/:filename', (req, res) => {
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

// Get all bots
app.get('/api/bots', (req, res) => {
  res.json(botService.getAllBots());
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a room (for channels later)
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  // Handle chat messages
  socket.on('send_message', async (data) => {
    console.log('Message received:', data);
    
    // Broadcast user message to all users in the room
    io.to(data.room).emit('receive_message', data);

    // Process message for bot responses (only if it's not from a bot)
    if (!data.isBot) {
      try {
        // Create a message object that the bot service expects
        const messageForBots = {
          content: data.message, // Use 'message' field from the legacy format
          author: {
            id: data.userId,
            username: data.username
          }
        };
        
        const botResponses = await botService.processMessage(messageForBots, data.room);
        
        // Send each bot response with a delay
        botResponses.forEach((response, index) => {
          setTimeout(() => {
            console.log('Bot response:', response);
            
            // Convert new message format to legacy for socket
            const legacyResponse = {
              id: response.id,
              username: response.author.username,
              message: response.content,
              timestamp: new Date(response.timestamp).toLocaleTimeString(),
              isBot: true,
              userId: response.author.id,
              userAvatar: response.author.avatar,
              userAvatarType: response.author.avatarType,
              room: response.room
            };
            
            io.to(data.room).emit('receive_message', legacyResponse);
          }, index * 500); // Stagger multiple bot responses
        });
      } catch (error) {
        console.error('Error processing bot responses:', error);
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});