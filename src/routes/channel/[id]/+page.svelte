<script lang="ts">
	import type { PageData } from './$types';
	import type { Message, Character } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import ChannelHeader from '$lib/components/channel/ChannelHeader.svelte';
	import ChannelChat from '$lib/components/channel/ChannelChat.svelte';
	import ChannelMembersSidebar from '$lib/components/channel/ChannelMembersSidebar.svelte';
	import ReasoningModal from '$lib/components/channel/ReasoningModal.svelte';
	import MemoriesModal from '$lib/components/channel/MemoriesModal.svelte';
	import { EngagementEngine } from '$lib/channel/engagementEngine';
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
	let behaviourSettings = $state<any>(null);

	// Modals
	let showReasoningForId = $state<number | null>(null);
	let memoriesCharacterId = $state<number | null>(null);
	let memoriesCharacterName = $state('');
	let reasoningContent = $derived(
		showReasoningForId ? messages.find(m => m.id === showReasoningForId)?.reasoning || '' : ''
	);

	// Reactivity trigger for engagement UI updates
	let engagementVersion = $state(0);

	// ─── Engagement Engine ───
	const engine = new EngagementEngine(data.channelId, {
		getMessages: () => messages,
		getCharacters: () => characters,
		getBehaviourSettings: () => behaviourSettings,
		generateMessage: (charId, proactive) => generateCharacterMessage(charId, proactive),
		triggerMemoryExtraction: (charId) => {
			const charName = characters.find(c => c.id === charId)?.name || charId;
			console.log(`[Memory] Triggering extraction for ${charName} (id: ${charId})`);
			fetch(`/api/channels/${data.channelId}/extract-memories`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ characterId: charId })
			}).catch(err => console.error('[Memory] Extraction failed:', err));
		},
		onEngagementChanged: () => { engagementVersion++; engine.saveState(); }
	});

	// Watch for loop start conditions
	$effect(() => {
		const _v = engagementVersion;
		const _s = behaviourSettings;
		engine.checkLoop();
	});

	// Start periodic roll when ready
	$effect(() => {
		if (behaviourSettings && characters.length > 0) {
			engine.startPeriodicRoll();
		}
	});

	// ─── Message Generation ───
	function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
	let generateQueue: Array<{ characterId?: number; proactive: boolean }> = [];

	async function generateCharacterMessage(characterId?: number, proactive = false) {
		if (generating) {
			generateQueue.push({ characterId, proactive });
			return;
		}
		generating = true;

		const pickedCharacter = characterId
			? characters.find(c => c.id === characterId) || null
			: characters.length > 0 ? characters[Math.floor(Math.random() * characters.length)] : null;

		await sleep(800 + Math.random() * 1200);
		typingCharacter = pickedCharacter?.name || 'Someone';
		await tick();
		chatComponent?.scrollToBottom();

		try {
			const response = await fetch(`/api/channels/${data.channelId}/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					characterId: pickedCharacter?.id,
					proactive,
					engagedCharacterIds: engine.getActiveEngaged(),
					visibleMessageIds: pickedCharacter?.id
						? Array.from(engine.getVisibleMessageIds(pickedCharacter.id, behaviourSettings?.engageContextOffset ?? 10))
						: undefined
				})
			});

			if (response.ok) {
				const result = await response.json();

				if (result.ignored && result.characterId) {
					engine.handleIgnore(result.characterId);
				}

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

			if (generateQueue.length > 0) {
				const next = generateQueue.shift()!;
				await generateCharacterMessage(next.characterId, next.proactive);
			}
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

		return () => engine.destroy();
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
			if (res.ok) {
				const r = await res.json();
				messages = r.messages || [];
				await tick(); chatComponent?.scrollToBottom(); setTimeout(() => chatComponent?.scrollToBottom(), 100); setTimeout(() => chatComponent?.scrollToBottom(), 500);
			}
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

				if (engine.getActiveEngaged().length > 0) {
					engine.triggerResponse(text);
					// Chance to pull another character in
					const joinChance = (behaviourSettings?.joinChancePerMessage ?? 1) / 100;
					if (joinChance > 0 && Math.random() < joinChance) {
						const available = characters.filter(c =>
							!engine.engaged.has(c.id) && !engine.cooldowns.has(c.id) && engine.getCharacterStatus(c) !== 'offline'
						);
						if (available.length > 0) {
							const char = available[Math.floor(Math.random() * available.length)];
							engine.engageCharacter(char.id, false);
						}
					}
				} else {
					engine.rollEngagement();
				}
			}
		} catch (e) { console.error('Failed to send:', e); }
		finally { sending = false; setTimeout(() => chatComponent?.focusInput(), 0); }
	}

	async function debugWipeChat() {
		if (!confirm('Wipe ALL messages and memories for this channel? This cannot be undone.')) return;
		try {
			const res = await fetch(`/api/channels/${data.channelId}/wipe`, { method: 'POST' });
			if (res.ok) {
				messages = [];
				engine.debugClear();
				console.log('[Debug] Chat and memories wiped');
			}
		} catch (e) { console.error('Failed to wipe:', e); }
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
			allEngaged={characters.every(c => engine.engaged.has(c.id) || engine.getCharacterStatus(c) === 'offline')}
			hasEngaged={(() => { const _v = engagementVersion; return engine.getActiveEngaged().length > 0; })()}
			bind:membersSidebarCollapsed
			onExport={exportChat}
			onDebugGenerate={() => generateCharacterMessage()}
			onDebugEngage={() => engine.debugEngageRandom()}
			onDebugClearEngage={() => engine.debugClear()}
			onDebugWipe={debugWipeChat}
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
				<ChannelMembersSidebar
					{characters}
					user={data.user}
					{avatarStyle}
					engagedIds={(() => { const _v = engagementVersion; return new Set(engine.getActiveEngaged()); })()}
					onShowMemories={(id, name) => { memoriesCharacterId = id; memoriesCharacterName = name; }}
				/>
			{/if}
		</div>
	</div>
</MainLayout>

{#if showReasoningForId !== null}
	<ReasoningModal content={reasoningContent} onClose={() => showReasoningForId = null} />
{/if}

{#if memoriesCharacterId !== null}
	<MemoriesModal characterId={memoriesCharacterId} characterName={memoriesCharacterName} onClose={() => memoriesCharacterId = null} />
{/if}
