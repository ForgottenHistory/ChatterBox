const EventEmitter = require('events');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Increase for multiple bots
        console.log('EventBus initialized');
    }

    // Emit message received event
    emitMessageReceived(message) {
        this.emit('message:received', message);
    }

    // Emit bot response generated event
    emitBotResponseGenerated(response) {
        this.emit('bot:response:generated', response);
    }

    // Emit activity update event
    emitActivityUpdate() {
        this.emit('activity:updated');
    }

    // Emit typing indicator event
    emitTypingIndicator(data) {
        this.emit('typing:indicator', data);
    }

    // Subscribe to message events
    onMessageReceived(callback) {
        this.on('message:received', callback);
    }

    // Subscribe to bot response events
    onBotResponseGenerated(callback) {
        this.on('bot:response:generated', callback);
    }

    // Subscribe to activity updates
    onActivityUpdate(callback) {
        this.on('activity:updated', callback);
    }

    // Subscribe to typing events
    onTypingIndicator(callback) {
        this.on('typing:indicator', callback);
    }

    // Remove all listeners (for cleanup)
    removeAllListeners(event) {
        super.removeAllListeners(event);
        console.log(`Removed all listeners for event: ${event || 'all'}`);
    }
}

module.exports = new EventBus();