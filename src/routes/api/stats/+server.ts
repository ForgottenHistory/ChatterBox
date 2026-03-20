import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { messages, characters, conversations, characterMemories, llmUsageStats } from '$lib/server/db/schema';
import { eq, and, count, sql, sum } from 'drizzle-orm';

export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const uid = parseInt(userId);

	// Total messages across all channels
	const [totalMessages] = await db
		.select({ count: count() })
		.from(messages)
		.innerJoin(conversations, eq(messages.conversationId, conversations.id))
		.where(eq(conversations.userId, uid));

	// User vs AI messages
	const [userMessages] = await db
		.select({ count: count() })
		.from(messages)
		.innerJoin(conversations, eq(messages.conversationId, conversations.id))
		.where(and(eq(conversations.userId, uid), eq(messages.role, 'user')));

	const [aiMessages] = await db
		.select({ count: count() })
		.from(messages)
		.innerJoin(conversations, eq(messages.conversationId, conversations.id))
		.where(and(eq(conversations.userId, uid), eq(messages.role, 'assistant')));

	// Messages per character (top 10)
	const perCharacter = await db
		.select({
			name: characters.name,
			count: count()
		})
		.from(messages)
		.innerJoin(characters, eq(messages.characterId, characters.id))
		.innerJoin(conversations, eq(messages.conversationId, conversations.id))
		.where(eq(conversations.userId, uid))
		.groupBy(characters.name)
		.orderBy(sql`count(*) desc`)
		.limit(10);

	// Total characters
	const [totalChars] = await db
		.select({ count: count() })
		.from(characters)
		.where(eq(characters.userId, uid));

	// Total channels
	const [totalChannels] = await db
		.select({ count: count() })
		.from(conversations)
		.where(and(eq(conversations.userId, uid), eq(conversations.conversationType, 'channel')));

	// Total memories
	const [totalMemories] = await db
		.select({ count: count() })
		.from(characterMemories)
		.where(eq(characterMemories.userId, uid));

	// Memories per character (top 10)
	const memoriesPerCharacter = await db
		.select({
			name: characters.name,
			count: count()
		})
		.from(characterMemories)
		.innerJoin(characters, eq(characterMemories.characterId, characters.id))
		.where(eq(characterMemories.userId, uid))
		.groupBy(characters.name)
		.orderBy(sql`count(*) desc`)
		.limit(10);

	// LLM stats
	const [totalCalls] = await db
		.select({ count: count() })
		.from(llmUsageStats)
		.where(eq(llmUsageStats.userId, uid));

	const [successCalls] = await db
		.select({ count: count() })
		.from(llmUsageStats)
		.where(and(eq(llmUsageStats.userId, uid), eq(llmUsageStats.success, true)));

	const [tokenSums] = await db
		.select({
			prompt: sum(llmUsageStats.promptTokens),
			completion: sum(llmUsageStats.completionTokens),
			total: sum(llmUsageStats.totalTokens)
		})
		.from(llmUsageStats)
		.where(eq(llmUsageStats.userId, uid));

	// Model usage distribution
	const modelUsage = await db
		.select({
			model: llmUsageStats.model,
			count: count(),
			tokens: sum(llmUsageStats.totalTokens)
		})
		.from(llmUsageStats)
		.where(and(eq(llmUsageStats.userId, uid), eq(llmUsageStats.success, true)))
		.groupBy(llmUsageStats.model)
		.orderBy(sql`count(*) desc`)
		.limit(10);

	// Calls by type
	const callsByType = await db
		.select({
			type: llmUsageStats.messageType,
			count: count()
		})
		.from(llmUsageStats)
		.where(eq(llmUsageStats.userId, uid))
		.groupBy(llmUsageStats.messageType)
		.orderBy(sql`count(*) desc`);

	return json({
		messages: {
			total: totalMessages.count,
			user: userMessages.count,
			ai: aiMessages.count,
			perCharacter
		},
		characters: {
			total: totalChars.count
		},
		channels: totalChannels.count,
		memories: {
			total: totalMemories.count,
			perCharacter: memoriesPerCharacter
		},
		llm: {
			totalCalls: totalCalls.count,
			successCalls: successCalls.count,
			failedCalls: totalCalls.count - successCalls.count,
			tokens: {
				prompt: Number(tokenSums.prompt) || 0,
				completion: Number(tokenSums.completion) || 0,
				total: Number(tokenSums.total) || 0
			},
			modelUsage,
			callsByType
		}
	});
};
