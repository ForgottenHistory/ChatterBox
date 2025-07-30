const QueueManager = require('./queueManager');
const OpenAI = require('openai');

class LLMQueueManager extends QueueManager {
    constructor(maxConcurrent = 1) {
        super(maxConcurrent, 200); // Larger queue for LLM requests

        // Initialize OpenAI client
        this.client = new OpenAI({
            baseURL: 'https://api.featherless.ai/v1',
            apiKey: process.env.FEATHERLESS_API_KEY,
        });

        console.log('LLMQueueManager initialized');
    }

    // Process an LLM request
    async processRequest(requestData) {
        const { model, messages, parameters, botContext } = requestData;

        console.log(`Processing LLM request for ${botContext?.name || 'unknown'} using ${model}`);

        try {
            const completion = await this.client.chat.completions.create({
                model,
                messages,
                ...parameters
            });

            const response = completion.choices[0]?.message?.content;

            if (!response) {
                throw new Error('No response content from API');
            }

            return {
                success: true,
                content: response.trim(),
                usage: completion.usage,
                model: completion.model
            };
        } catch (error) {
            console.error('LLM API error:', error);

            return {
                success: false,
                error: error.message,
                fallbackContent: this.getFallbackResponse(botContext)
            };
        }
    }

    // Generate fallback response for failed requests
    getFallbackResponse(botContext) {
        if (botContext?.firstMessage) {
            return botContext.firstMessage;
        }

        const fallbacks = [
            'Hi! How can I help?',
            'Hello there! What would you like to chat about?',
            'Hey! What\'s on your mind?',
            'Greetings! I\'m here and ready to talk.'
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Queue an LLM request with priority
    async queueLLMRequest(model, messages, parameters, botContext, priority = 0) {
        const requestData = {
            model,
            messages,
            parameters,
            botContext
        };

        return this.enqueue(requestData, priority);
    }

    // High priority request (for direct mentions, etc.)
    async queueHighPriorityRequest(model, messages, parameters, botContext) {
        return this.queueLLMRequest(model, messages, parameters, botContext, 10);
    }

    // Normal priority request
    async queueNormalRequest(model, messages, parameters, botContext) {
        return this.queueLLMRequest(model, messages, parameters, botContext, 0);
    }

    // Low priority request (random responses, etc.)
    async queueLowPriorityRequest(model, messages, parameters, botContext) {
        return this.queueLLMRequest(model, messages, parameters, botContext, -10);
    }

    // Update connection limit based on model constraints
    updateModelConstraints(modelId, maxConnections) {
        console.log(`Updating connection limit for model ${modelId}: ${maxConnections}`);
        this.setMaxConcurrent(maxConnections);
    }

    // Get detailed status including API-specific info
    getDetailedStatus() {
        const baseStatus = this.getStatus();

        return {
            ...baseStatus,
            configured: !!process.env.FEATHERLESS_API_KEY,
            provider: 'Featherless AI',
            queueMetrics: this.getMetrics()
        };
    }
}

module.exports = LLMQueueManager;