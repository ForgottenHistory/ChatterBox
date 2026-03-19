import { llmService } from './services/llmService';
import { llmLogService } from './services/llmLogService';
import { personaService } from './services/personaService';
import { lorebookService } from './services/lorebookService';
import { logger } from './utils/logger';
import type { Message, Character, LlmSettings } from './db/schema';
import fs from 'fs/promises';
import path from 'path';

/**
 * Default system prompt used when file doesn't exist
 */
const DEFAULT_SYSTEM_PROMPT = `You are {{char}}, chatting in a group text channel with {{user}} and others. Write like a real person texting.

{{description}}

RULES:
- NO asterisks, NO actions, NO roleplay formatting, NO narration
- NO *does something*, NO describing physical movements or expressions
- Just type words like a real person in a Discord chat
- Show personality through your words, not through described actions
- Keep messages concise - 1-3 sentences is typical, occasionally longer if you have something to say
- Use casual language, contractions, and natural texting style
- 0-2 emojis max per message (most have none)
- React to what was actually said, don't monologue
- You can use slang, abbreviations, and informal grammar
- Be curious - ask questions, engage with what others say
- Stay true to your personality and knowledge but express it through conversation, not performance
- ONLY write your own messages as {{char}}. NEVER write messages for other people
- Do NOT prefix your messages with your name - just write the message content directly
- Focus on ONE thing - respond to one person or one topic at a time, not everyone at once
- You don't need to acknowledge every person in the chat. Real people focus on what catches their attention`;

const DEFAULT_IMPERSONATE_PROMPT = `Write the next message as {{user}} in this roleplay chat with {{char}}.

Stay in character as {{user}}. Write a natural response that fits the conversation flow.`;

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');
const SYSTEM_PROMPT_FILE = path.join(PROMPTS_DIR, 'system.txt');
const IMPERSONATE_PROMPT_FILE = path.join(PROMPTS_DIR, 'impersonate.txt');

/**
 * Load system prompt from file
 */
async function loadSystemPromptFromFile(): Promise<string> {
	try {
		return await fs.readFile(SYSTEM_PROMPT_FILE, 'utf-8');
	} catch (error) {
		// File doesn't exist, return default
		return DEFAULT_SYSTEM_PROMPT;
	}
}

/**
 * Load impersonate prompt from file
 */
async function loadImpersonatePromptFromFile(): Promise<string> {
	try {
		return await fs.readFile(IMPERSONATE_PROMPT_FILE, 'utf-8');
	} catch (error) {
		// File doesn't exist, return default
		return DEFAULT_IMPERSONATE_PROMPT;
	}
}

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(
	template: string,
	variables: {
		char: string;
		user: string;
		description: string;
	}
): string {
	return template
		.replace(/\{\{char\}\}/g, variables.char)
		.replace(/\{\{user\}\}/g, variables.user)
		.replace(/\{\{description\}\}/g, variables.description);
}

interface ChatCompletionResult {
	content: string;
	reasoning: string | null;
}

/**
 * Generate a chat completion for a character conversation
 * @param conversationHistory - Array of previous messages in the conversation
 * @param character - Character card data
 * @param settings - User's LLM settings
 * @param messageType - Type of message for logging ('chat', 'regenerate', 'swipe')
 * @returns Generated assistant message content and reasoning
 */
