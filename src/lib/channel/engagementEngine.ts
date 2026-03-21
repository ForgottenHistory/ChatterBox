import type { Character, Message } from '$lib/server/db/schema';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const PROACTIVE_COOLDOWN = 30 * 60 * 1000;
const PROACTIVE_ENGAGE_BOOST = 1.5;
const ENGAGE_ROLL_COOLDOWN_MS = 10000;
const MAX_ROLL_DEPTH = 1;

export type CharacterStatus = 'online' | 'away' | 'busy' | 'offline';

export interface EngagementCallbacks {
	getMessages: () => Message[];
	getCharacters: () => Character[];
	getBehaviourSettings: () => any;
	generateMessage: (characterId: number, proactive?: boolean) => Promise<void>;
	triggerMemoryExtraction: (characterId: number) => void;
	onEngagementChanged: () => void; // notify UI to re-render
}

interface PersistedState {
	engaged: [number, number][];
	cooldowns: [number, number][];
	engageStartMsgId: [number, number][];
	engageWindows: [number, [number, number][]][];
	lastProactive: number;
}

export class EngagementEngine {
	engaged = new Map<number, number>();
	cooldowns = new Map<number, number>();
	engageStartMsgId = new Map<number, number>(); // characterId -> message ID when they engaged (current)
	// All engagement windows: characterId -> array of [startMsgId, endMsgId] pairs
	engageWindows = new Map<number, [number, number][]>();
	lastProactiveTime = 0;

	private callbacks: EngagementCallbacks;
	private channelId: number;
	private engagementTimer: ReturnType<typeof setTimeout> | null = null;
	private engagementLoopRunning = false;
	private engageRollCooldown = 0;
	private rollDepth = 0;
	private engageRollTimer: ReturnType<typeof setTimeout> | null = null;
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;
	private pendingWindows: Array<{ characterId: number; startMsgId: number; endMsgId: number }> = [];
	private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private loaded = false;

	constructor(channelId: number, callbacks: EngagementCallbacks) {
		this.channelId = channelId;
		this.callbacks = callbacks;
		this.loadState();

		// Periodic cleanup every 30s to catch expired engagements
		this.cleanupInterval = setInterval(() => {
			const sizeBefore = this.engaged.size;
			if (sizeBefore === 0) return;
			this.cleanExpired();
			if (this.engaged.size < sizeBefore) {
				this.callbacks.onEngagementChanged();
				this.saveState();
			}
		}, 30000);
	}

	// ─── Persistence ───

	private async loadState() {
		// Try loading from server first
		try {
			const res = await fetch(`/api/channels/${this.channelId}/engagement`);
			if (res.ok) {
				const data = await res.json();
				const now = Date.now();

				// Load windows
				if (data.windows) {
					for (const [charIdStr, wins] of Object.entries(data.windows)) {
						this.engageWindows.set(parseInt(charIdStr), wins as [number, number][]);
					}
				}

				// Load engaged state
				if (data.engaged) {
					for (const [charIdStr, expiry] of Object.entries(data.engaged)) {
						if (now < (expiry as number)) {
							this.engaged.set(parseInt(charIdStr), expiry as number);
						}
					}
				}
				if (data.engageStartMsgId) {
					for (const [charIdStr, msgId] of Object.entries(data.engageStartMsgId)) {
						this.engageStartMsgId.set(parseInt(charIdStr), msgId as number);
					}
				}

				// Migrate any leftover localStorage data
				await this.migrateFromLocalStorage();
				this.loaded = true;
				this.callbacks.onEngagementChanged();
				return;
			}
		} catch (err) {
			console.warn('[Engagement] Failed to load from server, falling back to localStorage:', err);
		}

		// Fallback: load from localStorage (pre-migration)
		this.loadFromLocalStorage();
		this.loaded = true;
	}

