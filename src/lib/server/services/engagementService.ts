import { db } from '$lib/server/db';
import { characters, users, messages, engagementWindows, engagementState, conversations } from '$lib/server/db/schema';
import type { Character, Message } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateChannelMessage } from './channelGenerationService';
import { extractMemories } from './memoryService';
import { getSocketServer } from '$lib/server/socket';
import { logger } from '$lib/server/utils/logger';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const PROACTIVE_COOLDOWN = 30 * 60 * 1000;
const PROACTIVE_ENGAGE_BOOST = 1.5;
const ENGAGE_ROLL_COOLDOWN_MS = 10000;
const MAX_ROLL_DEPTH = 1;

type CharacterStatus = 'online' | 'away' | 'busy' | 'offline';

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function getCharacterStatus(character: Character): CharacterStatus {
	if (!character.scheduleData) return 'online';
	try {
		const parsed = JSON.parse(character.scheduleData);
		const schedule = parsed.schedule || parsed;
		const now = new Date();
		const day = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
		const blocks = schedule[day];
		if (!blocks) return 'online';
		const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
		for (const block of blocks) {
			if (timeStr >= block.start && timeStr < block.end) {
				return block.status as CharacterStatus;
			}
		}
	} catch {}
	return 'online';
}

class ChannelEngine {
	channelId: number;
	userId: number;
	engaged = new Map<number, number>();
	cooldowns = new Map<number, number>();
	engageStartMsgId = new Map<number, number>();
	engageWindows = new Map<number, [number, number][]>();
	lastProactiveTime = 0;

	engagementTimer: ReturnType<typeof setTimeout> | null = null;
	engageRollTimer: ReturnType<typeof setTimeout> | null = null;
	cleanupInterval: ReturnType<typeof setInterval> | null = null;
	engagementLoopRunning = false;
	generating = false;
	engageRollCooldown = 0;
	rollDepth = 0;

	// Cached data (refreshed periodically)
	private cachedCharacters: Character[] = [];
	private cachedBehaviourSettings: any = null;
	private cacheTime = 0;
	private readonly CACHE_TTL = 60000; // 60s

	constructor(channelId: number, userId: number) {
		this.channelId = channelId;
		this.userId = userId;
	}

	async ensureCache(): Promise<void> {
		if (Date.now() - this.cacheTime < this.CACHE_TTL && this.cachedCharacters.length > 0) return;
		this.cachedCharacters = await db.select().from(characters).where(eq(characters.userId, this.userId));
		const [userRow] = await db.select().from(users).where(eq(users.id, this.userId)).limit(1);
		this.cachedBehaviourSettings = userRow || null;
		this.cacheTime = Date.now();
	}

	getCharacters(): Character[] { return this.cachedCharacters; }
	getBehaviourSettings(): any { return this.cachedBehaviourSettings; }

	invalidateCache(): void { this.cacheTime = 0; }
}

class EngagementService {
	private engines = new Map<number, ChannelEngine>();

	// ─── Engine Lifecycle ───

	async activateChannel(channelId: number, userId: number): Promise<ChannelEngine> {
		let engine = this.engines.get(channelId);
		if (engine) {
			// Already active, just ensure timers are running
			await engine.ensureCache();
			if (!engine.engageRollTimer) this.scheduleNextRoll(engine);
			if (!engine.cleanupInterval) this.startCleanup(engine);
			return engine;
		}

		engine = new ChannelEngine(channelId, userId);
		this.engines.set(channelId, engine);

		// Load state from DB
		await this.loadStateFromDB(engine);
		await engine.ensureCache();

		// Start timers
		this.startCleanup(engine);
		this.scheduleNextRoll(engine);

		// If 2+ engaged, start the loop
		if (this.getActiveEngaged(engine).length >= 2) {
			this.startLoop(engine);
		}

		logger.info(`[Engagement] Activated channel ${channelId}`);
		return engine;
	}

	getEngine(channelId: number): ChannelEngine | undefined {
		return this.engines.get(channelId);
	}

