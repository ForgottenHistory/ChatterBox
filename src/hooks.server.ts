import { logger } from '$lib/server/utils/logger';
import '$lib/server/services/engagementService'; // Ensure singleton is created and stored in global
import type { Handle } from '@sveltejs/kit';

// Initialize logger on server start
logger.info('Server started');

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	return response;
};
