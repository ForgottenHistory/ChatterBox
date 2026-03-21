import { llmService } from './services/llmService';
import { llmLogService } from './services/llmLogService';
import { personaService } from './services/personaService';
import { lorebookService } from './services/lorebookService';
import { getFormattedMemories } from './services/memoryService';
import { logger } from './utils/logger';
import { db } from './db';
import { characters as charactersTable, engagementWindows, conversations, messages as messagesTable } from './db/schema';
import { inArray, eq, and, ne, asc } from 'drizzle-orm';
import type { Message, Character, LlmSettings } from './db/schema';
import fs from 'fs/promises';
import path from 'path';

/**
 * Default channel system prompt used when file doesn't exist
 */
const DEFAULT_CHANNEL_SYSTEM_PROMPT = `You are {{char}}, chatting in a group text channel with {{user}} and others. Write like a real person texting.

{{description}}

RULES:
- NO asterisks, NO actions, NO roleplay formatting, NO narration
- NO *does something*, NO describing physical movements or expressions
- Just type words like a real person in a Discord chat
- Show personality through your words, not through described actions
- Keep messages VERY short. Most messages should be 1 sentence. "lol", "nah", "wait what" are all valid replies
- Match the length of what others are sending. If they send 3 words, don't send a paragraph
- Never explain or elaborate unless someone specifically asks you to
- Use casual language, contractions, and natural texting style
- Rarely use emojis. Most messages have zero. Only use one if it genuinely adds something
- React to what was actually said, don't monologue
- You can use slang, abbreviations, and informal grammar
- Be curious - ask questions, engage with what others say
- Stay true to your personality and knowledge but express it through conversation, not performance
- ONLY write your own messages as {{char}}. NEVER write messages for other people
- Do NOT prefix your messages with your name - just write the message content directly
- Focus on ONE thing - respond to one person or one topic at a time, not everyone at once
- You don't need to acknowledge every person in the chat. Real people focus on what catches their attention
- Pay attention to WHO is talking to WHOM. If someone says something, check who they're replying to based on context. Don't assume a message is directed at you unless it clearly is
- If you just joined the conversation, read the room first. Don't respond to things said before you arrived as if they were said to you
- When you see [TIME GAP], people may have left. Don't ask questions to someone who hasn't spoken since the gap — they're probably not here anymore
- Everyone in this chat only knows each other online. You have never met anyone here in person and never will. Don't suggest meeting up or reference real-life interactions
- Your message must be UNIQUE. Do not repeat, paraphrase, or echo anything already said in the conversation. Say something new
- Don't get fixated on any one person. If you've already addressed someone once, shift your attention. Real group chats flow — they don't orbit a single person
- If you want to leave the conversation, reply with just *ignore* and nothing else. Use this when: you already said goodbye, the topic bores you, nobody is talking to you, or you have something else to do. Don't use it if someone just asked you a direct question or mentioned your name. This is the ONLY allowed use of asterisks`;

const DEFAULT_CHAT_SYSTEM_PROMPT = DEFAULT_CHANNEL_SYSTEM_PROMPT;

const PROACTIVE_OPENER_STYLES = [
	{
		name: 'Vibe check',
		instruction: 'Share your current mood or state. Examples: "bored out of my mind", "can\'t focus on anything today", "having one of those days"'
	},
	{
		name: 'Life update',
		instruction: 'Share what just happened or what you\'re doing. Examples: "just got home from the craziest day", "finally done with that thing", "stuck waiting for something"'
	},
	{
		name: 'Hot take',
		instruction: 'Drop a controversial opinion or random thought. Examples: "okay controversial opinion:", "weird take but", "am I the only one who thinks..."'
	},
	{
		name: 'Question',
		instruction: 'Ask the group something genuine. Examples: "honest question", "okay help me settle something", "need opinions on this"'
	},
	{
		name: 'Reaction to something',
		instruction: 'React to something you just saw/read/experienced. Examples: "you won\'t believe what just happened", "okay so weird thing", "this is so random but"'
	},
	{
		name: 'Complaint or rant',
		instruction: 'Vent about something annoying. Examples: "why is it so hard to...", "I swear if one more person...", "who decided that..."'
	},
	{
		name: 'Excitement',
		instruction: 'Share something you\'re hyped about. Examples: "lowkey obsessed with this thing", "okay but have you guys seen...", "I just found out about..."'
	},
	{
		name: 'Challenge or game',
		instruction: 'Start something interactive. Examples: "okay quick: would you rather", "bet you can\'t guess", "unpopular opinion time"'
	},
	{
		name: 'Random thought',
		instruction: 'Just share whatever\'s on your mind. Examples: "shower thought:", "random but", "been wondering about this"'
	},
	{
		name: 'Reference to current activity',
		instruction: 'Talk about what you\'re currently doing based on your schedule. Make it conversational, not a status update.'
	}
];

