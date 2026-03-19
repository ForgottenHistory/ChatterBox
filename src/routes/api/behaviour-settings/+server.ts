import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, parseInt(userId))
	});

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json({
		channelFrequencyMin: user.channelFrequencyMin,
		channelFrequencyMax: user.channelFrequencyMax,
		useNamePrimer: user.useNamePrimer
	});
};

export const PUT: RequestHandler = async ({ cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { channelFrequencyMin, channelFrequencyMax, useNamePrimer } = body;

	// Validate
	if (typeof channelFrequencyMin !== 'number' || typeof channelFrequencyMax !== 'number') {
		return json({ error: 'Invalid values' }, { status: 400 });
	}

	const min = Math.max(1, Math.round(channelFrequencyMin));
	const max = Math.max(min, Math.round(channelFrequencyMax));

	const updateData: Record<string, any> = {
		channelFrequencyMin: min,
		channelFrequencyMax: max
	};
	if (typeof useNamePrimer === 'boolean') {
		updateData.useNamePrimer = useNamePrimer;
	}

	await db.update(users).set(updateData).where(eq(users.id, parseInt(userId)));

	return json({ success: true, channelFrequencyMin: min, channelFrequencyMax: max, useNamePrimer: useNamePrimer ?? false });
};
