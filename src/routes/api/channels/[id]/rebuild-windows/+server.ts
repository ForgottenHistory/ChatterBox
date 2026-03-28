import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { conversations, messages, characters, engagementWindows } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';

/**
 * POST - Rebuild engagement windows for all characters in a channel
 * by scanning their message history and inferring engagement periods.
 *
 * A "window" is a continuous stretch of messages where a character participated.
 * A gap of 30+ minutes between a character's messages starts a new window.
 *
 * Usage: fetch('/api/channels/1/rebuild-windows', { method: 'POST' })
 */
export const POST: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

	const channelId = parseInt(params.id);
	const uid = parseInt(userId);

	// Verify channel
	const [channel] = await db.select().from(conversations)
		.where(and(eq(conversations.id, channelId), eq(conversations.userId, uid), eq(conversations.conversationType, 'channel')))
		.limit(1);
	if (!channel) return json({ error: 'Channel not found' }, { status: 404 });

	// Get all messages in channel ordered by time
	const allMsgs = await db.select({ id: messages.id, characterId: messages.characterId, createdAt: messages.createdAt })
		.from(messages)
		.where(eq(messages.conversationId, channelId))
		.orderBy(asc(messages.createdAt));

	// Get all user's characters
	const allChars = await db.select({ id: characters.id, name: characters.name })
		.from(characters)
		.where(eq(characters.userId, uid));

	// Delete existing windows for this channel (rebuild from scratch)
	await db.delete(engagementWindows).where(eq(engagementWindows.channelId, channelId));

	const GAP_MS = 30 * 60 * 1000; // 30 min gap = new window
	let totalWindows = 0;
	const results: { character: string; windows: number }[] = [];

	for (const char of allChars) {
		// Find all messages by this character in this channel
		const charMsgIndices: number[] = [];
		for (let i = 0; i < allMsgs.length; i++) {
			if (allMsgs[i].characterId === char.id) {
				charMsgIndices.push(i);
			}
		}

		if (charMsgIndices.length === 0) {
			results.push({ character: char.name, windows: 0 });
			continue;
		}

		// Build windows from consecutive message clusters
		// A window starts a few messages before the character's first message in a cluster
		// and ends at the last message before a gap
		const CONTEXT_BEFORE = 10; // include some messages before character spoke
		let windowCount = 0;

		let clusterStart = charMsgIndices[0];
		let lastMsgTime = new Date(allMsgs[charMsgIndices[0]].createdAt).getTime();

		for (let j = 1; j <= charMsgIndices.length; j++) {
			const isLast = j === charMsgIndices.length;
			let gapDetected = false;

			if (!isLast) {
				const currentTime = new Date(allMsgs[charMsgIndices[j]].createdAt).getTime();
				gapDetected = currentTime - lastMsgTime > GAP_MS;
				if (!gapDetected) {
					lastMsgTime = currentTime;
					continue;
				}
			}

			// Close this window
			// Window spans from (clusterStart - CONTEXT_BEFORE) to the last message before the gap
			const prevIdx = isLast ? charMsgIndices[j - 1] : charMsgIndices[j - 1];
			// Find the last message in the channel at/after the last character message in this cluster
			// (include a few messages after too, as other people might have been talking)
			const endIdx = Math.min(allMsgs.length - 1, prevIdx + CONTEXT_BEFORE);
			const startIdx = Math.max(0, clusterStart - CONTEXT_BEFORE);

			const startMsgId = allMsgs[startIdx].id;
			const endMsgId = allMsgs[endIdx].id;

			await db.insert(engagementWindows).values({
				channelId,
				characterId: char.id,
				startMsgId,
				endMsgId
			});
			windowCount++;

			if (!isLast) {
				clusterStart = charMsgIndices[j];
				lastMsgTime = new Date(allMsgs[charMsgIndices[j]].createdAt).getTime();
			}
		}

		totalWindows += windowCount;
		results.push({ character: char.name, windows: windowCount });
	}

	return json({
		success: true,
		channel: channel.name,
		totalMessages: allMsgs.length,
		totalWindows,
		characters: results.filter(r => r.windows > 0)
	});
};
