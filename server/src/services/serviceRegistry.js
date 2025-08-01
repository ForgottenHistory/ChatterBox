const serviceContainer = require('./serviceContainer');

// Import all the classes (not instances)
const BotManager = require('../managers/botManager');
const ConversationHistory = require('./bot/conversationHistory');
const ResponseGenerator = require('./bot/responseGenerator');
const ResponseLogic = require('./bot/responseLogic');
const LLMSettingsManager = require('../managers/llmSettingsManager');
const ConversationManager = require('../managers/conversationManager');
const MessageProcessor = require('./messageProcessor');

function registerServices() {
    console.log('Registering services...');

    // Register core managers as singletons
    serviceContainer.register('botManager', () => new BotManager(), { 
        singleton: true 
    });

    serviceContainer.register('conversationHistory', () => new ConversationHistory(), { 
        singleton: true 
    });

    serviceContainer.register('responseLogic', () => new ResponseLogic(), { 
        singleton: true 
    });

    serviceContainer.register('llmSettingsManager', () => new LLMSettingsManager(), { 
        singleton: true 
    });

    // Register response generator with dependencies
    serviceContainer.register('responseGenerator', () => new ResponseGenerator(), { 
        singleton: true 
    });

    // Register conversation manager
    serviceContainer.register('conversationManager', () => {
        const manager = new ConversationManager();
        // Dependencies will be injected after all services are registered
        return manager;
    }, { 
        singleton: true 
    });

    // Register message processor with dependencies
    serviceContainer.register('messageProcessor', 
        (botManager, responseGenerator, responseLogic, conversationHistory) => {
            return new MessageProcessor(botManager, responseGenerator, responseLogic, conversationHistory);
        }, 
        { 
            singleton: true,
            dependencies: ['botManager', 'responseGenerator', 'responseLogic', 'conversationHistory']
        }
    );

    console.log('Services registered successfully');
}

function wireUpDependencies() {
    console.log('Wiring up service dependencies...');

    // Get conversation manager and inject its dependencies
    const conversationManager = serviceContainer.get('conversationManager');
    const botManager = serviceContainer.get('botManager');
    const responseGenerator = serviceContainer.get('responseGenerator');
    
    conversationManager.setDependencies(botManager, responseGenerator);

    console.log('Service dependencies wired up successfully');
}

function initializeServices() {
    registerServices();
    wireUpDependencies();
    
    // Initialize message processor (this will set up event listeners)
    serviceContainer.get('messageProcessor');
    
    console.log('All services initialized');
}

module.exports = {
    registerServices,
    wireUpDependencies,
    initializeServices,
    getService: (name) => serviceContainer.get(name)
};