const OpenAI = require('openai');

class LLMService {
    constructor() {
        // Initialize OpenAI client with Featherless endpoint
        this.client = new OpenAI({
            baseURL: 'https://api.featherless.ai/v1',
            apiKey: process.env.FEATHERLESS_API_KEY,
        });

        this.model = 'moonshotai/Kimi-K2-Instruct';
        this.maxTokens = 512; // Keep responses short for chat

        console.log('LLM Service initialized with Featherless API');
    }

    // Generate a response for a bot given the context
    async generateResponse(botContext, userMessage, conversationHistory = []) {
        try {
            // Build the system prompt
            const systemPrompt = this.buildSystemPrompt(botContext);

            // Build conversation context (last few messages)
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Add recent conversation history (last 5 messages for context)
            const recentHistory = conversationHistory.slice(-5);
            recentHistory.forEach(msg => {
                messages.push({
                    role: msg.isBot ? 'assistant' : 'user',
                    content: `${msg.username}: ${msg.content}`
                });
            });

            // Add the current user message
            messages.push({
                role: 'user',
                content: `${userMessage.author.username}: ${userMessage.content}`
            });

            console.log(`Generating LLM response for bot: ${botContext.name}`);
            console.log('Messages sent to LLM:', messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + '...' })));

            const completion = await this.client.chat.completions.create({
                model: this.model,
                max_tokens: this.maxTokens,
                temperature: 0.8,
                messages: messages,
            });

            const response = completion.choices[0]?.message?.content;

            if (!response) {
                throw new Error('No response generated from LLM');
            }

            console.log(`LLM Response for ${botContext.name}:`, response.substring(0, 100) + '...');
            return response.trim();

        } catch (error) {
            console.error(`Error generating LLM response for ${botContext.name}:`, error);

            // Return a fallback response
            return this.getFallbackResponse(botContext);
        }
    }

    // Build system prompt for the bot
    buildSystemPrompt(botContext) {
        let prompt = `You are ${botContext.name}, an AI assistant in a Discord-like chat platform called ChatterBox.`;

        if (botContext.description) {
            prompt += `\n\nCharacter Description: ${botContext.description}`;
        }

        if (botContext.systemPrompt) {
            prompt += `\n\nAdditional Instructions: ${botContext.systemPrompt}`;
        }

        if (botContext.exampleMessages) {
            prompt += `\n\nExample conversation style:\n${botContext.exampleMessages}`;
        }

        prompt += `\n\nImportant guidelines:
- Keep responses conversational and under 200 characters
- Stay in character based on your description
- Respond naturally to the conversation
- Don't announce yourself or mention you're an AI unless relevant
- Be engaging and add to the conversation`;

        return prompt;
    }

    // Fallback response when LLM fails
    getFallbackResponse(botContext) {
        const fallbacks = [
            `Hi! I'm ${botContext.name}. How can I help?`,
            `Hello there! ${botContext.name} at your service.`,
            `Hey! What would you like to chat about?`,
            `Greetings! I'm here and ready to talk.`
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Check if the service is configured properly
    isConfigured() {
        return !!process.env.FEATHERLESS_API_KEY;
    }
}

module.exports = new LLMService();