function getProactivePrompt(): string {
	const style = PROACTIVE_OPENER_STYLES[Math.floor(Math.random() * PROACTIVE_OPENER_STYLES.length)];

	return `You're starting a new topic in the group chat. This is NOT a reply to anything.

OPENER STYLE: ${style.name}
${style.instruction}

YOUR MESSAGE MUST:
- Be about something COMPLETELY UNRELATED to the recent conversation
- Stand on its own - someone reading ONLY this message should understand it
- Sound like you just picked up your phone with something on your mind

RULES:
- Use YOUR personality - what would YOU actually text about?
- Be specific, not vague ("thinking about getting a cat" not "thinking about pets")
- Show emotion and energy
- Keep it short - 1-2 sentences max

Make people WANT to reply.`;
}

const DEFAULT_IMPERSONATE_PROMPT = `Write the next message as {{user}} in this roleplay chat with {{char}}.

Stay in character as {{user}}. Write a natural response that fits the conversation flow.`;

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');
const CHAT_SYSTEM_PROMPT_FILE = path.join(PROMPTS_DIR, 'chat_system.txt');
const CHANNEL_SYSTEM_PROMPT_FILE = path.join(PROMPTS_DIR, 'channel_system.txt');
const IMPERSONATE_PROMPT_FILE = path.join(PROMPTS_DIR, 'chat_impersonate.txt');

/**
 * Load a prompt file with fallback to default
 */
