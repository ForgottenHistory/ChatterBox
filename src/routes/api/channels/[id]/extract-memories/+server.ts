import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractMemories } from '$lib/server/services/memoryService';

// POST - Extract memories for a character from a channel conversation
export const POST: RequestHandler = async ({ params, cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const channelId = parseInt(params.id);
	const body = await request.json().catch(() => ({}));
	const { characterId } = body;

	if (!characterId) {
		return json({ error: 'characterId is required' }, { status: 400 });
	}

	// Fire and forget — don't block the response
	extractMemories(characterId, parseInt(userId), channelId)
		.catch(err => console.error('Background memory extraction failed:', err));

	return json({ success: true, message: 'Memory extraction started' });
};