export async function generateChatCompletion(
	conversationHistory: Message[],
	character: Character,
	settings: LlmSettings,
	messageType: string = 'chat',
	options?: { useNamePrimer?: boolean }
): Promise<ChatCompletionResult> {
	// Get active user info (persona or default profile)
	const userInfo = await personaService.getActiveUserInfo(settings.userId);
	const userName = userInfo.name;

	// Load system prompt from file
	const basePrompt = await loadSystemPromptFromFile();

	// Prepare template variables
	const templateVariables = {
		char: character.name || 'Character',
		user: userName,
		description: character.description || ''
	};

	// Replace variables in template
	const finalSystemPrompt = replaceTemplateVariables(basePrompt, templateVariables);

	// Add lorebook/world info context based on conversation keywords
	const lorebookContext = await lorebookService.buildLorebookContext(
		settings.userId,
		character.id,
		conversationHistory.map((m) => ({ content: m.content }))
	);
	if (lorebookContext) {
		finalSystemPrompt += `\n\n${lorebookContext}`;
	}

	// Format conversation history for LLM
	const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

	// For channels, append conversation history with sender names to the system prompt
	if (messageType === 'channel') {
		let systemContent = finalSystemPrompt.trim();
		if (conversationHistory.length > 0) {
			const historyLines = conversationHistory.map((msg) => {
				const name = msg.senderName || (msg.role === 'user' ? userName : character.name);
				return `${name}: ${msg.content}`;
			});
			systemContent += `\n\nCONVERSATION HISTORY:\n${historyLines.join('\n')}`;
		}
		// Name primer: append "CharName: " to guide the model
		if (options?.useNamePrimer) {
			systemContent += `\n${character.name}:`;
		}
		formattedMessages.push({
			role: 'system',
			content: systemContent
		});
	} else {
		// DM chat: system prompt + standard user/assistant role mapping
		formattedMessages.push({
			role: 'system',
			content: finalSystemPrompt.trim()
		});
		for (const msg of conversationHistory) {
			formattedMessages.push({
				role: msg.role as 'user' | 'assistant',
				content: msg.content
			});
		}
	}

	// Log prompt for debugging (keep last 5 per type)
	const logId = llmLogService.savePromptLog(
		formattedMessages,
		messageType,
		character.name || 'Character',
		userName
	);

	logger.info(`Generating ${messageType} completion`, {
		character: character.name,
		user: userName,
		model: settings.model,
		messageCount: formattedMessages.length
	});

	// Call LLM service with user settings
	const response = await llmService.createChatCompletion({
		messages: formattedMessages,
		userId: settings.userId,
		model: settings.model,
		temperature: settings.temperature,
		maxTokens: settings.maxTokens
	});

	logger.success(`Generated ${messageType} completion`, {
		character: character.name,
		model: response.model,
		contentLength: response.content.length,
		reasoningLength: response.reasoning?.length || 0,
		tokensUsed: response.usage?.total_tokens
	});

	// Log response for debugging (matching ID to prompt)
	llmLogService.saveResponseLog(response.content, response.content, messageType, logId, response);

	return {
		content: response.content,
		reasoning: response.reasoning || null
	};
}

/**
 * Generate an impersonation message (AI writes as the user)
 * @param conversationHistory - Array of previous messages in the conversation
 * @param character - Character card data
 * @param settings - User's LLM settings
 * @returns Generated user message content
 */
export async function generateImpersonation(
	conversationHistory: Message[],
	character: Character,
	settings: LlmSettings
): Promise<string> {
	// Get active user info (persona or default profile)
	const userInfo = await personaService.getActiveUserInfo(settings.userId);
	const userName = userInfo.name;

	// Load impersonate prompt from file
	const basePrompt = await loadImpersonatePromptFromFile();

	// Prepare template variables
	const templateVariables = {
		char: character.name || 'Character',
		user: userName,
		description: character.description || ''
	};

	// Replace variables in template
	let impersonatePrompt = replaceTemplateVariables(basePrompt, templateVariables);

	// Add lorebook/world info context based on conversation keywords
	const lorebookContext = await lorebookService.buildLorebookContext(
		settings.userId,
		character.id,
		conversationHistory.map((m) => ({ content: m.content }))
	);
	if (lorebookContext) {
		impersonatePrompt += `\n\n${lorebookContext}`;
	}

	// Format conversation history for LLM
	const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

	// Add impersonate prompt as system message
	formattedMessages.push({
		role: 'system',
		content: impersonatePrompt.trim()
	});

	// Add conversation history
	for (const msg of conversationHistory) {
		formattedMessages.push({
			role: msg.role as 'user' | 'assistant',
			content: msg.content
		});
	}

	// Log prompt for debugging
	const logId = llmLogService.savePromptLog(
		formattedMessages,
		'impersonate',
		character.name || 'Character',
		userName
	);

	logger.info(`Generating impersonation`, {
		character: character.name,
		user: userName,
		model: settings.model,
		messageCount: formattedMessages.length
	});

	// Call LLM service with user settings
	const response = await llmService.createChatCompletion({
		messages: formattedMessages,
		userId: settings.userId,
		model: settings.model,
		temperature: settings.temperature,
		maxTokens: settings.maxTokens
	});

	logger.success(`Generated impersonation`, {
		character: character.name,
		model: response.model,
		contentLength: response.content.length,
		tokensUsed: response.usage?.total_tokens
	});

	// Log response for debugging
	llmLogService.saveResponseLog(response.content, response.content, 'impersonate', logId, response);

	return response.content;
}
