const QueueManager = require('./queueManager');
const OpenAI = require('openai');

class LLMQueueManager extends QueueManager {
    constructor(maxConcurrent = 1) {
        super(maxConcurrent, 200);

        // Initialize OpenAI client
        this.client = new OpenAI({
            baseURL: 'https://api.featherless.ai/v1',
            apiKey: process.env.FEATHERLESS_API_KEY,
        });

        // Track recent requests to prevent spam
        this.recentRequests = new Map();
        this.requestCooldown = 5000; // 5 seconds between requests from same bot

        console.log('LLMQueueManager initialized with debugging');
    }

    // Check for duplicate requests
    isDuplicateRequest(requestData) {
        const { botContext } = requestData;
        if (!botContext?.name) return false;

        const now = Date.now();
        const lastRequest = this.recentRequests.get(botContext.name);

        if (lastRequest && (now - lastRequest) < this.requestCooldown) {
            console.log(`Rate limiting bot ${botContext.name} - too frequent requests`);
            return true;
        }

        return false;
    }

    // Process an LLM request with detailed debugging
    async processRequest(requestData) {
        const { model, messages, parameters, botContext } = requestData;

        console.log(`Processing LLM request for ${botContext?.name || 'unknown'} using ${model}`);

        // Track this request
        if (botContext?.name) {
            this.recentRequests.set(botContext.name, Date.now());
        }

        try {
            // Validate request data
            if (!messages || messages.length === 0) {
                throw new Error('No messages provided for LLM request');
            }

            if (!model) {
                throw new Error('No model specified for LLM request');
            }

            // Debug: Log the request being sent
            console.log(`🔍 API Request Debug for ${botContext?.name}:`);
            console.log(`  Model: ${model}`);
            console.log(`  Messages: ${messages.length} messages`);
            console.log(`  Parameters:`, JSON.stringify(parameters, null, 2));
            
            // Log the FULL system prompt being sent
            if (messages.length > 0 && messages[0].role === 'system') {
                console.log(`🔍 FULL SYSTEM PROMPT for ${botContext?.name}:`);
                console.log('=====================================');
                console.log(messages[0].content);
                console.log('=====================================');
            }
            
            console.log(`  Last message content: "${messages[messages.length - 1]?.content?.substring(0, 100)}..."`);

            // Make API call with timeout
            const completion = await Promise.race([
                this.client.chat.completions.create({
                    model,
                    messages,
                    ...parameters
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                )
            ]);

            // Debug: Log the raw API response
            console.log(`🔍 API Response Debug for ${botContext?.name}:`);
            console.log(`  Full response keys:`, Object.keys(completion || {}));
            console.log(`  Choices length:`, completion?.choices?.length || 'undefined');
            
            if (completion?.choices && completion.choices.length > 0) {
                const choice = completion.choices[0];
                console.log(`  Choice 0 keys:`, Object.keys(choice || {}));
                console.log(`  Choice 0 message keys:`, Object.keys(choice?.message || {}));
                console.log(`  Choice 0 finish_reason:`, choice?.finish_reason);
                console.log(`  Choice 0 content length:`, choice?.message?.content?.length || 'undefined');
                console.log(`  Choice 0 content preview:`, choice?.message?.content?.substring(0, 100) || 'undefined');
            }

            // Validate response structure
            if (!completion) {
                throw new Error('No completion object returned from API');
            }

            if (!completion.choices) {
                throw new Error('No choices array in API response');
            }

            if (completion.choices.length === 0) {
                throw new Error('Empty choices array in API response');
            }

            const choice = completion.choices[0];
            if (!choice) {
                throw new Error('First choice is null/undefined');
            }

            // More flexible message validation
            let responseContent = null;

            if (choice.message && choice.message.content) {
                responseContent = choice.message.content;
            } else if (choice.text) {
                // Some APIs might return 'text' instead of 'message.content'
                responseContent = choice.text;
            } else if (choice.delta && choice.delta.content) {
                // Handle streaming-style responses
                responseContent = choice.delta.content;
            }

            if (!responseContent) {
                console.log(`🔍 Choice structure for ${botContext?.name}:`, JSON.stringify(choice, null, 2));
                throw new Error('No content found in API response choice');
            }

            if (typeof responseContent !== 'string') {
                console.log(`🔍 Response content type: ${typeof responseContent}`);
                responseContent = String(responseContent);
            }

            if (responseContent.trim().length === 0) {
                throw new Error('Empty response content from API');
            }

            console.log(`✓ LLM response received for ${botContext?.name}: "${responseContent.substring(0, 50)}..."`);

            return {
                success: true,
                content: responseContent.trim(),
                usage: completion.usage,
                model: completion.model
            };

        } catch (error) {
            console.error(`✗ LLM API error for ${botContext?.name}:`, error.message);

            // Debug: Log more details for API errors
            if (error.response) {
                console.log(`🔍 API Error Response for ${botContext?.name}:`);
                console.log(`  Status: ${error.response.status}`);
                console.log(`  Headers:`, error.response.headers);
                console.log(`  Data:`, error.response.data);
            } else if (error.request) {
                console.log(`🔍 API Request Error for ${botContext?.name}:`, 'No response received');
            }

            // Specific error handling
            if (error.message.includes('rate limit') || error.message.includes('429')) {
                console.error('API rate limit hit - will back off');
            } else if (error.message.includes('quota')) {
                console.error('API quota exceeded');
            } else if (error.message.includes('timeout')) {
                console.error('Request timeout - API may be slow');
            }

            return {
                success: false,
                error: error.message,
                fallbackContent: this.getFallbackResponse(botContext)
            };
        }
    }

    // Generate fallback response for failed requests
    getFallbackResponse(botContext) {
        if (botContext?.firstMessage && botContext.firstMessage.trim()) {
            return botContext.firstMessage.trim();
        }

        const fallbacks = [
            'Hi! How can I help?',
            'Hello there! What would you like to chat about?',
            'Hey! What\'s on your mind?',
            'Greetings! I\'m here and ready to talk.'
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Override enqueue to add better duplicate checking
    async enqueue(requestData, priority = 0) {
        if (this.isDuplicateRequest(requestData)) {
            const error = new Error(`Request from ${requestData.botContext?.name} blocked - too frequent`);
            return {
                success: false,
                error: error.message,
                fallbackContent: this.getFallbackResponse(requestData.botContext)
            };
        }

        return super.enqueue(requestData, priority);
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

    // Clean up old request tracking entries
    cleanupRecentRequests() {
        const now = Date.now();
        const cutoff = now - (this.requestCooldown * 2);

        for (const [botName, timestamp] of this.recentRequests.entries()) {
            if (timestamp < cutoff) {
                this.recentRequests.delete(botName);
            }
        }
    }

    // Test API connection
    async testConnection() {
        console.log('🔍 Testing API connection...');
        
        try {
            const testCompletion = await this.client.chat.completions.create({
                model: 'moonshotai/Kimi-K2-Instruct',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Say "Connection test successful"' }
                ],
                max_tokens: 50,
                temperature: 0.7
            });

            console.log('🔍 Test API Response:', JSON.stringify(testCompletion, null, 2));
            
            if (testCompletion?.choices?.[0]?.message?.content) {
                console.log('✓ API connection test successful');
                return true;
            } else {
                console.log('✗ API connection test failed - unexpected response structure');
                return false;
            }
        } catch (error) {
            console.error('✗ API connection test failed:', error.message);
            return false;
        }
    }

    // Get detailed status
    getDetailedStatus() {
        this.cleanupRecentRequests();
        const baseStatus = this.getStatus();

        return {
            ...baseStatus,
            configured: !!process.env.FEATHERLESS_API_KEY,
            provider: 'Featherless AI',
            recentRequests: this.recentRequests.size,
            requestCooldown: this.requestCooldown,
            queueMetrics: this.getMetrics()
        };
    }

    // Set request cooldown
    setRequestCooldown(cooldownMs) {
        this.requestCooldown = Math.max(1000, cooldownMs);
        console.log(`Request cooldown updated to ${this.requestCooldown}ms`);
    }
}

module.exports = LLMQueueManager;