import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { getUserById } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { conversations } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const userId = cookies.get('userId');

	if (!userId) {
		throw redirect(302, '/login');
	}

	const user = await getUserById(parseInt(userId));

	if (!user) {
		cookies.delete('userId', { path: '/' });
		throw redirect(302, '/login');
	}

	// Verify the channel exists and belongs to this user
	const [channel] = await db
		.select()
		.from(conversations)
		.where(
			and(
				eq(conversations.id, parseInt(params.id)),
				eq(conversations.userId, parseInt(userId)),
				eq(conversations.conversationType, 'channel')
			)
		)
		.limit(1);

	if (!channel) {
		throw error(404, 'Channel not found');
	}

	return {
		channelId: channel.id,
		channelName: channel.name || 'unnamed',
		channelDescription: channel.description,
		user
	};
};
