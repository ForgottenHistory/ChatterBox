const botService = require('../services/botService');

class ChatHandler {
  constructor(io) {
    this.io = io;
    this.conversationManager = null; // Will be set from server.js
  }

  // Set conversation manager reference
  setConversationManager(conversationManager) {
    this.conversationManager = conversationManager;
    console.log('ConversationManager reference set in ChatHandler');
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

    // Update conversation manager activity tracker
    if (this.conversationManager) {
      this.conversationManager.updateLastActivity();
    }

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
        content: data.message,
        author: {
          id: data.userId,
          username: data.username,
          type: 'user'
        },
        timestamp: new Date().toISOString(),
        room: data.room
      };

      console.log('Message for bots:', messageForBots);

      // Get list of bots that will respond
      const respondingBots = botService.shouldRespond(messageForBots);
      
      if (respondingBots.length === 0) {
        console.log('No bots will respond');
        return;
      }

      // Send typing indicators for responding bots
      respondingBots.forEach((bot, index) => {
        setTimeout(() => {
          this.sendTypingIndicator(bot, data.room, true);
        }, index * 200); // Stagger the typing indicators slightly
      });

      // Generate bot responses
      const botResponses = await botService.processMessage(messageForBots, data.room);
      console.log('Bot responses received:', botResponses.length);

      // Send each bot response with proper timing
      botResponses.forEach((response, index) => {
        console.log(`Scheduling bot response ${index + 1}:`, response.author.username);
        
        setTimeout(() => {
          // Stop typing indicator
          this.sendTypingIndicator(response.author, data.room, false);
          
          // Send the actual response after a brief pause
          setTimeout(() => {
            this.sendBotResponse(response, data.room);
            
            // Update activity tracker after bot responses
            if (this.conversationManager) {
              this.conversationManager.updateLastActivity();
            }
          }, 300);
        }, (index + 1) * 1500);
      });

    } catch (error) {
      console.error('Error processing bot responses:', error);
    }
  }

  sendTypingIndicator(bot, room, isTyping) {
    console.log(`${isTyping ? 'Starting' : 'Stopping'} typing indicator for ${bot.username}`);
    
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