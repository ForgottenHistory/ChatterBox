import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { characterMemories, characters } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - Get all memories for a character
export const GET: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const characterId = parseInt(params.id!);

	// Verify character belongs to user
	const [character] = await db
		.select()
		.from(characters)
		.where(and(eq(characters.id, characterId), eq(characters.userId, parseInt(userId))))
		.limit(1);

	if (!character) {
		return json({ error: 'Character not found' }, { status: 404 });
	}

	const memories = await db
		.select()
		.from(characterMemories)
		.where(
			and(
				eq(characterMemories.characterId, characterId),
				eq(characterMemories.userId, parseInt(userId))
			)
		)
		.orderBy(desc(characterMemories.createdAt));

	return json({ memories, characterName: character.name });
};

// DELETE - Delete a specific memory
export const DELETE: RequestHandler = async ({ params, cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({}));
	const { memoryId } = body;

	if (!memoryId) {
		return json({ error: 'memoryId is required' }, { status: 400 });
	}

	// Verify the memory belongs to this user's character
	const [memory] = await db
		.select()
		.from(characterMemories)
		.where(
			and(
				eq(characterMemories.id, memoryId),
				eq(characterMemories.userId, parseInt(userId))
			)
		)
		.limit(1);

	if (!memory) {
		return json({ error: 'Memory not found' }, { status: 404 });
	}

	await db.delete(characterMemories).where(eq(characterMemories.id, memoryId));

	return json({ success: true });
};
