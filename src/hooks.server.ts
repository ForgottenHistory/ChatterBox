import { logger } from '$lib/server/utils/logger';
import '$lib/server/services/engagementService'; // Ensure singleton is created and stored in global
import { rebuildAllWindows } from '$lib/server/services/windowRebuildService';
import type { Handle } from '@sveltejs/kit';

// Initialize logger on server start
logger.info('Server started');

// Rebuild engagement windows from message history on startup
rebuildAllWindows().catch(err => logger.warn('Failed to rebuild windows on startup:', err));

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	return response;
};
