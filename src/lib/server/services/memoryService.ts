import { db } from '../db';
import { characterMemories, messages, characters, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { callLlm } from './llmCallService';
import { llmSettingsService } from './llmSettingsService';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const MAX_MEMORIES_PER_CHARACTER = 50;
const MEMORY_PROMPT_FILE = path.join(process.cwd(), 'data', 'prompts', 'memory_extraction.txt');

const DEFAULT_EXTRACTION_PROMPT = `You are extracting NEW memories for "{{characterName}}" from this conversation.
Extract NEW facts about other people. Format: "score: memory text" (score 0-100).
If nothing new, return: NO_NEW_MEMORIES

CONVERSATION:
{{conversationHistory}}

EXISTING MEMORIES:
{{existingMemories}}`;

interface Memory {
	importance: number;
	content: string;
}

async function loadExtractionPrompt(): Promise<string> {
	try {
		return await fs.readFile(MEMORY_PROMPT_FILE, 'utf-8');
	} catch {
		return DEFAULT_EXTRACTION_PROMPT;
	}
}

function parseMemories(text: string): Memory[] {
	const memories: Memory[] = [];
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed === 'NO_NEW_MEMORIES') continue;

		// Match "score: text" format
		const match = trimmed.match(/^(\d{1,3})\s*[:\.]\s*(.+)$/);
		if (match) {
			const importance = Math.min(100, Math.max(0, parseInt(match[1])));
			const content = match[2].trim();
			if (content.length > 5) {
				memories.push({ importance, content });
			}
		}
	}
	return memories;
}

/**
 * Extract memories from a conversation for a specific character
 */
export async function extractMemories(
	characterId: number,
	userId: number,
	conversationId: number
): Promise<void> {
	try {
		// Get the character
		const [character] = await db
			.select()
			.from(characters)
			.where(eq(characters.id, characterId))
			.limit(1);

		if (!character) { logger.warn(`Memory extraction: character ${characterId} not found`); return; }

		logger.info(`Memory extraction starting for ${character.name} in conversation ${conversationId}`);

		// Get recent messages from this conversation (last 50)
		const recentMessages = await db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(desc(messages.createdAt))
			.limit(50);

		if (recentMessages.length < 3) { logger.info(`Memory extraction skipped for ${character.name}: only ${recentMessages.length} messages`); return; }

		// Reverse to chronological order
		recentMessages.reverse();

		// Format conversation history
		const historyLines = recentMessages.map(m => {
			const name = m.senderName || (m.role === 'user' ? 'User' : character.name);
			return `${name}: ${m.content}`;
		});

		// Get existing memories
		const existingMems = await db
			.select()
			.from(characterMemories)
			.where(
				and(
					eq(characterMemories.characterId, characterId),
					eq(characterMemories.userId, userId)
				)
			)
			.orderBy(desc(characterMemories.createdAt));

		// Apply memory decay — reduce importance scores on existing memories
		const [user] = await db.select({ memoryDecayPoints: users.memoryDecayPoints })
			.from(users).where(eq(users.id, userId)).limit(1);
		const decayPoints = user?.memoryDecayPoints ?? 2;

		if (decayPoints > 0 && existingMems.length > 0) {
			for (const mem of existingMems) {
				const match = mem.content.match(/^\[(\d{1,3})\]\s*(.+)$/);
				if (match) {
					const oldScore = parseInt(match[1]);
					const newScore = Math.max(0, oldScore - decayPoints);
					if (newScore !== oldScore) {
						const newContent = `[${newScore}] ${match[2]}`;
						await db.update(characterMemories)
							.set({ content: newContent, updatedAt: new Date() })
							.where(eq(characterMemories.id, mem.id));
						mem.content = newContent; // update local copy for prompt
					}
				}
			}

			// Remove memories that decayed to 0
			for (const mem of existingMems) {
				const match = mem.content.match(/^\[(\d{1,3})\]/);
				if (match && parseInt(match[1]) <= 0) {
					await db.delete(characterMemories).where(eq(characterMemories.id, mem.id));
				}
			}
		}

		// Format existing memories for prompt
		const existingFormatted = existingMems.length > 0
			? existingMems.filter(m => !m.content.match(/^\[0\]/)).map(m => m.content).join('\n')
			: '(none)';

		// Build prompt
		const template = await loadExtractionPrompt();
		const prompt = template
			.replace(/\{\{characterName\}\}/g, character.name)
			.replace(/\{\{conversationHistory\}\}/g, historyLines.join('\n'))
			.replace(/\{\{existingMemories\}\}/g, existingFormatted)
			.replace(/\{\{existingCount\}\}/g, String(existingMems.length))
			.replace(/\{\{maxMemories\}\}/g, String(MAX_MEMORIES_PER_CHARACTER));

		// Get LLM settings
		const settings = await llmSettingsService.getUserSettings(userId);

		// Call LLM
		const result = await callLlm({
			messages: [{ role: 'user', content: prompt }],
			settings,
			logType: 'memory-extraction',
			userId,
			logCharacterName: character.name
		});

		// Parse new memories
		const newMemories = parseMemories(result.content);

		if (newMemories.length === 0) {
			logger.info(`No new memories extracted for ${character.name}`);
			return;
		}

		// Save new memories
		for (const mem of newMemories) {
			await db.insert(characterMemories).values({
				characterId,
				userId,
				content: `[${mem.importance}] ${mem.content}`,
				source: 'conversation',
				sourceConversationId: conversationId
			});
		}

		// Prune if over capacity
		const allMems = await db
			.select()
			.from(characterMemories)
			.where(
				and(
					eq(characterMemories.characterId, characterId),
					eq(characterMemories.userId, userId)
				)
			)
			.orderBy(desc(characterMemories.createdAt));

		if (allMems.length > MAX_MEMORIES_PER_CHARACTER) {
			// Delete oldest beyond the cap
			const toDelete = allMems.slice(MAX_MEMORIES_PER_CHARACTER);
			for (const mem of toDelete) {
				await db.delete(characterMemories).where(eq(characterMemories.id, mem.id));
			}
		}

		logger.info(`Extracted ${newMemories.length} new memories for ${character.name}`);
	} catch (error) {
		logger.error(`Memory extraction failed for character ${characterId}:`, error);
	}
}

/**
 * Get formatted memories for injection into a prompt
 */
export async function getFormattedMemories(
	characterId: number,
	userId: number
): Promise<string> {
	const mems = await db
		.select()
		.from(characterMemories)
		.where(
			and(
				eq(characterMemories.characterId, characterId),
				eq(characterMemories.userId, userId)
			)
		)
		.orderBy(desc(characterMemories.createdAt))
		.limit(MAX_MEMORIES_PER_CHARACTER);

	if (mems.length === 0) return '';

	const lines = mems.map((m, i) => `${i + 1}. ${m.content}`);
	return `\nWHAT YOU KNOW ABOUT OTHERS:\n${lines.join('\n')}`;
}
