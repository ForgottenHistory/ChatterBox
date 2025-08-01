const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import service registry
const { initializeServices, getService } = require('./services/serviceRegistry');

// Import routes
const healthRoutes = require('./routes/healthRoutes');
const botRoutes = require('./routes/botRoutes');
const avatarRoutes = require('./routes/avatarRoutes');
const llmRoutes = require('./routes/llmRoutes');
const promptRoutes = require('./routes/promptRoutes');

// Import socket handler
const ChatHandler = require('./handlers/chatHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Initialize all services with dependency injection
console.log('Initializing services...');
initializeServices();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
app.use('/uploads/avatars', express.static(uploadsDir));

// Routes
app.use('/api', avatarRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/prompts', promptRoutes);

// Socket.io handling with decoupled chat handler
const chatHandler = new ChatHandler(io);
io.on('connection', (socket) => {
  chatHandler.handleConnection(socket);
});

// Get conversation manager from service registry
const conversationManager = getService('conversationManager');

// Start automatic conversations (optional - can be controlled via API)
conversationManager.start(); // Uncomment to start automatically

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('All services initialized and ready');
});