	private async loadStateFromDB(engine: ChannelEngine): Promise<void> {
		// Load windows
		const windows = await db.select().from(engagementWindows)
			.where(eq(engagementWindows.channelId, engine.channelId));
		for (const w of windows) {
			const existing = engine.engageWindows.get(w.characterId) || [];
			existing.push([w.startMsgId, w.endMsgId]);
			engine.engageWindows.set(w.characterId, existing);
		}

		// Load active engagements
		const states = await db.select().from(engagementState)
			.where(eq(engagementState.channelId, engine.channelId));
		const now = Date.now();
		for (const s of states) {
			if (now < s.engagedUntil) {
				engine.engaged.set(s.characterId, s.engagedUntil);
				engine.engageStartMsgId.set(s.characterId, s.startMsgId);
			} else {
				// Clean up expired
				await db.delete(engagementState).where(eq(engagementState.id, s.id));
			}
		}
	}

	private async saveEngagementToDB(engine: ChannelEngine): Promise<void> {
		// Replace all engagement state for this channel
		await db.delete(engagementState).where(eq(engagementState.channelId, engine.channelId));
		for (const [charId, expiry] of engine.engaged) {
			const startMsgId = engine.engageStartMsgId.get(charId) ?? 0;
			await db.insert(engagementState).values({
				channelId: engine.channelId,
				characterId: charId,
				engagedUntil: expiry,
				startMsgId
			});
		}
	}

	private async saveWindowToDB(engine: ChannelEngine, charId: number, startMsgId: number, endMsgId: number): Promise<void> {
		await db.insert(engagementWindows).values({
			channelId: engine.channelId,
			characterId: charId,
			startMsgId,
			endMsgId
		});
	}

	// ─── Socket Emission ───

	private emitToChannel(channelId: number, event: string, data: any): void {
		const io = getSocketServer();
		if (!io) return;
		io.to(`conversation-${channelId}`).emit(event, data);
	}

	private emitEngagementChanged(engine: ChannelEngine): void {
		const engaged: Record<number, number> = {};
		const cooldowns: Record<number, number> = {};
		for (const [charId, expiry] of engine.engaged) engaged[charId] = expiry;
		for (const [charId, expiry] of engine.cooldowns) cooldowns[charId] = expiry;
		this.emitToChannel(engine.channelId, 'channel-engagement-changed', { engaged, cooldowns });
	}

	// ─── Status Helpers ───

	private getActiveEngaged(engine: ChannelEngine): number[] {
		const now = Date.now();
		const active: number[] = [];
		for (const [charId, expiry] of engine.engaged) {
			if (now < expiry) active.push(charId);
		}
		return active;
	}

	private getLastSpeakerId(engine: ChannelEngine, recentMessages: Message[]): number | null {
		for (let i = recentMessages.length - 1; i >= 0; i--) {
			if (recentMessages[i].role === 'assistant' && recentMessages[i].characterId) {
				return recentMessages[i].characterId;
			}
		}
		return null;
	}

	private canProactive(engine: ChannelEngine, recentMessages: Message[]): boolean {
		if (Date.now() - engine.lastProactiveTime < PROACTIVE_COOLDOWN) return false;
		if (recentMessages.length > 0) {
			const lastMsgTime = new Date(recentMessages[recentMessages.length - 1].createdAt).getTime();
			if (Date.now() - lastMsgTime < PROACTIVE_COOLDOWN) return false;
		}
		return true;
	}

	private getChanceDuration(engine: ChannelEngine, status: CharacterStatus): { chance: number; duration: number } {
		const s = engine.getBehaviourSettings();
		if (!s) return { chance: 0, duration: 0 };
		if (status === 'online') return { chance: s.engageChanceOnline ?? 80, duration: (s.engageDurationOnline ?? 5) * 60 * 1000 };
		if (status === 'away') return { chance: s.engageChanceAway ?? 30, duration: (s.engageDurationAway ?? 2) * 60 * 1000 };
		if (status === 'busy') return { chance: s.engageChanceBusy ?? 10, duration: (s.engageDurationBusy ?? 1) * 60 * 1000 };
		return { chance: 0, duration: 0 };
	}

	// ─── Window Management ───

