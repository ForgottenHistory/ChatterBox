import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations, messages, characterMemories, engagementWindows, engagementState } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// POST - Wipe all messages and character memories for a channel
export const POST: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const channelId = parseInt(params.id);

	// Verify channel belongs to user
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

	// Delete all messages in this channel
	await db.delete(messages).where(eq(messages.conversationId, channelId));

	// Delete all character memories sourced from this channel
	await db.delete(characterMemories).where(eq(characterMemories.sourceConversationId, channelId));

	// Delete all engagement data for this channel
	await db.delete(engagementWindows).where(eq(engagementWindows.channelId, channelId));
	await db.delete(engagementState).where(eq(engagementState.channelId, channelId));

	return json({ success: true });
};
