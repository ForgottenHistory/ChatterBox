import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET: List all channels for the user, auto-creating #general if none exist
export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const uid = parseInt(userId);

	let channels = await db
		.select()
		.from(conversations)
		.where(
			and(
				eq(conversations.userId, uid),
				eq(conversations.conversationType, 'channel')
			)
		)
		.orderBy(conversations.createdAt);

	// Auto-create #general if no channels exist
	if (channels.length === 0) {
		const [general] = await db
			.insert(conversations)
			.values({
				userId: uid,
				conversationType: 'channel',
				name: 'general',
				description: 'General chat',
				isActive: true
			})
			.returning();
		channels = [general];
	}

	return json({ channels });
};

// POST: Create a new channel
export const POST: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { name, description } = await request.json();

	if (!name || typeof name !== 'string') {
		return json({ error: 'Channel name is required' }, { status: 400 });
	}

	// Sanitize: lowercase, no spaces, alphanumeric + hyphens
	const sanitized = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

	if (!sanitized) {
		return json({ error: 'Invalid channel name' }, { status: 400 });
	}

	// Check for duplicate name
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

	if (existing.length > 0) {
		return json({ error: 'A channel with that name already exists' }, { status: 409 });
	}

	const [channel] = await db
		.insert(conversations)
		.values({
			userId: parseInt(userId),
			conversationType: 'channel',
			name: sanitized,
			description: description?.trim() || null,
			isActive: true
		})
		.returning();

	return json({ channel }, { status: 201 });
};
