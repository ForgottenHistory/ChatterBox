import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { characters, llmSettings } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { callLlm } from '$lib/server/services/llmCallService';
import { llmSettingsService } from '$lib/server/services/llmSettingsService';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function buildSchedulePrompt(name: string, description: string, day?: string): string {
	const dayOrWeek = day ? `for ${day.toUpperCase()}` : 'for the full week (MONDAY through SUNDAY)';

	return `Based on the character description below, create a realistic schedule ${dayOrWeek} for ${name}.

Status meanings (USE ONLY THESE FOUR):
- ONLINE: Free and available to chat
- AWAY: Busy with activities but might check phone
- BUSY: At work or important tasks
- OFFLINE: Sleeping or unavailable

Character Description:
${description}

RULES:
- Format: HH:MM-HH:MM STATUS activity text
- Each day MUST cover full 24 hours (00:00 to 00:00)
- Time blocks must be continuous - no gaps
- Activities should be written as the character's status message - casual, first person, their personality
- Vary sleep schedules based on character lifestyle
- Weekend should differ from weekdays
- Mix solo and social activities based on personality
- Make activities specific and fun, not generic
- Use 1-2 emojis per activity

${day ? `${day.toUpperCase()}:` : 'MONDAY:'}`;
}

interface TimeBlock {
	start: string;
	end: string;
	status: 'online' | 'away' | 'busy' | 'offline';
	activity: string;
}

function parseSchedule(text: string): Record<string, TimeBlock[]> {
	const schedule: Record<string, TimeBlock[]> = {};
	let currentDay = '';

	for (const rawLine of text.split('\n')) {
		const line = rawLine.trim();
		if (!line) continue;

		// Check for day header
		const dayMatch = line.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*:?\s*$/i);
		if (dayMatch) {
			currentDay = dayMatch[1].toLowerCase();
			if (!schedule[currentDay]) schedule[currentDay] = [];
			continue;
		}

		// Check for time block: HH:MM-HH:MM STATUS activity
		const blockMatch = line.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(ONLINE|AWAY|BUSY|OFFLINE|OFLINE|AWY)\s+(.+)$/i);
		if (blockMatch) {
			if (!currentDay) currentDay = 'monday';
			if (!schedule[currentDay]) schedule[currentDay] = [];

			// Normalize status typos
			let status = blockMatch[3].toUpperCase();
			if (status === 'OFLINE') status = 'OFFLINE';
			if (status === 'AWY') status = 'AWAY';

			schedule[currentDay].push({
				start: blockMatch[1].padStart(5, '0'),
				end: blockMatch[2].padStart(5, '0'),
				status: status.toLowerCase() as TimeBlock['status'],
				activity: blockMatch[4].trim()
			});
		}
	}

	return schedule;
}

// POST - Generate schedule for a character
export const POST: RequestHandler = async ({ params, cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const characterId = parseInt(params.id);

	const [character] = await db
		.select()
		.from(characters)
		.where(
			and(
				eq(characters.id, characterId),
				eq(characters.userId, parseInt(userId))
			)
		)
		.limit(1);

	if (!character) {
		return json({ error: 'Character not found' }, { status: 404 });
	}

	if (!character.description) {
		return json({ error: 'Character needs a description to generate a schedule' }, { status: 400 });
	}

	const body = await request.json();
	const { mode, day } = body; // mode: 'full' | 'day', day: 'monday' etc.

	const settings = await llmSettingsService.getUserSettings(parseInt(userId));

	try {
		const prompt = buildSchedulePrompt(character.name, character.description, mode === 'day' ? day : undefined);

		const result = await callLlm({
			messages: [{ role: 'user', content: prompt }],
			settings,
			logType: 'schedule',
			logCharacterName: character.name
		});

		const parsed = parseSchedule(result.content);

		if (mode === 'day' && day) {
			// Single day regeneration
			const dayBlocks = parsed[day.toLowerCase()] || Object.values(parsed)[0] || [];

			// Merge into existing schedule
			let existingSchedule: Record<string, TimeBlock[]> = {};
			if (character.scheduleData) {
				try {
					const existing = JSON.parse(character.scheduleData);
					existingSchedule = existing.schedule || existing || {};
				} catch {}
			}
			existingSchedule[day.toLowerCase()] = dayBlocks;

			await db.update(characters).set({
				scheduleData: JSON.stringify({ schedule: existingSchedule })
			}).where(eq(characters.id, characterId));

			return json({ daySchedule: dayBlocks });
		} else {
			// Full week
			await db.update(characters).set({
				scheduleData: JSON.stringify({ schedule: parsed })
			}).where(eq(characters.id, characterId));

			return json({ schedule: parsed });
		}
	} catch (error: any) {
		console.error('Failed to generate schedule:', error);
		return json({ error: error.message || 'Failed to generate schedule' }, { status: 500 });
	}
};