	private loadFromLocalStorage() {
		try {
			const storageKey = `engagement-${this.channelId}`;
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const parsed: PersistedState = JSON.parse(saved);
				const now = Date.now();
				this.engaged = new Map((parsed.engaged || []).filter(([_, exp]) => now < exp));
				this.cooldowns = new Map((parsed.cooldowns || []).filter(([_, exp]) => now < exp));
				this.engageStartMsgId = new Map(parsed.engageStartMsgId || []);
				this.engageWindows = new Map(parsed.engageWindows || []);
				this.lastProactiveTime = parsed.lastProactive || 0;
			}
		} catch {}
	}

	private async migrateFromLocalStorage() {
		const storageKey = `engagement-${this.channelId}`;
		const saved = localStorage.getItem(storageKey);
		if (!saved) return;

		try {
			const parsed: PersistedState = JSON.parse(saved);
			const now = Date.now();

			// Merge localStorage windows into server state
			const localWindows = new Map<number, [number, number][]>(parsed.engageWindows || []);
			const newWindows: Array<{ characterId: number; startMsgId: number; endMsgId: number }> = [];

			for (const [charId, wins] of localWindows) {
				const serverWins = this.engageWindows.get(charId) || [];
				const serverSet = new Set(serverWins.map(([s, e]) => `${s}-${e}`));

				for (const [startMsgId, endMsgId] of wins) {
					if (!serverSet.has(`${startMsgId}-${endMsgId}`)) {
						newWindows.push({ characterId: charId, startMsgId, endMsgId });
						serverWins.push([startMsgId, endMsgId]);
					}
				}
				if (serverWins.length > 0) {
					this.engageWindows.set(charId, serverWins);
				}
			}

			// Merge engaged state
			const localEngaged = new Map<number, number>((parsed.engaged || []).filter(([_, exp]) => now < exp));
			for (const [charId, expiry] of localEngaged) {
				if (!this.engaged.has(charId)) {
					this.engaged.set(charId, expiry);
				}
			}

			const localStartMsgId = new Map<number, number>(parsed.engageStartMsgId || []);
			for (const [charId, msgId] of localStartMsgId) {
				if (!this.engageStartMsgId.has(charId)) {
					this.engageStartMsgId.set(charId, msgId);
				}
			}

			this.lastProactiveTime = Math.max(this.lastProactiveTime, parsed.lastProactive || 0);

			// Push merged data to server
			if (newWindows.length > 0 || localEngaged.size > 0) {
				await this.pushToServer(newWindows);
			}

			// Remove localStorage entry after successful migration
			localStorage.removeItem(storageKey);
			console.log(`[Engagement] Migrated localStorage data for channel ${this.channelId} to server`);
		} catch (err) {
			console.warn('[Engagement] Migration from localStorage failed:', err);
		}
	}

	private async pushToServer(newWindows: Array<{ characterId: number; startMsgId: number; endMsgId: number }> = []) {
		try {
			const engaged: Record<string, number> = {};
			const engageStartMsgId: Record<string, number> = {};
			for (const [charId, expiry] of this.engaged) {
				engaged[charId] = expiry;
			}
			for (const [charId, msgId] of this.engageStartMsgId) {
				engageStartMsgId[charId] = msgId;
			}

			await fetch(`/api/channels/${this.channelId}/engagement`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newWindows, engaged, engageStartMsgId })
			});
		} catch (err) {
			console.warn('[Engagement] Failed to push state to server:', err);
		}
	}

	saveState() {
		// Debounce server saves to avoid hammering on rapid state changes
		if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
		this.saveDebounceTimer = setTimeout(() => {
			this.saveDebounceTimer = null;
			const windowsToSave = [...this.pendingWindows];
			this.pendingWindows = [];
			this.pushToServer(windowsToSave);
		}, 500);
	}

	// ─── Status Helpers ───

	getCharacterStatus(character: Character): CharacterStatus {
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

	getActiveEngaged(): number[] {
		const now = Date.now();
		const active: number[] = [];
		for (const [charId, expiry] of this.engaged) {
			if (now < expiry) active.push(charId);
		}
		return active;
	}

	getLastSpeakerId(): number | null {
		const msgs = this.callbacks.getMessages();
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i].role === 'assistant' && msgs[i].characterId) {
				return msgs[i].characterId;
			}
		}
		return null;
	}

	canProactive(): boolean {
		if (Date.now() - this.lastProactiveTime < PROACTIVE_COOLDOWN) return false;
		const msgs = this.callbacks.getMessages();
		if (msgs.length > 0) {
			const lastMsgTime = new Date(msgs[msgs.length - 1].createdAt).getTime();
			if (Date.now() - lastMsgTime < PROACTIVE_COOLDOWN) return false;
		}
		return true;
	}

	private getChanceDuration(status: CharacterStatus): { chance: number; duration: number } {
		const s = this.callbacks.getBehaviourSettings();
		if (!s) return { chance: 0, duration: 0 };
		if (status === 'online') return { chance: s.engageChanceOnline ?? 80, duration: (s.engageDurationOnline ?? 5) * 60 * 1000 };
		if (status === 'away') return { chance: s.engageChanceAway ?? 30, duration: (s.engageDurationAway ?? 2) * 60 * 1000 };
		if (status === 'busy') return { chance: s.engageChanceBusy ?? 10, duration: (s.engageDurationBusy ?? 1) * 60 * 1000 };
		return { chance: 0, duration: 0 };
	}

	private closeEngageWindow(charId: number) {
		const startId = this.engageStartMsgId.get(charId);
		if (startId === undefined) return;
		const msgs = this.callbacks.getMessages();
		const endId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
		const windows = this.engageWindows.get(charId) || [];
		windows.push([startId, endId]);
		this.engageWindows.set(charId, windows);
		this.engageStartMsgId.delete(charId);
		// Queue window for server save
		this.pendingWindows.push({ characterId: charId, startMsgId: startId, endMsgId: endId });
	}

	private cleanExpired() {
		const now = Date.now();
		const s = this.callbacks.getBehaviourSettings();
		const cooldownMs = (s?.engageCooldown ?? 5) * 60 * 1000;
		const chars = this.callbacks.getCharacters();

		for (const [charId, expiry] of this.engaged) {
			if (now >= expiry) {
				const name = chars.find(c => c.id === charId)?.name || charId;
				console.log(`[Engagement] ${name} expired`);
				this.engaged.delete(charId);
				this.closeEngageWindow(charId);
				if (cooldownMs > 0) this.cooldowns.set(charId, now + cooldownMs);
				this.callbacks.triggerMemoryExtraction(charId);
			}
		}
		for (const [charId, expiry] of this.cooldowns) {
			if (now >= expiry) this.cooldowns.delete(charId);
		}
	}

	// ─── Engagement Rolls ───

	async rollEngagement() {
		const s = this.callbacks.getBehaviourSettings();
		const chars = this.callbacks.getCharacters();
		if (!s || chars.length === 0) return;
		if (Date.now() < this.engageRollCooldown) return;
		if (this.rollDepth >= MAX_ROLL_DEPTH) return;
		this.rollDepth++;
		this.engageRollCooldown = Date.now() + ENGAGE_ROLL_COOLDOWN_MS;

		try {
			this.cleanExpired();
			const now = Date.now();
			const newlyEngaged: number[] = [];

			for (const character of chars) {
				if (this.engaged.has(character.id)) continue;
				if (this.cooldowns.has(character.id)) continue;
				const status = this.getCharacterStatus(character);
				if (status === 'offline') continue;

				const { chance: baseChance, duration } = this.getChanceDuration(status);
				if (Math.random() * 100 < baseChance) {
					this.engaged.set(character.id, now + duration);
					const msgs = this.callbacks.getMessages();
					this.engageStartMsgId.set(character.id, msgs.length > 0 ? msgs[msgs.length - 1].id : 0);
					newlyEngaged.push(character.id);
					if (newlyEngaged.length >= 2) break;
				}
			}

			if (newlyEngaged.length > 0) {
				this.callbacks.onEngagementChanged();
				for (const charId of newlyEngaged) {
					try { await this.callbacks.generateMessage(charId); } catch (e) { console.error('[Engagement] First message failed:', e); }
				}
			}
		} finally {
			this.rollDepth--;
		}
	}

	async rollEngagementOnce(excludeId: number) {
		const s = this.callbacks.getBehaviourSettings();
		const chars = this.callbacks.getCharacters();
		if (!s || chars.length === 0) return;
		if (this.rollDepth >= MAX_ROLL_DEPTH) return;
		this.rollDepth++;

		try {
			const now = Date.now();
			for (const character of chars) {
				if (character.id === excludeId) continue;
				if (this.engaged.has(character.id)) continue;
				if (this.cooldowns.has(character.id) && now < (this.cooldowns.get(character.id) ?? 0)) continue;
				const status = this.getCharacterStatus(character);
				if (status === 'offline') continue;

				const { chance: baseChance, duration } = this.getChanceDuration(status);
				const boosted = Math.min(100, baseChance * PROACTIVE_ENGAGE_BOOST);
				if (Math.random() * 100 < boosted) {
					this.engaged.set(character.id, now + duration);
					this.callbacks.onEngagementChanged();
					try { await this.callbacks.generateMessage(character.id); } catch (e) { console.error('[Engagement] One-shot failed:', e); }
					break;
				}
			}
		} finally {
			this.rollDepth--;
		}
	}

	async engageCharacter(charId: number, allowProactive = true) {
		const chars = this.callbacks.getCharacters();
		const char = chars.find(c => c.id === charId);
		if (!char || !this.callbacks.getBehaviourSettings()) return;

		const status = this.getCharacterStatus(char);
		const { duration } = this.getChanceDuration(status);
		const expiry = Date.now() + duration;
		console.log(`[Engagement] ${char.name} engaged for ${Math.round(duration/1000/60)}min (status: ${status})`);
		this.engaged.set(charId, expiry);
		const msgs = this.callbacks.getMessages();
		const lastMsgId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
		this.engageStartMsgId.set(charId, lastMsgId);
		this.callbacks.onEngagementChanged();

		const useProactive = allowProactive && this.canProactive() && Math.random() < 0.5;

		const msgsBefore = this.callbacks.getMessages().length;
		await this.callbacks.generateMessage(charId, useProactive);
		const succeeded = this.callbacks.getMessages().length > msgsBefore;

		if (useProactive && succeeded) {
			this.lastProactiveTime = Date.now();
			await this.rollEngagementOnce(charId);
		}
	}

	// ─── Engagement Loop ───

	startLoop() {
		if (this.engagementLoopRunning) return;
		this.engagementLoopRunning = true;
		this.scheduleNextMessage();
	}

	stopLoop() {
		this.engagementLoopRunning = false;
		if (this.engagementTimer) { clearTimeout(this.engagementTimer); this.engagementTimer = null; }
	}

	checkLoop() {
		if (this.getActiveEngaged().length >= 2 && !this.engagementLoopRunning && this.callbacks.getBehaviourSettings()) {
			this.startLoop();
		}
	}

	private scheduleNextMessage() {
		if (!this.engagementLoopRunning) return;
		const s = this.callbacks.getBehaviourSettings();
		if (!s) return;
		const active = this.getActiveEngaged();
		if (active.length < 2) { this.stopLoop(); return; }

		const minDelay = (s.channelFrequencyMin ?? 5) * 1000;
		const maxDelay = (s.channelFrequencyMax ?? 30) * 1000;
		const delay = minDelay + Math.random() * (maxDelay - minDelay);

		this.engagementTimer = setTimeout(async () => {
			this.engagementTimer = null;
			const currentActive = this.getActiveEngaged();
			if (currentActive.length < 2) { this.stopLoop(); return; }

			// Pick speaker with double-text logic
			const dtMin = s.doubleTextChanceMin ?? 10;
			const dtMax = s.doubleTextChanceMax ?? 30;
			const dtChance = dtMin + Math.random() * (dtMax - dtMin);
			const lastSpk = this.getLastSpeakerId();
			const others = currentActive.filter(id => id !== lastSpk);
			const chars = this.callbacks.getCharacters();
			const name = (id: number) => chars.find(c => c.id === id)?.name || id;

			let charId: number;
			if (others.length > 0 && lastSpk && currentActive.includes(lastSpk)) {
				charId = Math.random() * 100 < dtChance ? lastSpk : others[Math.floor(Math.random() * others.length)];
			} else if (others.length > 0) {
				charId = others[Math.floor(Math.random() * others.length)];
			} else {
				charId = currentActive[Math.floor(Math.random() * currentActive.length)];
			}
			console.log(`[Engagement Loop] ${name(charId)} speaks`);

			try { await this.callbacks.generateMessage(charId); } catch (e) { console.error('[Engagement] Loop failed:', e); }

			this.cleanExpired();
			this.callbacks.onEngagementChanged();

			if (this.engagementLoopRunning && this.getActiveEngaged().length >= 2) {
				this.scheduleNextMessage();
			} else {
				this.stopLoop();
			}
		}, delay);
	}

	// ─── Triggered Response (user sent message) ───

	async triggerResponse(userMessage?: string) {
		const active = this.getActiveEngaged();
		if (active.length === 0) return;

		if (this.engagementTimer) { clearTimeout(this.engagementTimer); this.engagementTimer = null; }

		const chars = this.callbacks.getCharacters();
		let charId: number | undefined;

		// Name mention matching
		if (userMessage) {
			const msgLower = userMessage.toLowerCase();
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
		}
		if (!charId) charId = active[Math.floor(Math.random() * active.length)];

		try { await this.callbacks.generateMessage(charId); } catch (e) { console.error('[Engagement] Triggered response failed:', e); }

		if (this.getActiveEngaged().length >= 2) {
			if (!this.engagementLoopRunning) this.startLoop();
			else this.scheduleNextMessage();
		}
	}

	// ─── Periodic Roll ───

	startPeriodicRoll() {
		this.scheduleNextRoll();
	}

	stopPeriodicRoll() {
		if (this.engageRollTimer) { clearTimeout(this.engageRollTimer); this.engageRollTimer = null; }
	}

	private scheduleNextRoll() {
		const s = this.callbacks.getBehaviourSettings();
		if (!s) return;
		const minDelay = (s.engageRollMin ?? 1) * 60 * 1000;
		const maxDelay = (s.engageRollMax ?? 3) * 60 * 1000;
		const delay = minDelay + Math.random() * (maxDelay - minDelay);

		this.engageRollTimer = setTimeout(() => {
			this.engageRollTimer = null;
			const chars = this.callbacks.getCharacters();
			const available = chars.filter(c =>
				!this.engaged.has(c.id) && !this.cooldowns.has(c.id) && this.getCharacterStatus(c) !== 'offline'
			);
			if (available.length > 0) {
				const char = available[Math.floor(Math.random() * available.length)];
				console.log(`[Engagement Roll] Periodic — trying ${char.name}`);
				this.engageCharacter(char.id);
			}
			this.scheduleNextRoll();
		}, delay);
	}

	// ─── Conversation History Window ───

	/**
	 * Get the message IDs that a character should see.
	 * Returns: messages up to their last disengage + messages from (engageStart - offset) to now.
	 * Skips the gap where they were absent.
	 */
	getVisibleMessageIds(characterId: number, offset: number): Set<number> {
		const msgs = this.callbacks.getMessages();
		if (msgs.length === 0) return new Set();

		const currentStartMsgId = this.engageStartMsgId.get(characterId);
		const historicalWindows = this.engageWindows.get(characterId) || [];

		// No tracking data — show all
		if (currentStartMsgId === undefined && historicalWindows.length === 0) {
			return new Set(msgs.map(m => m.id));
		}

		const visible = new Set<number>();

		// Historical windows (with offset on both sides)
		for (const [startId, endId] of historicalWindows) {
			let startIdx = msgs.findIndex(m => m.id >= startId);
			let endIdx = msgs.findIndex(m => m.id > endId);
			if (startIdx === -1) continue;
			if (endIdx === -1) endIdx = msgs.length;

			const from = Math.max(0, startIdx - offset);
			const to = Math.min(msgs.length, endIdx + offset);
			for (let i = from; i < to; i++) {
				visible.add(msgs[i].id);
			}
		}

		// Current engagement (start - offset to end)
		if (currentStartMsgId !== undefined) {
			let startIdx = msgs.findIndex(m => m.id >= currentStartMsgId);
			if (startIdx === -1) startIdx = msgs.length;
			const from = Math.max(0, startIdx - offset);
			for (let i = from; i < msgs.length; i++) {
				visible.add(msgs[i].id);
			}
		}

		return visible;
	}

	// ─── Handle Ignore ───

	handleIgnore(characterId: number) {
		this.engaged.delete(characterId);
		this.closeEngageWindow(characterId);
		const s = this.callbacks.getBehaviourSettings();
		const cooldownMs = (s?.engageCooldown ?? 5) * 60 * 1000;
		if (cooldownMs > 0) this.cooldowns.set(characterId, Date.now() + cooldownMs);
		this.callbacks.triggerMemoryExtraction(characterId);
		this.callbacks.onEngagementChanged();
	}

	// ─── Debug ───

	debugEngageRandom() {
		const chars = this.callbacks.getCharacters();
		if (chars.length === 0 || !this.callbacks.getBehaviourSettings()) return;
		const available = chars.filter(c => !this.engaged.has(c.id) && this.getCharacterStatus(c) !== 'offline');
		if (available.length === 0) return;
		this.engageCharacter(available[Math.floor(Math.random() * available.length)].id);
	}

	async debugClear() {
		this.stopLoop();
		// Extract memories for all currently engaged characters before clearing
		for (const [charId] of this.engaged) {
			this.callbacks.triggerMemoryExtraction(charId);
		}
		this.engaged = new Map();
		this.cooldowns = new Map();
		this.lastProactiveTime = 0;
		this.engageWindows = new Map();
		this.engageStartMsgId = new Map();
		this.pendingWindows = [];

		// Clear server state
		try {
			await fetch(`/api/channels/${this.channelId}/engagement`, { method: 'DELETE' });
		} catch (err) {
			console.warn('[Engagement] Failed to clear server state:', err);
		}

		// Also remove any leftover localStorage
		localStorage.removeItem(`engagement-${this.channelId}`);

		this.callbacks.onEngagementChanged();
		console.log('[Engagement] All cleared (memories extracted)');
	}

	destroy() {
		this.stopLoop();
		this.stopPeriodicRoll();
		if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; }
		if (this.saveDebounceTimer) {
			clearTimeout(this.saveDebounceTimer);
			// Flush pending saves synchronously-ish
			const windowsToSave = [...this.pendingWindows];
			this.pendingWindows = [];
			if (windowsToSave.length > 0 || this.engaged.size > 0) {
				this.pushToServer(windowsToSave);
			}
		}
	}
}