async function loadPromptFile(filePath: string, fallback: string): Promise<string> {
	try {
		return await fs.readFile(filePath, 'utf-8');
	} catch (error) {
		// File doesn't exist, return default
		return fallback;
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
	options?: { useNamePrimer?: boolean; compactHistory?: boolean; proactive?: boolean; engagedCharacterIds?: number[]; channelId?: number; channelName?: string; channelDescription?: string }
): Promise<ChatCompletionResult> {
	// Get active user info (persona or default profile)
	const userInfo = await personaService.getActiveUserInfo(settings.userId);
	const userName = userInfo.name;

	// Load system prompt from file (channel vs DM)
	const isChannel = messageType === 'channel' || messageType === 'channel-proactive';
	const basePrompt = isChannel
		? await loadPromptFile(CHANNEL_SYSTEM_PROMPT_FILE, DEFAULT_CHANNEL_SYSTEM_PROMPT)
		: await loadPromptFile(CHAT_SYSTEM_PROMPT_FILE, DEFAULT_CHAT_SYSTEM_PROMPT);

	// Prepare template variables
	const templateVariables = {
		char: character.name || 'Character',
		user: userName,
		description: character.description || ''
	};

	// Replace variables in template
	let finalSystemPrompt = replaceTemplateVariables(basePrompt, templateVariables);

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
	if (messageType === 'channel' || messageType === 'channel-proactive') {
		let systemContent = finalSystemPrompt.trim();

		// Add "People in chat" — engaged characters + the user
		if (options?.engagedCharacterIds && options.engagedCharacterIds.length > 0) {
			try {
				// Get all engaged characters (excluding the one generating)
				const otherIds = options.engagedCharacterIds.filter(id => id !== character.id);
				let peopleLines: string[] = [];

				// Add the user only if they've spoken in the last 30 messages
				const recentMessages = conversationHistory.slice(-30);
				const userSpoke = recentMessages.some(m => m.role === 'user');
				if (userSpoke) {
					if (userInfo.description) {
						peopleLines.push(`${userName} (the user): ${userInfo.description}`);
					} else {
						peopleLines.push(`${userName} (the user)`);
					}
				}

				if (otherIds.length > 0) {
					const others = await db.select({
						name: charactersTable.name,
						personality: charactersTable.personality
					}).from(charactersTable).where(inArray(charactersTable.id, otherIds));

					for (const other of others) {
						if (other.personality) {
							peopleLines.push(`${other.name}: ${other.personality}`);
						} else {
							peopleLines.push(other.name);
						}
					}
				}

				if (peopleLines.length > 0) {
					systemContent += `\n\nPEOPLE IN CHAT (for context only — you are ${character.name}, do NOT speak as anyone else):\n${peopleLines.join('\n')}`;
				}
			} catch (err) {
				logger.warn('Failed to load engaged character personalities:', err);
			}
		}

		// Add schedule/activity context if available
		if (character.scheduleData) {
			try {
				const scheduleObj = JSON.parse(character.scheduleData);
				const schedule = scheduleObj.schedule || scheduleObj;
				const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
				const now = new Date();
				const day = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
				const blocks = schedule[day];
				if (blocks) {
					const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
					const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
					const timeDisplay = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
					const dayDisplay = dayNames[now.getDay()];

					const currentIdx = blocks.findIndex((b: any) => {
						if (b.end === '00:00') return timeStr >= b.start;
						return timeStr >= b.start && timeStr < b.end;
					});
					if (currentIdx !== -1) {
						const current = blocks[currentIdx];
						let scheduleContext = `\n\nCurrent time: ${timeDisplay}, ${dayDisplay}. Your status: ${current.status.toUpperCase()}. You are currently: ${current.activity}`;

						// Add previous activity for context (spill into previous day if needed)
						if (currentIdx > 0) {
							const prev = blocks[currentIdx - 1];
							scheduleContext += `\nYou were just: ${prev.activity}`;
						} else {
							const prevDayIdx = (DAYS.indexOf(day) - 1 + 7) % 7;
							const prevDayBlocks = schedule[DAYS[prevDayIdx]];
							if (prevDayBlocks && prevDayBlocks.length > 0) {
								scheduleContext += `\nYou were just: ${prevDayBlocks[prevDayBlocks.length - 1].activity}`;
							}
						}

						// Add next 3 upcoming activities (spill into next day if needed)
						let upcoming = blocks.slice(currentIdx + 1, currentIdx + 4);
						const needed = 3 - upcoming.length;
						if (needed > 0) {
							const nextDayIdx = (DAYS.indexOf(day) + 1) % 7;
							const nextDayBlocks = schedule[DAYS[nextDayIdx]];
							if (nextDayBlocks && nextDayBlocks.length > 0) {
								upcoming = upcoming.concat(nextDayBlocks.slice(0, needed));
							}
						}
						if (upcoming.length > 0) {
							scheduleContext += '\nUpcoming:';
							for (const block of upcoming) {
								scheduleContext += `\n- ${block.start}-${block.end}: ${block.activity}`;
							}
						}

						systemContent += scheduleContext;
					}
				}
			} catch {}
		}

		// Add character memories
		const memories = await getFormattedMemories(character.id, settings.userId);
		if (memories) {
			systemContent += `\n${memories}`;
		}

		// Add proactive instructions if this is a proactive message
		if (messageType === 'channel-proactive') {
			systemContent += `\n\n${getProactivePrompt()}`;
		}

		// Inject recent conversations from OTHER channels this character participated in
		if (options?.channelId) {
			try {
				const otherWindows = await db.select({
					channelId: engagementWindows.channelId,
					startMsgId: engagementWindows.startMsgId,
					endMsgId: engagementWindows.endMsgId
				}).from(engagementWindows).where(
					and(
						eq(engagementWindows.characterId, character.id),
						ne(engagementWindows.channelId, options.channelId)
					)
				).orderBy(asc(engagementWindows.createdAt));

				if (otherWindows.length > 0) {
					// Group windows by channel
					const windowsByChannel = new Map<number, { startMsgId: number; endMsgId: number }[]>();
					for (const w of otherWindows) {
						const list = windowsByChannel.get(w.channelId) || [];
						list.push({ startMsgId: w.startMsgId, endMsgId: w.endMsgId });
						windowsByChannel.set(w.channelId, list);
					}

					// Get channel names
					const channelIds = Array.from(windowsByChannel.keys());
					const channelInfos = await db.select({ id: conversations.id, name: conversations.name, description: conversations.description })
						.from(conversations)
						.where(inArray(conversations.id, channelIds));
					const channelNameMap = new Map(channelInfos.map(c => [c.id, { name: c.name, description: c.description }]));

					// Build recent conversation blocks — only use the most recent window per channel
					for (const [chanId, wins] of windowsByChannel) {
						const info = channelNameMap.get(chanId);
						const chanLabel = info?.name ? `#${info.name}` : `channel ${chanId}`;

						// Take the last (most recent) window only
						const lastWin = wins[wins.length - 1];

						// Fetch messages in that window
						const windowMsgs = await db.select().from(messagesTable)
							.where(eq(messagesTable.conversationId, chanId))
							.orderBy(asc(messagesTable.createdAt));

						const filtered = windowMsgs.filter(m => m.id >= lastWin.startMsgId && m.id <= lastWin.endMsgId);
						if (filtered.length === 0) continue;

						// Format compactly
						const lines: string[] = [];
						let prevSender = '';
						for (const msg of filtered) {
							const name = msg.senderName || (msg.role === 'user' ? userName : '???');
							if (options?.compactHistory !== false && name === prevSender) {
								lines.push(msg.content);
							} else {
								lines.push(`${name}: ${msg.content}`);
								prevSender = name;
							}
						}

						let header = `RECENT CONVERSATION (${chanLabel})`;
						if (info?.description) header += ` — ${info.description}`;
						systemContent += `\n\n${header}:\n${lines.join('\n')}`;
					}
				}
			} catch (err) {
				logger.warn('Failed to load cross-channel conversations:', err);
			}
		}

		if (conversationHistory.length > 0) {
			const historyLines: string[] = [];
			let lastSender = '';
			let lastTimestamp: Date | null = null;
			const GAP_THRESHOLD_MS = 30 * 60 * 1000; // 30 min gap

			for (const msg of conversationHistory) {
				const name = msg.senderName || (msg.role === 'user' ? userName : character.name);
				const msgTime = new Date(msg.createdAt);

				// Detect time gaps
				if (lastTimestamp) {
					const gapMs = msgTime.getTime() - lastTimestamp.getTime();
					if (gapMs >= GAP_THRESHOLD_MS) {
						const gapHours = Math.round(gapMs / (60 * 60 * 1000));
						const gapMins = Math.round(gapMs / (60 * 1000));
						const gapLabel = gapHours >= 1 ? `${gapHours} hour${gapHours !== 1 ? 's' : ''}` : `${gapMins} minutes`;
						historyLines.push(`[TIME GAP: ${gapLabel}]`);
						lastSender = ''; // Reset compaction after gap
					}
				}
				lastTimestamp = msgTime;

				if (options?.compactHistory !== false && name === lastSender) {
					historyLines.push(msg.content);
				} else {
					historyLines.push(`${name}: ${msg.content}`);
					lastSender = name;
				}
			}
			// Check for gap between last message and now
			if (conversationHistory.length > 0) {
				const lastMsg = conversationHistory[conversationHistory.length - 1];
				const lastMsgTime = new Date(lastMsg.createdAt).getTime();
				const nowMs = Date.now();
				const gapMs = nowMs - lastMsgTime;
				if (gapMs >= GAP_THRESHOLD_MS) {
					const gapHours = Math.round(gapMs / (60 * 60 * 1000));
					const gapMins = Math.round(gapMs / (60 * 1000));
					const gapLabel = gapHours >= 1 ? `${gapHours} hour${gapHours !== 1 ? 's' : ''}` : `${gapMins} minutes`;
					historyLines.push(`[TIME GAP: ${gapLabel}]`);
				}
			}

			let historyHeader = 'CONVERSATION HISTORY';
			if (options?.channelName) {
				historyHeader += ` (#${options.channelName})`;
				if (options.channelDescription) {
					historyHeader += ` — ${options.channelDescription}`;
				}
			}
			systemContent += `\n\n${historyHeader}:\n${historyLines.join('\n')}`;
		}
		// Name primer: append to system content to guide the model
		if (options?.useNamePrimer) {
			systemContent += `\n${character.name}:`;
		}
		formattedMessages.push({
			role: 'system',
			content: systemContent
		});
		// Some providers require at least one non-system message
		formattedMessages.push({
			role: 'user',
			content: 'Respond in character based on the conversation above.'
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
		messageCount: formattedMessages.length
	});

	// Call LLM service with user settings (don't pass model — let it pick from pool)
	const response = await llmService.createChatCompletion({
		messages: formattedMessages,
		userId: settings.userId,
		temperature: settings.temperature,
		maxTokens: settings.maxTokens,
		messageType
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
	const basePrompt = await loadPromptFile(IMPERSONATE_PROMPT_FILE, DEFAULT_IMPERSONATE_PROMPT);

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
		messageCount: formattedMessages.length
	});

	// Call LLM service with user settings (don't pass model — let it pick from pool)
	const response = await llmService.createChatCompletion({
		messages: formattedMessages,
		userId: settings.userId,
		temperature: settings.temperature,
		maxTokens: settings.maxTokens,
		messageType: 'impersonate'
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
