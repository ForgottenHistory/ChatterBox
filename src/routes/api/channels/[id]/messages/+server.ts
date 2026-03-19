import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations, messages } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { personaService } from '$lib/server/services/personaService';

// GET: Fetch messages for a channel
export const GET: RequestHandler = async ({ params, cookies }) => {
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

	const channelMessages = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, channelId))
		.orderBy(messages.createdAt);

	return json({ messages: channelMessages });
};

// POST: Send a message to a channel
export const POST: RequestHandler = async ({ params, cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const channelId = parseInt(params.id);
	const { message } = await request.json();

	if (!message || typeof message !== 'string' || !message.trim()) {
		return json({ error: 'Message is required' }, { status: 400 });
	}

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

	// Get user display info
	const userInfo = await personaService.getActiveUserInfo(parseInt(userId));

	const [newMessage] = await db
		.insert(messages)
		.values({
			conversationId: channelId,
			role: 'user',
			content: message.trim(),
			senderName: userInfo.name,
			senderAvatar: userInfo.avatarData
		})
		.returning();

	return json({ message: newMessage }, { status: 201 });
};