	private async closeEngageWindow(engine: ChannelEngine, charId: number): Promise<void> {
		const startId = engine.engageStartMsgId.get(charId);
		if (startId === undefined) return;

		// Get the last message ID in channel
		const [lastMsg] = await db.select({ id: messages.id }).from(messages)
			.where(eq(messages.conversationId, engine.channelId))
			.orderBy(desc(messages.createdAt))
			.limit(1);
		const endId = lastMsg?.id ?? 0;

		const windows = engine.engageWindows.get(charId) || [];
		windows.push([startId, endId]);
		engine.engageWindows.set(charId, windows);
		engine.engageStartMsgId.delete(charId);

		await this.saveWindowToDB(engine, charId, startId, endId);
	}

	private getVisibleMessageIds(engine: ChannelEngine, characterId: number, offset: number, allMessages: Message[]): number[] {
		if (allMessages.length === 0) return [];

		const currentStartMsgId = engine.engageStartMsgId.get(characterId);
		const historicalWindows = engine.engageWindows.get(characterId) || [];

		// No tracking data — show all
		if (currentStartMsgId === undefined && historicalWindows.length === 0) {
			return allMessages.map(m => m.id);
		}

		const visible = new Set<number>();

		// Historical windows (with offset on both sides)
		for (const [startId, endId] of historicalWindows) {
			let startIdx = allMessages.findIndex(m => m.id >= startId);
			let endIdx = allMessages.findIndex(m => m.id > endId);
			if (startIdx === -1) continue;
			if (endIdx === -1) endIdx = allMessages.length;

			const from = Math.max(0, startIdx - offset);
			const to = Math.min(allMessages.length, endIdx + offset);
			for (let i = from; i < to; i++) {
				visible.add(allMessages[i].id);
			}
		}

		// Current engagement (start - offset to end)
		if (currentStartMsgId !== undefined) {
			let startIdx = allMessages.findIndex(m => m.id >= currentStartMsgId);
			if (startIdx === -1) startIdx = allMessages.length;
			const from = Math.max(0, startIdx - offset);
			for (let i = from; i < allMessages.length; i++) {
				visible.add(allMessages[i].id);
			}
		}

		return Array.from(visible);
	}

	// ─── Cleanup ───

	private startCleanup(engine: ChannelEngine): void {
		if (engine.cleanupInterval) return;
		engine.cleanupInterval = setInterval(() => {
			const sizeBefore = engine.engaged.size;
			if (sizeBefore === 0) return;
			this.cleanExpired(engine);
			if (engine.engaged.size < sizeBefore) {
				this.emitEngagementChanged(engine);
				this.saveEngagementToDB(engine);
			}
		}, 30000);
	}

	private async cleanExpired(engine: ChannelEngine): Promise<void> {
		const now = Date.now();
		const s = engine.getBehaviourSettings();
		const cooldownMs = (s?.engageCooldown ?? 5) * 60 * 1000;
		const chars = engine.getCharacters();

		for (const [charId, expiry] of engine.engaged) {
			if (now >= expiry) {
				const name = chars.find(c => c.id === charId)?.name || charId;
				logger.info(`[Engagement] ${name} expired in channel ${engine.channelId}`);
				engine.engaged.delete(charId);
				await this.closeEngageWindow(engine, charId);
				if (cooldownMs > 0) engine.cooldowns.set(charId, now + cooldownMs);

				// Trigger memory extraction
				extractMemories(charId, engine.userId, engine.channelId).catch(err =>
					logger.warn(`[Engagement] Memory extraction failed for ${name}:`, err)
				);
			}
		}
		for (const [charId, expiry] of engine.cooldowns) {
			if (now >= expiry) engine.cooldowns.delete(charId);
		}
	}

	// ─── Message Generation ───

