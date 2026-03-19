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
		useNamePrimer: user.useNamePrimer,
		engageRollMin: user.engageRollMin,
		engageRollMax: user.engageRollMax,
		doubleTextChanceMin: user.doubleTextChanceMin,
		doubleTextChanceMax: user.doubleTextChanceMax,
		engageCooldown: user.engageCooldown,
		engageChanceOnline: user.engageChanceOnline,
		engageChanceAway: user.engageChanceAway,
		engageChanceBusy: user.engageChanceBusy,
		engageDurationOnline: user.engageDurationOnline,
		engageDurationAway: user.engageDurationAway,
		engageDurationBusy: user.engageDurationBusy
	});
};

export const PUT: RequestHandler = async ({ cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();

	const updateData: Record<string, any> = {};

	// Channel frequency
	if (typeof body.channelFrequencyMin === 'number' && typeof body.channelFrequencyMax === 'number') {
		const min = Math.max(1, Math.round(body.channelFrequencyMin));
		updateData.channelFrequencyMin = min;
		updateData.channelFrequencyMax = Math.max(min, Math.round(body.channelFrequencyMax));
	}

	// Name primer
	if (typeof body.useNamePrimer === 'boolean') {
		updateData.useNamePrimer = body.useNamePrimer;
	}

	// Engagement roll interval (minutes)
	if (typeof body.engageRollMin === 'number' && typeof body.engageRollMax === 'number') {
		const rollMin = Math.max(1, Math.round(body.engageRollMin));
		updateData.engageRollMin = rollMin;
		updateData.engageRollMax = Math.max(rollMin, Math.round(body.engageRollMax));
	}

	// Double text chance
	if (typeof body.doubleTextChanceMin === 'number' && typeof body.doubleTextChanceMax === 'number') {
		const dtMin = Math.max(0, Math.min(100, Math.round(body.doubleTextChanceMin)));
		updateData.doubleTextChanceMin = dtMin;
		updateData.doubleTextChanceMax = Math.max(dtMin, Math.min(100, Math.round(body.doubleTextChanceMax)));
	}

	// Engagement cooldown
	if (typeof body.engageCooldown === 'number') {
		updateData.engageCooldown = Math.max(0, Math.round(body.engageCooldown));
	}

	// Engagement chances (0-100)
	for (const key of ['engageChanceOnline', 'engageChanceAway', 'engageChanceBusy'] as const) {
		if (typeof body[key] === 'number') {
			updateData[key] = Math.max(0, Math.min(100, Math.round(body[key])));
		}
	}

	// Engagement durations (minutes, min 1)
	for (const key of ['engageDurationOnline', 'engageDurationAway', 'engageDurationBusy'] as const) {
		if (typeof body[key] === 'number') {
			updateData[key] = Math.max(1, Math.round(body[key]));
		}
	}

	if (Object.keys(updateData).length === 0) {
		return json({ error: 'No valid fields to update' }, { status: 400 });
	}

	await db.update(users).set(updateData).where(eq(users.id, parseInt(userId)));

	return json({ success: true, ...updateData });
};
