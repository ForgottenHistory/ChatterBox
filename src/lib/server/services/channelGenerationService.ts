import { db } from '$lib/server/db';
import { conversations, messages, characters, llmSettings, users, engagementWindows, engagementState } from '$lib/server/db/schema';
import type { Message } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateChatCompletion } from '$lib/server/llm';

export interface ChannelGenerationResult {
	messages: Message[];
	ignored?: boolean;
	characterId: number;
}

/**
 * Generate a character message in a channel.
 * Extracted from the /api/channels/[id]/generate endpoint for reuse by the engagement service.
 */
export async function generateChannelMessage(
	channelId: number,
	userId: number,
	characterId: number,
	options: {
		proactive?: boolean;
		visibleMessageIds?: number[];
		engagedCharacterIds?: number[];
		recentlyLeftIds?: number[];
	} = {}
): Promise<ChannelGenerationResult> {
	const { proactive = false, visibleMessageIds, engagedCharacterIds, recentlyLeftIds } = options;

	// Get channel info
	const [channel] = await db
		.select({ name: conversations.name, description: conversations.description })
		.from(conversations)
		.where(eq(conversations.id, channelId))
		.limit(1);

	// Get the character
	const [character] = await db
		.select()
		.from(characters)
		.where(
			and(
				eq(characters.id, characterId),
				eq(characters.userId, userId)
			)
		)
		.limit(1);

	if (!character) {
		throw new Error('Character not found');
	}

	// Get conversation history (filtered by visible message IDs if provided)
	let conversationHistory = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, channelId))
		.orderBy(messages.createdAt);

	if (visibleMessageIds && visibleMessageIds.length > 0) {
		const visibleSet = new Set(visibleMessageIds);
		conversationHistory = conversationHistory.filter(m => visibleSet.has(m.id));
	}

	// Get LLM settings
	const [settings] = await db
		.select()
		.from(llmSettings)
		.where(eq(llmSettings.userId, userId))
		.limit(1);

	if (!settings) {
		throw new Error('LLM settings not configured');
	}

	// Trim conversation history by dropping oldest engagement windows until it fits.
	if (settings.contextWindow && settings.contextWindow > 0 && visibleMessageIds && visibleMessageIds.length > 0) {
		const budgetChars = settings.contextWindow * 4;

		const dbWindows = await db
			.select()
			.from(engagementWindows)
			.where(and(
				eq(engagementWindows.channelId, channelId),
				eq(engagementWindows.characterId, characterId)
			))
			.orderBy(engagementWindows.startMsgId);

		const [currentEngagement] = await db
			.select()
			.from(engagementState)
			.where(and(
				eq(engagementState.channelId, channelId),
				eq(engagementState.characterId, characterId)
			))
			.limit(1);

		const allWindows: { startMsgId: number; endMsgId: number }[] = [
			...dbWindows.map(w => ({ startMsgId: w.startMsgId, endMsgId: w.endMsgId })),
			...(currentEngagement ? [{ startMsgId: currentEngagement.startMsgId, endMsgId: Infinity }] : [])
		];

		let totalChars = 0;
		for (const msg of conversationHistory) {
			totalChars += msg.content.length + 20;
		}

		while (totalChars > budgetChars && allWindows.length > 1) {
			const dropped = allWindows.shift()!;
			conversationHistory = conversationHistory.filter(m => {
				if (m.id >= dropped.startMsgId && m.id <= dropped.endMsgId) {
					for (const w of allWindows) {
						if (m.id >= w.startMsgId && m.id <= w.endMsgId) return true;
					}
					return false;
				}
				return true;
			});
			totalChars = 0;
			for (const msg of conversationHistory) {
				totalChars += msg.content.length + 20;
			}
		}
	} else if (settings.contextWindow && settings.contextWindow > 0) {
		const budgetChars = settings.contextWindow * 4;
		let totalChars = 0;
		let keepFrom = conversationHistory.length;
		for (let i = conversationHistory.length - 1; i >= 0; i--) {
			const msgChars = conversationHistory[i].content.length + 20;
			if (totalChars + msgChars > budgetChars) break;
			totalChars += msgChars;
			keepFrom = i;
		}
		conversationHistory = conversationHistory.slice(keepFrom);
	}

	// Get behaviour settings
	const [user] = await db
		.select({ useNamePrimer: users.useNamePrimer, compactHistory: users.compactHistory, nudgeChance: users.nudgeChance, maxAddressedMessages: users.maxAddressedMessages })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	const aiResult = await generateChatCompletion(
		conversationHistory,
		character,
		settings,
		proactive ? 'channel-proactive' : 'channel',
		{ useNamePrimer: user?.useNamePrimer ?? true, compactHistory: user?.compactHistory ?? true, proactive, engagedCharacterIds, recentlyLeftIds, nudgeChance: user?.nudgeChance ?? 30, channelId, channelName: channel?.name || undefined, channelDescription: channel?.description || undefined }
	);

	// Check for *ignore*
	const contentLines = aiResult.content.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
	const firstLine = (contentLines[0] || '').toLowerCase();
	if (firstLine === '*ignore*' || firstLine === 'ignore' || firstLine === '*ignore*.') {
		return { messages: [], ignored: true, characterId: character.id };
	}

	const cleanedContent = contentLines.filter(l => {
		const lower = l.toLowerCase();
		return lower !== '*ignore*' && lower !== 'ignore';
	}).join('\n');

	// Post-process: split on newlines, strip "Name: " prefixes
	const charName = character.name.toLowerCase();
	const rawLines = cleanedContent
		.split(/\r?\n+/)
		.map((line: string) => line.trim())
		.filter((line: string) => line.length > 0);

	const lines: string[] = [];
	for (const line of rawLines) {
		const colonIdx = line.indexOf(':');
		if (colonIdx > 0 && colonIdx < 50) {
			const prefix = line.substring(0, colonIdx).trim().toLowerCase();
			if (prefix === charName) {
				lines.push(line.substring(colonIdx + 1).trim());
				continue;
			}
			if (!prefix.includes('http') && !prefix.includes('//')) {
				break;
			}
		}
		lines.push(line);
	}

	// Filter out bracketed meta-text (e.g. [TIME GAP], [response], [system])
	// Also filter lines that contain [TIME GAP] even mixed with other text
	const cleanLines = lines.filter(line =>
		!line.match(/^\s*\[.*\]\s*$/) && !line.includes('[TIME GAP')
	);

	// Deduplicate against last 20 messages
	const recentContent = new Set(
		conversationHistory.slice(-20).map(m => m.content.toLowerCase().trim())
	);
	let dedupedLines = cleanLines.filter(line => !recentContent.has(line.toLowerCase().trim()));

	// Enforce max addressed messages limit
	const maxAddr = user?.maxAddressedMessages ?? 2;
	if (maxAddr > 0 && dedupedLines.length > 1) {
		// Get all character names (excluding the generating character) for matching
		const allChars = await db.select({ name: characters.name }).from(characters).where(eq(characters.userId, userId));
		const otherNames = allChars
			.filter(c => c.name.toLowerCase() !== charName)
			.map(c => c.name.toLowerCase());

		// Also include the user's name
		const userInfo = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, userId)).limit(1);
		if (userInfo.length > 0) otherNames.push(userInfo[0].displayName.toLowerCase());

		let addressedCount = 0;
		const limitedLines: string[] = [];
		for (const line of dedupedLines) {
			const lineLower = line.toLowerCase();
			const mentionsName = otherNames.some(name => lineLower.includes(name));
			if (mentionsName) {
				addressedCount++;
				if (addressedCount > maxAddr) continue; // Discard this line
			}
			limitedLines.push(line);
		}
		dedupedLines = limitedLines;
	}

	if (dedupedLines.length === 0) {
		return { messages: [], characterId: character.id };
	}

	const savedMessages: Message[] = [];
	for (let i = 0; i < dedupedLines.length; i++) {
		const [msg] = await db
			.insert(messages)
			.values({
				conversationId: channelId,
				characterId: character.id,
				role: 'assistant',
				content: dedupedLines[i],
				senderName: character.name,
				senderAvatar: character.thumbnailData || character.imageData,
				reasoning: i === 0 ? aiResult.reasoning : null
			})
			.returning();
		savedMessages.push(msg);
	}

	return { messages: savedMessages, characterId: character.id };
}
