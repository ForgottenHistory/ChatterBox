import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations, characters } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateChannelMessage } from '$lib/server/services/channelGenerationService';

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
	const visibleMessageIds: number[] | undefined = body.visibleMessageIds;
	const engagedCharacterIds: number[] | undefined = body.engagedCharacterIds;

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

	try {
		const result = await generateChannelMessage(channelId, parseInt(userId), characterId, {
			proactive,
			visibleMessageIds,
			engagedCharacterIds
		});

		if (result.ignored) {
			return json({ messages: [], ignored: true, characterId: result.characterId });
		}

		return json({ messages: result.messages });
	} catch (error: any) {
		console.error('Failed to generate channel message:', error);
		return json({ error: error.message || 'Failed to generate response' }, { status: 500 });
	}
};
