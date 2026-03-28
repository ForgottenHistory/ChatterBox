import { db } from '$lib/server/db';
import { conversations, messages, characters, engagementWindows, engagementState } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { logger } from '$lib/server/utils/logger';

/**
 * Rebuild engagement windows for all channels for all users.
 * Scans message history and infers engagement periods based on 30min gaps.
 */
export async function rebuildAllWindows(): Promise<void> {
	const GAP_MS = 30 * 60 * 1000;
	const CONTEXT_BEFORE = 10;

	// Get all users
	const allUsers = await db.selectDistinct({ userId: conversations.userId }).from(conversations)
		.where(eq(conversations.conversationType, 'channel'));

	let totalWindows = 0;

	for (const { userId } of allUsers) {
		const allChannels = await db.select().from(conversations)
			.where(and(eq(conversations.userId, userId), eq(conversations.conversationType, 'channel')));

		const allChars = await db.select({ id: characters.id }).from(characters)
			.where(eq(characters.userId, userId));

		// Wipe existing windows and expired state
		for (const chan of allChannels) {
			await db.delete(engagementWindows).where(eq(engagementWindows.channelId, chan.id));
			const states = await db.select().from(engagementState).where(eq(engagementState.channelId, chan.id));
			const now = Date.now();
			for (const s of states) {
				if (now >= s.engagedUntil) {
					await db.delete(engagementState).where(eq(engagementState.id, s.id));
				}
			}
		}

		for (const chan of allChannels) {
			const allMsgs = await db.select({ id: messages.id, characterId: messages.characterId, createdAt: messages.createdAt })
				.from(messages)
				.where(eq(messages.conversationId, chan.id))
				.orderBy(asc(messages.createdAt));

			for (const char of allChars) {
				const charMsgIndices: number[] = [];
				for (let i = 0; i < allMsgs.length; i++) {
					if (allMsgs[i].characterId === char.id) {
						charMsgIndices.push(i);
					}
				}

				if (charMsgIndices.length === 0) continue;

				let clusterStart = charMsgIndices[0];
				let lastMsgTime = new Date(allMsgs[charMsgIndices[0]].createdAt).getTime();

				for (let j = 1; j <= charMsgIndices.length; j++) {
					const isLast = j === charMsgIndices.length;

					if (!isLast) {
						const currentTime = new Date(allMsgs[charMsgIndices[j]].createdAt).getTime();
						if (currentTime - lastMsgTime <= GAP_MS) {
							lastMsgTime = currentTime;
							continue;
						}
					}

					const prevIdx = charMsgIndices[j - 1];
					const endIdx = Math.min(allMsgs.length - 1, prevIdx + CONTEXT_BEFORE);
					const startIdx = Math.max(0, clusterStart - CONTEXT_BEFORE);

					await db.insert(engagementWindows).values({
						channelId: chan.id,
						characterId: char.id,
						startMsgId: allMsgs[startIdx].id,
						endMsgId: allMsgs[endIdx].id
					});
					totalWindows++;

					if (!isLast) {
						clusterStart = charMsgIndices[j];
						lastMsgTime = new Date(allMsgs[charMsgIndices[j]].createdAt).getTime();
					}
				}
			}
		}
	}

	logger.info(`[WindowRebuild] Rebuilt ${totalWindows} engagement windows on startup`);
}
