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
	lastDisengageMsgId: [number, number][];
	lastProactive: number;
}

export class EngagementEngine {
	engaged = new Map<number, number>();
	cooldowns = new Map<number, number>();
	engageStartMsgId = new Map<number, number>(); // characterId -> message ID when they engaged
	lastDisengageMsgId = new Map<number, number>(); // characterId -> message ID when they last disengaged
	lastProactiveTime = 0;

	private callbacks: EngagementCallbacks;
	private channelId: number;
	private storageKey: string;
	private engagementTimer: ReturnType<typeof setTimeout> | null = null;
	private engagementLoopRunning = false;
	private engageRollCooldown = 0;
	private rollDepth = 0;
	private engageRollTimer: ReturnType<typeof setTimeout> | null = null;
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	constructor(channelId: number, callbacks: EngagementCallbacks) {
		this.channelId = channelId;
		this.callbacks = callbacks;
		this.storageKey = `engagement-${channelId}`;
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

	private loadState() {
		try {
			const saved = localStorage.getItem(this.storageKey);
			if (saved) {
				const parsed: PersistedState = JSON.parse(saved);
				const now = Date.now();
				this.engaged = new Map((parsed.engaged || []).filter(([_, exp]) => now < exp));
				this.cooldowns = new Map((parsed.cooldowns || []).filter(([_, exp]) => now < exp));
				this.engageStartMsgId = new Map(parsed.engageStartMsgId || []);
				this.lastDisengageMsgId = new Map(parsed.lastDisengageMsgId || []);
				this.lastProactiveTime = parsed.lastProactive || 0;
			}
		} catch {}
	}

	saveState() {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify({
				engaged: Array.from(this.engaged.entries()),
				cooldowns: Array.from(this.cooldowns.entries()),
				engageStartMsgId: Array.from(this.engageStartMsgId.entries()),
				lastDisengageMsgId: Array.from(this.lastDisengageMsgId.entries()),
				lastProactive: this.lastProactiveTime
			}));
		} catch {}
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
				const msgs = this.callbacks.getMessages();
				this.lastDisengageMsgId.set(charId, msgs.length > 0 ? msgs[msgs.length - 1].id : 0);
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

		const disengageMsgId = this.lastDisengageMsgId.get(characterId);
		const engageStartMsgId = this.engageStartMsgId.get(characterId);

		// If no tracking data, show all (character has been around the whole time)
		if (!engageStartMsgId) {
			return new Set(msgs.map(m => m.id));
		}

		const visible = new Set<number>();

		// Find engage start position in the array
		let engageIdx = msgs.findIndex(m => m.id >= engageStartMsgId);
		if (engageIdx === -1) engageIdx = msgs.length;

		// Apply offset — include some messages before engage start for context
		const windowStart = Math.max(0, engageIdx - offset);

		if (disengageMsgId) {
			// Has a previous disengage point — include everything up to it
			for (const msg of msgs) {
				if (msg.id <= disengageMsgId) {
					visible.add(msg.id);
				} else {
					break;
				}
			}
		}

		// Include from (engageStart - offset) to end
		for (let i = windowStart; i < msgs.length; i++) {
			visible.add(msgs[i].id);
		}

		return visible;
	}

	// ─── Handle Ignore ───

	handleIgnore(characterId: number) {
		this.engaged.delete(characterId);
		const msgs = this.callbacks.getMessages();
		this.lastDisengageMsgId.set(characterId, msgs.length > 0 ? msgs[msgs.length - 1].id : 0);
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

	debugClear() {
		this.stopLoop();
		// Extract memories for all currently engaged characters before clearing
		for (const [charId] of this.engaged) {
			this.callbacks.triggerMemoryExtraction(charId);
		}
		this.engaged = new Map();
		this.cooldowns = new Map();
		this.lastProactiveTime = 0;
		localStorage.removeItem(this.storageKey);
		this.callbacks.onEngagementChanged();
		console.log('[Engagement] All cleared (memories extracted)');
	}

	destroy() {
		this.stopLoop();
		this.stopPeriodicRoll();
		if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; }
	}
}
