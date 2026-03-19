<script lang="ts">
	import type { PageData } from './$types';
	import type { Message, Character } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import ChannelHeader from '$lib/components/channel/ChannelHeader.svelte';
	import ChannelChat from '$lib/components/channel/ChannelChat.svelte';
	import ChannelMembersSidebar from '$lib/components/channel/ChannelMembersSidebar.svelte';
	import ReasoningModal from '$lib/components/channel/ReasoningModal.svelte';
	import { onMount, tick } from 'svelte';
	import { getCharactersCache, isCharactersCacheLoaded } from '$lib/stores/characters';

	let { data }: { data: PageData } = $props();

	// Core state
	let messages = $state<Message[]>([]);
	let characters = $state<Character[]>(getCharactersCache());
	let loading = $state(true);
	let sending = $state(false);
	let generating = $state(false);
	let typingCharacter = $state<string | null>(null);
	let membersSidebarCollapsed = $state(false);
	let avatarStyle = $state<'circle' | 'rounded'>('circle');
	let chatComponent = $state<ChannelChat | undefined>();

	// Reasoning modal
	let showReasoningForId = $state<number | null>(null);
	let reasoningContent = $derived(
		showReasoningForId
			? messages.find(m => m.id === showReasoningForId)?.reasoning || ''
			: ''
	);

	// Proactive tracking
	let lastProactiveTime = $state(0);
	const PROACTIVE_COOLDOWN = 60 * 60 * 1000;
	function canProactive(): boolean {
		return Date.now() - lastProactiveTime >= PROACTIVE_COOLDOWN;
	}

	// ─── Engagement System ───
	const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	let engagedCharacters = $state<Map<number, number>>(new Map());
	let engageCooldowns = $state<Map<number, number>>(new Map());
	let behaviourSettings = $state<any>(null);
	const PROACTIVE_ENGAGE_BOOST = 1.5;
	let engageRollCooldown = 0;
	const ENGAGE_ROLL_COOLDOWN_MS = 10000;
	let rollDepth = 0;
	const MAX_ROLL_DEPTH = 1;

	// Engagement loop
	let engagementTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let engagementLoopRunning = $state(false);
	let lastSpeakerId = $state<number | null>(null);

	function getCharacterStatus(character: Character): 'online' | 'away' | 'busy' | 'offline' {
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
					return block.status as 'online' | 'away' | 'busy' | 'offline';
				}
			}
		} catch {}
		return 'online';
	}

	function getActiveEngaged(): number[] {
		const now = Date.now();
		const active: number[] = [];
		for (const [charId, expiry] of engagedCharacters) {
			if (now < expiry) active.push(charId);
		}
		return active;
	}

	async function rollEngagement(excludeCharacterId?: number, boost = 1.0) {
		if (!behaviourSettings || characters.length === 0) return;
		if (Date.now() < engageRollCooldown) return;
		if (rollDepth >= MAX_ROLL_DEPTH) { console.warn('[Engagement] Roll blocked - max depth'); return; }
		rollDepth++;
		engageRollCooldown = Date.now() + ENGAGE_ROLL_COOLDOWN_MS;

		const now = Date.now();
		const newlyEngaged: number[] = [];
		const cooldownMs = (behaviourSettings.engageCooldown ?? 5) * 60 * 1000;

		for (const [charId, expiry] of engagedCharacters) {
			if (now >= expiry) {
				engagedCharacters.delete(charId);
				if (cooldownMs > 0) engageCooldowns.set(charId, now + cooldownMs);
			}
		}
		for (const [charId, expiry] of engageCooldowns) {
			if (now >= expiry) engageCooldowns.delete(charId);
		}

		for (const character of characters) {
			if (character.id === excludeCharacterId) continue;
			if (engagedCharacters.has(character.id)) continue;
			if (engageCooldowns.has(character.id)) continue;
			const status = getCharacterStatus(character);
			if (status === 'offline') continue;

			let chance = 0, duration = 0;
			if (status === 'online') { chance = behaviourSettings.engageChanceOnline ?? 80; duration = (behaviourSettings.engageDurationOnline ?? 5) * 60 * 1000; }
			else if (status === 'away') { chance = behaviourSettings.engageChanceAway ?? 30; duration = (behaviourSettings.engageDurationAway ?? 2) * 60 * 1000; }
			else if (status === 'busy') { chance = behaviourSettings.engageChanceBusy ?? 10; duration = (behaviourSettings.engageDurationBusy ?? 1) * 60 * 1000; }

			chance = Math.min(100, chance * boost);
			if (Math.random() * 100 < chance) {
				engagedCharacters.set(character.id, now + duration);
				newlyEngaged.push(character.id);
				if (newlyEngaged.length >= 2) break;
			}
		}

		if (newlyEngaged.length > 0) {
			engagedCharacters = new Map(engagedCharacters);
			for (const charId of newlyEngaged) {
				await generateCharacterMessage(charId);
			}
		}
		rollDepth--;
	}

	async function rollEngagementOnce(excludeCharacterId: number) {
		if (!behaviourSettings || characters.length === 0) return;
		if (rollDepth >= MAX_ROLL_DEPTH) { console.warn('[Engagement] One-shot blocked - max depth'); return; }
		rollDepth++;

		const now = Date.now();
		const newlyEngaged: number[] = [];
		for (const character of characters) {
			if (character.id === excludeCharacterId) continue;
			if (engagedCharacters.has(character.id)) continue;
			if (engageCooldowns.has(character.id) && now < (engageCooldowns.get(character.id) ?? 0)) continue;
			const status = getCharacterStatus(character);
			if (status === 'offline') continue;

			let chance = 0, duration = 0;
			if (status === 'online') { chance = behaviourSettings.engageChanceOnline ?? 80; duration = (behaviourSettings.engageDurationOnline ?? 5) * 60 * 1000; }
			else if (status === 'away') { chance = behaviourSettings.engageChanceAway ?? 30; duration = (behaviourSettings.engageDurationAway ?? 2) * 60 * 1000; }
			else if (status === 'busy') { chance = behaviourSettings.engageChanceBusy ?? 10; duration = (behaviourSettings.engageDurationBusy ?? 1) * 60 * 1000; }

			chance = Math.min(100, chance * PROACTIVE_ENGAGE_BOOST);
			if (Math.random() * 100 < chance) {
				engagedCharacters.set(character.id, now + duration);
				newlyEngaged.push(character.id);
				break;
			}
		}

		if (newlyEngaged.length > 0) {
			engagedCharacters = new Map(engagedCharacters);
			for (const charId of newlyEngaged) {
				await generateCharacterMessage(charId);
			}
		}
		rollDepth--;
	}

	async function engageCharacter(charId: number, allowProactive = true) {
		const char = characters.find(c => c.id === charId);
		if (!char || !behaviourSettings) return;
		const status = getCharacterStatus(char);
		let duration = (behaviourSettings.engageDurationOnline ?? 5) * 60 * 1000;
		if (status === 'away') duration = (behaviourSettings.engageDurationAway ?? 2) * 60 * 1000;
		if (status === 'busy') duration = (behaviourSettings.engageDurationBusy ?? 1) * 60 * 1000;
		engagedCharacters.set(charId, Date.now() + duration);
		engagedCharacters = new Map(engagedCharacters);

		const useProactive = allowProactive && canProactive() && Math.random() < 0.5;
		await generateCharacterMessage(charId, useProactive);

		if (useProactive) {
			lastProactiveTime = Date.now();
			await rollEngagementOnce(charId);
		}
	}

	// ─── Engagement Loop ───
	function startEngagementLoop() {
		if (engagementLoopRunning) return;
		engagementLoopRunning = true;
		scheduleNextEngagedMessage();
	}

	function stopEngagementLoop() {
		engagementLoopRunning = false;
		if (engagementTimer) { clearTimeout(engagementTimer); engagementTimer = null; }
	}

	function scheduleNextEngagedMessage() {
		if (!engagementLoopRunning || !behaviourSettings) return;
		const active = getActiveEngaged();
		if (active.length === 0) { stopEngagementLoop(); return; }

		const minDelay = (behaviourSettings.channelFrequencyMin ?? 5) * 1000;
		const maxDelay = (behaviourSettings.channelFrequencyMax ?? 30) * 1000;
		const delay = minDelay + Math.random() * (maxDelay - minDelay);

		engagementTimer = setTimeout(async () => {
			engagementTimer = null;
			const currentActive = getActiveEngaged();
			if (currentActive.length === 0) { stopEngagementLoop(); return; }

			// Pick speaker — double text logic
			let charId: number;
			const dtMin = behaviourSettings?.doubleTextChanceMin ?? 10;
			const dtMax = behaviourSettings?.doubleTextChanceMax ?? 30;
			const doubleTextChance = dtMin + Math.random() * (dtMax - dtMin);
			const others = currentActive.filter(id => id !== lastSpeakerId);

			if (lastSpeakerId && currentActive.includes(lastSpeakerId) && others.length > 0) {
				charId = Math.random() * 100 < doubleTextChance ? lastSpeakerId : others[Math.floor(Math.random() * others.length)];
			} else {
				charId = currentActive[Math.floor(Math.random() * currentActive.length)];
			}
			lastSpeakerId = charId;

			await generateCharacterMessage(charId);

			// Clean expired → cooldown
			const now = Date.now();
			const cooldownMs = (behaviourSettings?.engageCooldown ?? 5) * 60 * 1000;
			for (const [id, expiry] of engagedCharacters) {
				if (now >= expiry) {
					engagedCharacters.delete(id);
					if (cooldownMs > 0) engageCooldowns.set(id, now + cooldownMs);
				}
			}
			engagedCharacters = new Map(engagedCharacters);
			engageCooldowns = new Map(engageCooldowns);

			if (engagementLoopRunning && getActiveEngaged().length > 0) {
				scheduleNextEngagedMessage();
			} else {
				stopEngagementLoop();
			}
		}, delay);
	}

	$effect(() => {
		const _engaged = engagedCharacters;
		const _settings = behaviourSettings;
		const _running = engagementLoopRunning;
		if (getActiveEngaged().length > 0 && !_running && _settings) {
			startEngagementLoop();
		}
	});

	// ─── Message Generation ───
	function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

	async function generateCharacterMessage(characterId?: number, proactive = false) {
		if (generating) return;
		generating = true;

		const pickedCharacter = characterId
			? characters.find(c => c.id === characterId) || null
			: characters.length > 0 ? characters[Math.floor(Math.random() * characters.length)] : null;
		typingCharacter = pickedCharacter?.name || 'Someone';
		await tick();
		chatComponent?.scrollToBottom();

		try {
			const response = await fetch(`/api/channels/${data.channelId}/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ characterId: pickedCharacter?.id, proactive })
			});

			if (response.ok) {
				const result = await response.json();
				const newMessages: Message[] = result.messages || [];
				if (newMessages.length > 0) typingCharacter = newMessages[0].senderName || typingCharacter;

				for (let i = 0; i < newMessages.length; i++) {
					if (i > 0) await sleep(1000 + Math.random() * 1500);
					messages = [...messages, newMessages[i]];
					typingCharacter = i < newMessages.length - 1 ? (newMessages[0].senderName || typingCharacter) : null;
					await tick();
					chatComponent?.scrollToBottom();
				}
			} else {
				const err = await response.json();
				console.error('Generate failed:', err.error);
			}
		} catch (error) {
			console.error('Failed to generate:', error);
		} finally {
			generating = false;
			typingCharacter = null;
		}
	}

	// ─── Data Loading ───
	onMount(() => {
		loadMessages();
		loadSettings();
		loadBehaviourSettings();
		if (!isCharactersCacheLoaded()) loadCharacters();

		const saved = localStorage.getItem('channelMembersSidebar');
		if (saved !== null) membersSidebarCollapsed = saved === 'collapsed';

		return () => stopEngagementLoop();
	});

	$effect(() => {
		localStorage.setItem('channelMembersSidebar', membersSidebarCollapsed ? 'collapsed' : 'expanded');
	});

	async function loadBehaviourSettings() {
		try { const res = await fetch('/api/behaviour-settings'); if (res.ok) behaviourSettings = await res.json(); } catch {}
	}
	async function loadSettings() {
		try { const res = await fetch('/api/settings'); if (res.ok) { const d = await res.json(); avatarStyle = d.avatarStyle || 'circle'; } } catch {}
	}
	async function loadCharacters() {
		try { const res = await fetch('/api/characters'); const r = await res.json(); characters = r.characters || []; } catch (e) { console.error('Failed to load characters:', e); }
	}
	async function loadMessages() {
		try {
			const res = await fetch(`/api/channels/${data.channelId}/messages`);
			if (res.ok) { const r = await res.json(); messages = r.messages || []; await tick(); chatComponent?.scrollToBottom(); setTimeout(() => chatComponent?.scrollToBottom(), 100); setTimeout(() => chatComponent?.scrollToBottom(), 500); }
		} catch (e) { console.error('Failed to load messages:', e); }
		finally { loading = false; }
	}

	// ─── Actions ───
	async function handleSend(text: string) {
		sending = true;
		try {
			const res = await fetch(`/api/channels/${data.channelId}/messages`, {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text })
			});
			if (res.ok) {
				const r = await res.json();
				messages = [...messages, r.message];
				await tick();
				chatComponent?.scrollToBottom();
				if (getActiveEngaged().length === 0) rollEngagement();
			}
		} catch (e) { console.error('Failed to send:', e); }
		finally { sending = false; }
	}

	function exportChat() {
		if (messages.length === 0) return;
		const lines = messages.map(m => `[${new Date(m.createdAt).toLocaleString()}] ${m.senderName || (m.role === 'user' ? 'User' : 'Assistant')}: ${m.content}`);
		const text = `# ${data.channelName} — Exported ${new Date().toLocaleString()}\n# ${messages.length} messages\n\n` + lines.join('\n');
		const blob = new Blob([text], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a'); a.href = url; a.download = `${data.channelName}-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
		URL.revokeObjectURL(url);
	}

	function debugEngageRandom() {
		if (characters.length === 0 || !behaviourSettings) return;
		const available = characters.filter(c => !engagedCharacters.has(c.id) && getCharacterStatus(c) !== 'offline');
		if (available.length === 0) return;
		engageCharacter(available[Math.floor(Math.random() * available.length)].id);
	}
</script>

<svelte:head>
	<title>#{data.channelName} | ChatterBox</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/channel/{data.channelId}">
	<div class="h-full flex flex-col">
		<ChannelHeader
			channelName={data.channelName}
			channelDescription={data.channelDescription}
			messagesCount={messages.length}
			{generating}
			charactersAvailable={characters.length > 0}
			allEngaged={characters.every(c => engagedCharacters.has(c.id) || getCharacterStatus(c) === 'offline')}
			bind:membersSidebarCollapsed
			onExport={exportChat}
			onDebugGenerate={() => generateCharacterMessage()}
			onDebugEngage={debugEngageRandom}
			onToggleMembers={() => membersSidebarCollapsed = !membersSidebarCollapsed}
		/>

		<div class="flex-1 flex overflow-hidden">
			<div class="flex-1 flex flex-col min-w-0">
				<ChannelChat
					bind:this={chatComponent}
					bind:messages
					{loading}
					channelName={data.channelName}
					channelDescription={data.channelDescription}
					channelId={data.channelId}
					{typingCharacter}
					{sending}
					{avatarStyle}
					onSend={handleSend}
					onShowReasoning={(id) => showReasoningForId = id}
				/>
			</div>

			{#if !membersSidebarCollapsed}
				<ChannelMembersSidebar {characters} user={data.user} {avatarStyle} engagedIds={new Set(getActiveEngaged())} />
			{/if}
		</div>
	</div>
</MainLayout>

{#if showReasoningForId !== null}
	<ReasoningModal content={reasoningContent} onClose={() => showReasoningForId = null} />
{/if}
