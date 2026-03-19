import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { conversations, messages } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - Get or create conversation and fetch messages
export const GET: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const characterId = parseInt(params.characterId!);
	if (isNaN(characterId)) {
		return json({ error: 'Invalid character ID' }, { status: 400 });
	}

	try {
		// Find active conversation for this character
		let [conversation] = await db
			.select()
			.from(conversations)
			.where(
				and(
					eq(conversations.userId, parseInt(userId)),
					eq(conversations.characterId, characterId),
					eq(conversations.isActive, true)
				)
			)
			.limit(1);

		// If no active conversation, try to find any conversation and make it active
		if (!conversation) {
			[conversation] = await db
				.select()
				.from(conversations)
				.where(
					and(
						eq(conversations.userId, parseInt(userId)),
						eq(conversations.characterId, characterId)
					)
				)
				.limit(1);

			if (conversation) {
				await db
					.update(conversations)
					.set({ isActive: true })
					.where(eq(conversations.id, conversation.id));
			}
		}

		// Create conversation if it doesn't exist
		if (!conversation) {
			[conversation] = await db
				.insert(conversations)
				.values({
					userId: parseInt(userId),
					characterId
				})
				.returning();
		}

		// Fetch messages for this conversation
		const conversationMessages = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversation.id))
			.orderBy(messages.createdAt);

		// Get all branches for this character
		const allBranches = await db
			.select()
			.from(conversations)
			.where(
				and(
					eq(conversations.userId, parseInt(userId)),
					eq(conversations.characterId, characterId)
				)
			)
			.orderBy(desc(conversations.createdAt));

		return json({
			conversationId: conversation.id,
			conversationName: conversation.name,
			messages: conversationMessages,
			branches: allBranches,
			activeBranchId: conversation.id
		});
	} catch (error) {
		console.error('Failed to load conversation:', error);
		return json({ error: 'Failed to load conversation' }, { status: 500 });
	}
};
