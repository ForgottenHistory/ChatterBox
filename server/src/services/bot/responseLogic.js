class ResponseLogic {
    constructor() {
        this.randomResponseChance = 0.05; // 5% chance to randomly respond
        console.log('ResponseLogic initialized');
    }

    // Determine which bots should respond to a message
    shouldRespond(message, bots, mentionedBots = []) {
        console.log('Checking if LLM bots should respond to:', message.content || message.message);

        let respondingBots = [];

        // Add explicitly mentioned bots
        respondingBots = mentionedBots.filter(botId => {
            const bot = bots.find(b => b.id === botId);
            return bot && bot.status === 'online';
        }).map(botId => bots.find(b => b.id === botId));

        // Check for name mentions and other triggers
        const messageContent = (message.content || message.message || '').toLowerCase();

        for (const bot of bots) {
            if (bot.status !== 'online') continue;

            // Skip if already responding
            if (respondingBots.find(b => b.id === bot.id)) continue;

            // Check if bot name is mentioned
            if (this.isBotMentioned(bot, messageContent)) {
                respondingBots.push(bot);
                continue;
            }

            // Check for question patterns (bots respond to questions more often)
            if (this.isQuestion(messageContent) && Math.random() < 0.15) { // 15% chance for questions
                respondingBots.push(bot);
                continue;
            }

            // Random chance to join conversation
            if (Math.random() < this.randomResponseChance) {
                respondingBots.push(bot);
            }
        }

        console.log('LLM bots that will respond:', respondingBots.map(b => b.username));
        return respondingBots;
    }

    // Check if a bot is mentioned in the message
    isBotMentioned(bot, messageContent) {
        const botName = bot.username.toLowerCase();

        // Direct name mention
        if (messageContent.includes(botName)) {
            return true;
        }

        // @mention style
        if (messageContent.includes(`@${botName}`)) {
            return true;
        }

        // Check for partial name matches (for multi-word names)
        const nameWords = botName.split(' ');
        if (nameWords.length > 1) {
            return nameWords.some(word =>
                word.length > 2 && messageContent.includes(word)
            );
        }

        return false;
    }

    // Check if message is a question
    isQuestion(messageContent) {
        // Check for question words
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should'];
        const hasQuestionWord = questionWords.some(word => messageContent.includes(word));

        // Check for question mark
        const hasQuestionMark = messageContent.includes('?');

        return hasQuestionWord || hasQuestionMark;
    }

    // Set random response chance
    setRandomResponseChance(chance) {
        this.randomResponseChance = Math.max(0, Math.min(1, chance));
        console.log(`Random response chance set to: ${this.randomResponseChance * 100}%`);
    }

    // Check if too many bots are responding (to prevent spam)
    filterExcessiveResponses(respondingBots, maxBots = 2) {
        if (respondingBots.length <= maxBots) {
            return respondingBots;
        }

        console.log(`Limiting bot responses from ${respondingBots.length} to ${maxBots}`);

        // Randomly select bots to respond, but prefer explicitly mentioned ones
        const shuffled = [...respondingBots].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, maxBots);
    }
}

module.exports = ResponseLogic;