import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations, messages, characterMemories, engagementWindows, engagementState } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT - Edit a channel (name and/or description)
export const PUT: RequestHandler = async ({ params, cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const channelId = parseInt(params.id);

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

	const { name, description } = await request.json();

	const updates: Record<string, any> = {};

	if (name !== undefined) {
		const sanitized = String(name).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
		if (!sanitized) {
			return json({ error: 'Invalid channel name' }, { status: 400 });
		}

		// Check for duplicate name (excluding this channel)
		const existing = await db
			.select()
			.from(conversations)
			.where(
				and(
					eq(conversations.userId, parseInt(userId)),
					eq(conversations.conversationType, 'channel'),
					eq(conversations.name, sanitized)
				)
			)
			.limit(1);

		if (existing.length > 0 && existing[0].id !== channelId) {
			return json({ error: 'A channel with that name already exists' }, { status: 409 });
		}

		updates.name = sanitized;
	}

	if (description !== undefined) {
		updates.description = description?.trim() || null;
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No changes provided' }, { status: 400 });
	}

	const [updated] = await db
		.update(conversations)
		.set(updates)
		.where(eq(conversations.id, channelId))
		.returning();

	return json({ channel: updated });
};

// DELETE - Delete a channel (not #general)
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const channelId = parseInt(params.id);

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

	if (channel.name === 'general') {
		return json({ error: 'Cannot delete #general' }, { status: 403 });
	}

	// Delete all related data
	await db.delete(engagementWindows).where(eq(engagementWindows.channelId, channelId));
	await db.delete(engagementState).where(eq(engagementState.channelId, channelId));
	await db.delete(characterMemories).where(eq(characterMemories.sourceConversationId, channelId));
	await db.delete(messages).where(eq(messages.conversationId, channelId));
	await db.delete(conversations).where(eq(conversations.id, channelId));

	return json({ success: true });
};
