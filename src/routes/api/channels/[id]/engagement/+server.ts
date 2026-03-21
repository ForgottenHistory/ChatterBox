import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations, engagementWindows, engagementState } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Load engagement state for a channel
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

	const windows = await db
		.select()
		.from(engagementWindows)
		.where(eq(engagementWindows.channelId, channelId));

	const state = await db
		.select()
		.from(engagementState)
		.where(eq(engagementState.channelId, channelId));

	// Group windows by characterId
	const windowsByChar: Record<number, [number, number][]> = {};
	for (const w of windows) {
		if (!windowsByChar[w.characterId]) windowsByChar[w.characterId] = [];
		windowsByChar[w.characterId].push([w.startMsgId, w.endMsgId]);
	}

	// Build engaged map (filter expired)
	const now = Date.now();
	const engaged: Record<number, number> = {};
	const engageStartMsgId: Record<number, number> = {};
	for (const s of state) {
		if (now < s.engagedUntil) {
			engaged[s.characterId] = s.engagedUntil;
			engageStartMsgId[s.characterId] = s.startMsgId;
		} else {
			// Expired - clean up
			await db.delete(engagementState).where(eq(engagementState.id, s.id));
		}
	}

	return json({ windows: windowsByChar, engaged, engageStartMsgId });
};

// POST - Save engagement state for a channel
export const POST: RequestHandler = async ({ params, cookies, request }) => {
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

	const body = await request.json();

	// Save closed windows (append new ones)
	if (body.newWindows && Array.isArray(body.newWindows)) {
		for (const w of body.newWindows) {
			await db.insert(engagementWindows).values({
				channelId,
				characterId: w.characterId,
				startMsgId: w.startMsgId,
				endMsgId: w.endMsgId
			});
		}
	}

	// Sync current engagement state (replace all for this channel)
	if (body.engaged) {
		await db.delete(engagementState).where(eq(engagementState.channelId, channelId));
		for (const [charIdStr, expiry] of Object.entries(body.engaged)) {
			const charId = parseInt(charIdStr);
			const startMsgId = body.engageStartMsgId?.[charIdStr] ?? 0;
			await db.insert(engagementState).values({
				channelId,
				characterId: charId,
				engagedUntil: expiry as number,
				startMsgId
			});
		}
	}

	return json({ ok: true });
};

// DELETE - Clear all engagement state for a channel
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

	await db.delete(engagementWindows).where(eq(engagementWindows.channelId, channelId));
	await db.delete(engagementState).where(eq(engagementState.channelId, channelId));

	return json({ ok: true });
};
