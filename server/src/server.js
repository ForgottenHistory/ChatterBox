const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
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

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
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
        const botResponses = await botService.processMessage(data, data.room);
        
        // Send each bot response with a delay
        botResponses.forEach((response, index) => {
          setTimeout(() => {
            console.log('Bot response:', response);
            io.to(data.room).emit('receive_message', response);
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