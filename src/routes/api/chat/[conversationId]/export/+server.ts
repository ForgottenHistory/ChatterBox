import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { conversations, messages, characters } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Export conversation as JSON
export const GET: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const conversationId = parseInt(params.conversationId!);
	if (isNaN(conversationId)) {
		return json({ error: 'Invalid conversation ID' }, { status: 400 });
	}

	try {
		// Get conversation and verify ownership
		const [conversation] = await db
			.select()
			.from(conversations)
			.where(
				and(
					eq(conversations.id, conversationId),
					eq(conversations.userId, parseInt(userId))
				)
			)
			.limit(1);

		if (!conversation) {
			return json({ error: 'Conversation not found' }, { status: 404 });
		}

		// Get character info
		const [character] = await db
			.select({
				id: characters.id,
				name: characters.name,
				description: characters.description,
				tags: characters.tags
			})
			.from(characters)
			.where(eq(characters.id, conversation.characterId))
			.limit(1);

		// Get all messages
		const conversationMessages = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(messages.createdAt);

		const characterInfo = {
			name: character?.name,
			description: character?.description,
			tags: character?.tags ? JSON.parse(character.tags) : []
		};

		// Format messages for export
		const exportMessages = conversationMessages.map((msg) => ({
			role: msg.role,
			content: msg.content,
			senderName: msg.senderName,
			swipes: msg.swipes ? JSON.parse(msg.swipes) : null,
			currentSwipe: msg.currentSwipe,
			reasoning: msg.reasoning,
			createdAt: msg.createdAt?.toISOString()
		}));

		const exportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			character: characterInfo,
			conversation: {
				id: conversation.id,
				createdAt: conversation.createdAt?.toISOString(),
				messageCount: exportMessages.length
			},
			messages: exportMessages
		};

		return json(exportData);
	} catch (error) {
		console.error('Failed to export conversation:', error);
		return json({ error: 'Failed to export conversation' }, { status: 500 });
	}
};
