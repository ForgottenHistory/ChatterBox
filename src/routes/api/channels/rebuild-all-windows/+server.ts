import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rebuildAllWindows } from '$lib/server/services/windowRebuildService';

/**
 * POST - Rebuild engagement windows for ALL channels
 *
 * Usage: fetch('/api/channels/rebuild-all-windows', { method: 'POST' }).then(r => r.json()).then(console.log)
 */
export const POST: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

	await rebuildAllWindows();
	return json({ success: true });
};
