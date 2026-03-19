import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations, messages, characters, llmSettings, users } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateChatCompletion } from '$lib/server/llm';

// POST - Generate a character message in a channel
export const POST: RequestHandler = async ({ params, cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const channelId = parseInt(params.id);

	// Verify channel
	const [channel] = await db
		.select()
		.from(conversations)
		.where(
			and(
				eq(conversations.id, channelId),
				eq(conversations.userId, parseInt(userId)),
				eq(conversations.conversationType, 'channel')
			)
		)
		.limit(1);

	if (!channel) {
		return json({ error: 'Channel not found' }, { status: 404 });
	}

	// Get options from request body
	const body = await request.json().catch(() => ({}));
	let characterId: number | undefined = body.characterId;
	const proactive: boolean = body.proactive === true;

	if (!characterId) {
		// Pick a random character owned by this user
		const allCharacters = await db
			.select()
			.from(characters)
			.where(eq(characters.userId, parseInt(userId)));

		if (allCharacters.length === 0) {
			return json({ error: 'No characters available' }, { status: 400 });
		}

		const randomChar = allCharacters[Math.floor(Math.random() * allCharacters.length)];
		characterId = randomChar.id;
	}

	// Get the character
	const [character] = await db
		.select()
		.from(characters)
		.where(
			and(
				eq(characters.id, characterId),
				eq(characters.userId, parseInt(userId))
			)
		)
		.limit(1);

	if (!character) {
		return json({ error: 'Character not found' }, { status: 404 });
	}

	// Get conversation history
	const conversationHistory = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, channelId))
		.orderBy(messages.createdAt);

	// Get LLM settings
	const [settings] = await db
		.select()
		.from(llmSettings)
		.where(eq(llmSettings.userId, parseInt(userId)))
		.limit(1);

	if (!settings) {
		return json({ error: 'LLM settings not configured' }, { status: 404 });
	}

	// Get behaviour settings
	const [user] = await db
		.select({ useNamePrimer: users.useNamePrimer, compactHistory: users.compactHistory })
		.from(users)
		.where(eq(users.id, parseInt(userId)))
		.limit(1);

	try {
		const aiResult = await generateChatCompletion(
			conversationHistory,
			character,
			settings,
			proactive ? 'channel-proactive' : 'channel',
			{ useNamePrimer: user?.useNamePrimer ?? true, compactHistory: user?.compactHistory ?? true, proactive }
		);

		// Check for *ignore* — character chooses not to respond
		// Must be the first non-empty line; also strip it from the output if mixed with real content
		const contentLines = aiResult.content.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
		const firstLine = (contentLines[0] || '').toLowerCase();
		if (firstLine === '*ignore*' || firstLine === 'ignore' || firstLine === '*ignore*.') {
			return json({ messages: [], ignored: true, characterId: character.id });
		}
		// Also strip any stray *ignore* lines from the rest
		const cleanedContent = contentLines.filter(l => {
			const lower = l.toLowerCase();
			return lower !== '*ignore*' && lower !== 'ignore';
		}).join('\n');

		// Post-process: split on newlines, strip "Name: " prefixes, drop other people's lines
		const charName = character.name.toLowerCase();
		const lines = cleanedContent
			.split(/\n+/)
			.map((line: string) => line.trim())
			.filter((line: string) => line.length > 0)
			.map((line: string) => {
				// If line has a "Name: content" pattern, check who it belongs to
				const colonIdx = line.indexOf(':');
				if (colonIdx > 0 && colonIdx < 50) {
					const prefix = line.substring(0, colonIdx).trim().toLowerCase();
					if (prefix === charName) {
						// Character's own line — strip the name prefix, keep the content
						return line.substring(colonIdx + 1).trim();
					}
					// Someone else's line — mark for removal
					if (!prefix.includes('http') && !prefix.includes('//')) {
						return '';
					}
				}
				return line;
			})
			.filter((line: string) => line.length > 0);

		// If nothing left after filtering, don't create any messages
		if (lines.length === 0) {
			return json({ messages: [] });
		}

		const savedMessages = [];
		for (let i = 0; i < lines.length; i++) {
			const [msg] = await db
				.insert(messages)
				.values({
					conversationId: channelId,
					characterId: character.id,
					role: 'assistant',
					content: lines[i],
					senderName: character.name,
					senderAvatar: character.thumbnailData || character.imageData,
					reasoning: i === 0 ? aiResult.reasoning : null
				})
				.returning();
			savedMessages.push(msg);
		}

		return json({ messages: savedMessages });
	} catch (error: any) {
		console.error('Failed to generate channel message:', error);
		return json({ error: error.message || 'Failed to generate response' }, { status: 500 });
	}
};