	private async generateMessage(engine: ChannelEngine, characterId: number, proactive = false): Promise<boolean> {
		if (engine.generating) return false;
		engine.generating = true;

		try {
			await engine.ensureCache();
			const chars = engine.getCharacters();
			const character = chars.find(c => c.id === characterId);
			if (!character) return false;

			const s = engine.getBehaviourSettings();
			const offset = s?.engageContextOffset ?? 10;

			// Get all messages for windowing
			const allMessages = await db.select().from(messages)
				.where(eq(messages.conversationId, engine.channelId))
				.orderBy(messages.createdAt);

			const visibleMessageIds = this.getVisibleMessageIds(engine, characterId, offset, allMessages);
			const engagedCharacterIds = this.getActiveEngaged(engine);

			// Emit typing
			this.emitToChannel(engine.channelId, 'channel-typing', { characterName: character.name, isTyping: true });

			// Artificial typing delay
			await sleep(800 + Math.random() * 1200);

			const result = await generateChannelMessage(engine.channelId, engine.userId, characterId, {
				proactive,
				visibleMessageIds,
				engagedCharacterIds
			});

			// Stop typing
			this.emitToChannel(engine.channelId, 'channel-typing', { characterName: character.name, isTyping: false });

			if (result.ignored) {
				this.handleIgnore(engine.channelId, characterId);
				return false;
			}

			// Emit messages with delays between multi-line
			for (let i = 0; i < result.messages.length; i++) {
				if (i > 0) {
					this.emitToChannel(engine.channelId, 'channel-typing', { characterName: character.name, isTyping: true });
					await sleep(1000 + Math.random() * 1500);
					this.emitToChannel(engine.channelId, 'channel-typing', { characterName: character.name, isTyping: false });
				}
				this.emitToChannel(engine.channelId, 'channel-new-message', result.messages[i]);
			}

			return result.messages.length > 0;
		} catch (err) {
			logger.warn(`[Engagement] Generate failed in channel ${engine.channelId}:`, err);
			return false;
		} finally {
			engine.generating = false;
		}
	}

	// ─── Engagement Rolls ───

	async rollEngagement(engine: ChannelEngine): Promise<void> {
		const s = engine.getBehaviourSettings();
		const chars = engine.getCharacters();
		if (!s || chars.length === 0) return;
		if (Date.now() < engine.engageRollCooldown) return;
		if (engine.rollDepth >= MAX_ROLL_DEPTH) return;
		engine.rollDepth++;
		engine.engageRollCooldown = Date.now() + ENGAGE_ROLL_COOLDOWN_MS;

		try {
			await this.cleanExpired(engine);
			const now = Date.now();
			const newlyEngaged: number[] = [];

			for (const character of chars) {
				if (engine.engaged.has(character.id)) continue;
				if (engine.cooldowns.has(character.id)) continue;
				const status = getCharacterStatus(character);
				if (status === 'offline') continue;

				const { chance: baseChance, duration } = this.getChanceDuration(engine, status);
				if (Math.random() * 100 < baseChance) {
					engine.engaged.set(character.id, now + duration);
					const [lastMsg] = await db.select({ id: messages.id }).from(messages)
						.where(eq(messages.conversationId, engine.channelId))
						.orderBy(desc(messages.createdAt))
						.limit(1);
					engine.engageStartMsgId.set(character.id, lastMsg?.id ?? 0);
					newlyEngaged.push(character.id);
					if (newlyEngaged.length >= 2) break;
				}
			}

			if (newlyEngaged.length > 0) {
				await this.saveEngagementToDB(engine);
				this.emitEngagementChanged(engine);
				for (const charId of newlyEngaged) {
					await this.generateMessage(engine, charId);
				}
				if (this.getActiveEngaged(engine).length >= 2 && !engine.engagementLoopRunning) {
					this.startLoop(engine);
				}
			}
		} finally {
			engine.rollDepth--;
		}
	}

