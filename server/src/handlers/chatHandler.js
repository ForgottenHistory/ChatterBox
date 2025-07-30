const botService = require('../services/botService');

class ChatHandler {
  constructor(io) {
    this.io = io;
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

    // Broadcast user message to all users in the room
    this.io.to(data.room).emit('receive_message', data);

    // Process message for bot responses (only if it's not from a bot)
    if (!data.isBot) {
      console.log('Processing message for bot responses...');
      await this.processBotResponses(data);
    } else {
      console.log('Skipping bot processing - message is from a bot');
    }
  }

  async processBotResponses(data) {
    try {
      console.log('Creating message object for bots...');

      // Create a message object that the bot service expects
      const messageForBots = {
        content: data.message, // Use 'message' field from the legacy format
        author: {
          id: data.userId,
          username: data.username,
          type: 'user' // Specify this is a user message
        },
        timestamp: new Date().toISOString(),
        room: data.room
      };

      console.log('Message for bots:', messageForBots);

      const botResponses = await botService.processMessage(messageForBots, data.room);
      console.log('Bot responses received:', botResponses.length);

      // Send each bot response with a delay to simulate typing
      botResponses.forEach((response, index) => {
        console.log(`Scheduling bot response ${index + 1}:`, response.author.username);
        setTimeout(() => {
          this.sendBotResponse(response, data.room);
        }, (index + 1) * 1500); // 1.5 second delay between bot responses
      });
    } catch (error) {
      console.error('Error processing bot responses:', error);
    }
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