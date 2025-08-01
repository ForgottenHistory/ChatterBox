const eventBus = require('../services/eventBus');

class ChatHandler {
  constructor(io) {
    this.io = io;
    this.setupEventListeners();
    console.log('ChatHandler initialized with event-driven architecture');
  }

  setupEventListeners() {
    // Listen for bot responses to send them
    eventBus.onBotResponseGenerated((response) => {
      this.sendBotResponse(response, response.room);
    });

    // Listen for typing indicators
    eventBus.onTypingIndicator((data) => {
      this.sendTypingIndicator(data.bot, data.room, data.isTyping);
    });
  }

  handleConnection(socket) {
    console.log('User connected:', socket.id);

    // Handle joining a room
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      try {
        await this.handleMessage(socket, data);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  }

  async handleMessage(socket, data) {
    console.log('Message received:', data);

    // Emit activity update event
    eventBus.emitActivityUpdate();

    // Broadcast user message to all users in the room
    this.io.to(data.room).emit('receive_message', data);

    // Only process for bot responses if message is from a human user
    if (!data.isBot) {
      console.log('Emitting message for bot processing...');
      
      // Create message object and emit event
      const messageForBots = {
        content: data.message,
        author: {
          id: data.userId,
          username: data.username,
          type: 'user'
        },
        timestamp: new Date().toISOString(),
        room: data.room
      };

      // Let other services handle the bot processing
      eventBus.emitMessageReceived(messageForBots);
    } else {
      console.log('Skipping bot processing - message is from a bot');
    }
  }

  sendTypingIndicator(bot, room, isTyping) {
    const typingData = {
      userId: bot.id,
      username: bot.username,
      isTyping: isTyping,
      room: room,
      isBot: true,
      userAvatar: bot.avatar,
      userAvatarType: bot.avatarType
    };

    this.io.to(room).emit('typing_indicator', typingData);
  }

  sendBotResponse(response, room) {
    console.log('Sending bot response:', response.author.username, '-', response.content);

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

    this.io.to(room).emit('receive_message', legacyResponse);
  }
}

module.exports = ChatHandler;