	private async rollEngagementOnce(engine: ChannelEngine, excludeId: number): Promise<void> {
		const s = engine.getBehaviourSettings();
		const chars = engine.getCharacters();
		if (!s || chars.length === 0) return;
		if (engine.rollDepth >= MAX_ROLL_DEPTH) return;
		engine.rollDepth++;

		try {
			const now = Date.now();
			for (const character of chars) {
				if (character.id === excludeId) continue;
				if (engine.engaged.has(character.id)) continue;
				if (engine.cooldowns.has(character.id) && now < (engine.cooldowns.get(character.id) ?? 0)) continue;
				const status = getCharacterStatus(character);
				if (status === 'offline') continue;

				const { chance: baseChance, duration } = this.getChanceDuration(engine, status);
				const boosted = Math.min(100, baseChance * PROACTIVE_ENGAGE_BOOST);
				if (Math.random() * 100 < boosted) {
					engine.engaged.set(character.id, now + duration);
					const [lastMsg] = await db.select({ id: messages.id }).from(messages)
						.where(eq(messages.conversationId, engine.channelId))
						.orderBy(desc(messages.createdAt))
						.limit(1);
					engine.engageStartMsgId.set(character.id, lastMsg?.id ?? 0);
					await this.saveEngagementToDB(engine);
					this.emitEngagementChanged(engine);
					await this.generateMessage(engine, character.id);
					break;
				}
			}
		} finally {
			engine.rollDepth--;
		}
	}

	async engageCharacter(engine: ChannelEngine, charId: number, allowProactive = true): Promise<void> {
		const chars = engine.getCharacters();
		const char = chars.find(c => c.id === charId);
		if (!char || !engine.getBehaviourSettings()) return;

		const status = getCharacterStatus(char);
		const { duration } = this.getChanceDuration(engine, status);
		const expiry = Date.now() + duration;
		logger.info(`[Engagement] ${char.name} engaged for ${Math.round(duration / 1000 / 60)}min in channel ${engine.channelId}`);
		engine.engaged.set(charId, expiry);

		const [lastMsg] = await db.select({ id: messages.id }).from(messages)
			.where(eq(messages.conversationId, engine.channelId))
			.orderBy(desc(messages.createdAt))
			.limit(1);
		engine.engageStartMsgId.set(charId, lastMsg?.id ?? 0);

		await this.saveEngagementToDB(engine);
		this.emitEngagementChanged(engine);

		// Get recent messages for proactive check
		const recentMessages = await db.select().from(messages)
			.where(eq(messages.conversationId, engine.channelId))
			.orderBy(desc(messages.createdAt))
			.limit(50);
		recentMessages.reverse();

		const useProactive = allowProactive && this.canProactive(engine, recentMessages);
		const succeeded = await this.generateMessage(engine, charId, useProactive);

		if (useProactive && succeeded) {
			engine.lastProactiveTime = Date.now();
			await this.rollEngagementOnce(engine, charId);
		}

		if (this.getActiveEngaged(engine).length >= 2 && !engine.engagementLoopRunning) {
			this.startLoop(engine);
		}
	}

	// ─── Engagement Loop ───

	private startLoop(engine: ChannelEngine): void {
		if (engine.engagementLoopRunning) return;
		engine.engagementLoopRunning = true;
		this.scheduleNextMessage(engine);
	}

	private stopLoop(engine: ChannelEngine): void {
		engine.engagementLoopRunning = false;
		if (engine.engagementTimer) { clearTimeout(engine.engagementTimer); engine.engagementTimer = null; }
	}

	private scheduleNextMessage(engine: ChannelEngine): void {
		if (!engine.engagementLoopRunning) return;
		const s = engine.getBehaviourSettings();
		if (!s) return;
		const active = this.getActiveEngaged(engine);
		if (active.length < 2) { this.stopLoop(engine); return; }

		const minDelay = (s.channelFrequencyMin ?? 5) * 1000;
		const maxDelay = (s.channelFrequencyMax ?? 30) * 1000;
		const delay = minDelay + Math.random() * (maxDelay - minDelay);

		engine.engagementTimer = setTimeout(async () => {
			engine.engagementTimer = null;
			const currentActive = this.getActiveEngaged(engine);
			if (currentActive.length < 2) { this.stopLoop(engine); return; }

			await engine.ensureCache();

			// Pick speaker with double-text logic
			const dtMin = s.doubleTextChanceMin ?? 10;
			const dtMax = s.doubleTextChanceMax ?? 30;
			const dtChance = dtMin + Math.random() * (dtMax - dtMin);

			const recentMsgs = await db.select().from(messages)
				.where(eq(messages.conversationId, engine.channelId))
				.orderBy(desc(messages.createdAt))
				.limit(10);
			recentMsgs.reverse();
			const lastSpk = this.getLastSpeakerId(engine, recentMsgs);
			const others = currentActive.filter(id => id !== lastSpk);

			let charId: number;
			if (others.length > 0 && lastSpk && currentActive.includes(lastSpk)) {
				charId = Math.random() * 100 < dtChance ? lastSpk : others[Math.floor(Math.random() * others.length)];
			} else if (others.length > 0) {
				charId = others[Math.floor(Math.random() * others.length)];
			} else {
				charId = currentActive[Math.floor(Math.random() * currentActive.length)];
			}

			await this.generateMessage(engine, charId);
			await this.cleanExpired(engine);
			this.emitEngagementChanged(engine);

			if (engine.engagementLoopRunning && this.getActiveEngaged(engine).length >= 2) {
				this.scheduleNextMessage(engine);
			} else {
				this.stopLoop(engine);
			}
		}, delay);
	}

	// ─── Triggered Response (user sent message) ───

	async onUserMessage(channelId: number, userId: number, messageText: string): Promise<void> {
		let engine = this.engines.get(channelId);
		if (!engine) {
			engine = await this.activateChannel(channelId, userId);
		}
		await engine.ensureCache();

		const active = this.getActiveEngaged(engine);
		if (active.length > 0) {
			// Cancel pending loop message — user took priority
			if (engine.engagementTimer) { clearTimeout(engine.engagementTimer); engine.engagementTimer = null; }

			const chars = engine.getCharacters();
			let charId: number | undefined;

			// Name mention matching
			const msgLower = messageText.toLowerCase();
			for (const id of active) {
				const char = chars.find(c => c.id === id);
				if (char && msgLower.includes(char.name.toLowerCase())) { charId = id; break; }
			}
			if (!charId) {
				for (const id of active) {
					const char = chars.find(c => c.id === id);
					if (char) {
						const firstName = char.name.split(' ')[0].toLowerCase();
						if (firstName.length >= 3 && msgLower.includes(firstName)) { charId = id; break; }
					}
				}
			}
			if (!charId) charId = active[Math.floor(Math.random() * active.length)];

			await this.generateMessage(engine, charId);

			// Chance to pull in another character
			const s = engine.getBehaviourSettings();
			const joinChance = (s?.joinChancePerMessage ?? 1) / 100;
			if (joinChance > 0 && Math.random() < joinChance) {
				const available = chars.filter(c =>
					!engine!.engaged.has(c.id) && !engine!.cooldowns.has(c.id) && getCharacterStatus(c) !== 'offline'
				);
				if (available.length > 0) {
					const char = available[Math.floor(Math.random() * available.length)];
					await this.engageCharacter(engine, char.id, false);
				}
			}

			if (this.getActiveEngaged(engine).length >= 2) {
				if (!engine.engagementLoopRunning) this.startLoop(engine);
				else this.scheduleNextMessage(engine);
			}
		} else {
			// No one engaged — roll for engagement
			await this.rollEngagement(engine);
		}
	}

	// ─── Periodic Roll ───

	private scheduleNextRoll(engine: ChannelEngine): void {
		const s = engine.getBehaviourSettings();
		if (!s) {
			// Settings not loaded yet, retry in 5s
			engine.engageRollTimer = setTimeout(() => {
				engine.engageRollTimer = null;
				this.scheduleNextRoll(engine);
			}, 5000);
			return;
		}
		const minDelay = (s.engageRollMin ?? 1) * 60 * 1000;
		const maxDelay = (s.engageRollMax ?? 3) * 60 * 1000;
		const delay = minDelay + Math.random() * (maxDelay - minDelay);

		engine.engageRollTimer = setTimeout(async () => {
			engine.engageRollTimer = null;
			await engine.ensureCache();
			const chars = engine.getCharacters();
			const available = chars.filter(c =>
				!engine.engaged.has(c.id) && !engine.cooldowns.has(c.id) && getCharacterStatus(c) !== 'offline'
			);
			if (available.length > 0) {
				const char = available[Math.floor(Math.random() * available.length)];
				logger.info(`[Engagement Roll] Periodic — trying ${char.name} in channel ${engine.channelId}`);
				await this.engageCharacter(engine, char.id);
			}
			this.scheduleNextRoll(engine);
		}, delay);
	}

	// ─── Handle Ignore ───

	async handleIgnore(channelId: number, characterId: number): Promise<void> {
		const engine = this.engines.get(channelId);
		if (!engine) return;

		engine.engaged.delete(characterId);
		await this.closeEngageWindow(engine, characterId);
		const s = engine.getBehaviourSettings();
		const cooldownMs = (s?.engageCooldown ?? 5) * 60 * 1000;
		if (cooldownMs > 0) engine.cooldowns.set(characterId, Date.now() + cooldownMs);

		extractMemories(characterId, engine.userId, engine.channelId).catch(err =>
			logger.warn('[Engagement] Memory extraction failed on ignore:', err)
		);

		await this.saveEngagementToDB(engine);
		this.emitEngagementChanged(engine);

		if (this.getActiveEngaged(engine).length < 2) {
			this.stopLoop(engine);
		}
	}

	// ─── Debug ───

	async debugEngageRandom(channelId: number): Promise<void> {
		const engine = this.engines.get(channelId);
		if (!engine) { logger.warn(`[Engagement] debugEngageRandom: no engine for channel ${channelId}`); return; }
		await engine.ensureCache();
		const chars = engine.getCharacters();
		if (chars.length === 0) { logger.warn(`[Engagement] debugEngageRandom: no characters`); return; }
		if (!engine.getBehaviourSettings()) { logger.warn(`[Engagement] debugEngageRandom: no behaviour settings`); return; }
		const available = chars.filter(c => !engine.engaged.has(c.id) && getCharacterStatus(c) !== 'offline');
		if (available.length === 0) { logger.warn(`[Engagement] debugEngageRandom: no available characters`); return; }
		const char = available[Math.floor(Math.random() * available.length)];
		logger.info(`[Engagement] debugEngageRandom: engaging ${char.name} in channel ${channelId}`);
		await this.engageCharacter(engine, char.id);
	}

	async debugClear(channelId: number): Promise<void> {
		const engine = this.engines.get(channelId);
		if (!engine) return;

		this.stopLoop(engine);

		// Extract memories for all engaged
		for (const [charId] of engine.engaged) {
			extractMemories(charId, engine.userId, engine.channelId).catch(() => {});
		}

		engine.engaged = new Map();
		engine.cooldowns = new Map();
		engine.lastProactiveTime = 0;
		engine.engageWindows = new Map();
		engine.engageStartMsgId = new Map();

		await db.delete(engagementWindows).where(eq(engagementWindows.channelId, channelId));
		await db.delete(engagementState).where(eq(engagementState.channelId, channelId));

		this.emitEngagementChanged(engine);
		logger.info(`[Engagement] All cleared for channel ${channelId}`);
	}

	// ─── Get Current State (for client on join) ───

	getState(channelId: number): { engaged: Record<number, number>; cooldowns: Record<number, number> } {
		const engine = this.engines.get(channelId);
		const engaged: Record<number, number> = {};
		const cooldowns: Record<number, number> = {};
		if (engine) {
			for (const [charId, expiry] of engine.engaged) engaged[charId] = expiry;
			for (const [charId, expiry] of engine.cooldowns) cooldowns[charId] = expiry;
		}
		return { engaged, cooldowns };
	}

	// ─── Destroy ───

	destroyEngine(channelId: number): void {
		const engine = this.engines.get(channelId);
		if (!engine) return;
		this.stopLoop(engine);
		if (engine.engageRollTimer) { clearTimeout(engine.engageRollTimer); engine.engageRollTimer = null; }
		if (engine.cleanupInterval) { clearInterval(engine.cleanupInterval); engine.cleanupInterval = null; }
		this.engines.delete(channelId);
	}

	destroyAll(): void {
		for (const channelId of this.engines.keys()) {
			this.destroyEngine(channelId);
		}
	}
}

// ─── Singleton with hot reload persistence ───

declare global {
	var __engagementService: EngagementService | undefined;
}

export const engagementService = global.__engagementService || new EngagementService();
global.__engagementService = engagementService;
