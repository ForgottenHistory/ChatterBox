<script lang="ts">
	import type { PageData } from './$types';
	import type { Message, Character, Conversation } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import ChannelHeader from '$lib/components/channel/ChannelHeader.svelte';
	import ChannelChat from '$lib/components/channel/ChannelChat.svelte';
	import ChannelMembersSidebar from '$lib/components/channel/ChannelMembersSidebar.svelte';
	import ReasoningModal from '$lib/components/channel/ReasoningModal.svelte';
	import MemoriesModal from '$lib/components/channel/MemoriesModal.svelte';
	import { onMount, tick, untrack } from 'svelte';
	import { getCharactersCache, isCharactersCacheLoaded } from '$lib/stores/characters';
	import {
		initSocket, joinChannel, leaveChannel, emitUserMessage,
		emitDebugEngage, emitDebugClear, emitMoveEngagement, emitEngageCharacter,
		onChannelNewMessage, onChannelTyping, onChannelEngagementChanged,
		removeChannelListeners
	} from '$lib/stores/socket';

	let { data }: { data: PageData } = $props();

	// Core state
	let messages = $state<Message[]>([]);
	let characters = $state<Character[]>(getCharactersCache());
	let loading = $state(true);
	let sending = $state(false);
	let typingCharacter = $state<string | null>(null);
	let membersSidebarCollapsed = $state(false);
	let avatarStyle = $state<'circle' | 'rounded'>('circle');
	let chatComponent = $state<ChannelChat | undefined>();
	let channels = $state<Conversation[]>([]);

	// Engagement state from server
	let engagedMap = $state<Record<number, number>>({});
	let engagementVersion = $state(0);

	// Modals
	let showReasoningForId = $state<number | null>(null);
	let memoriesCharacterId = $state<number | null>(null);
	let memoriesCharacterName = $state('');
	let reasoningContent = $derived(
		showReasoningForId ? messages.find(m => m.id === showReasoningForId)?.reasoning || '' : ''
	);

	let engagedIds = $derived.by(() => {
		const _v = engagementVersion;
		const now = Date.now();
		return new Set(
			Object.entries(engagedMap)
				.filter(([_, expiry]) => now < expiry)
				.map(([id]) => parseInt(id))
		);
	});

	let hasEngaged = $derived(engagedIds.size > 0);
	let allEngaged = $derived(characters.every(c => engagedIds.has(c.id)));

	// ─── Socket.IO Setup ───
	let currentChannelId = $state(data.channelId);

	onMount(() => {
		initSocket();
		loadSettings();
		loadChannels();
		if (!isCharactersCacheLoaded()) loadCharacters();

		const saved = localStorage.getItem('channelMembersSidebar');
		if (saved !== null) membersSidebarCollapsed = saved === 'collapsed';

		return () => {
			leaveChannel(currentChannelId);
			removeChannelListeners();
		};
	});

	// React to channel changes (including initial load)
	$effect(() => {
		const channelId = data.channelId;

		untrack(() => {
			// Leave previous channel if switching
			if (currentChannelId !== channelId) {
				leaveChannel(currentChannelId);
				removeChannelListeners();
			}
			currentChannelId = channelId;

			// Reset state for new channel
			messages = [];
			loading = true;
			engagedMap = {};
			engagementVersion++;
			typingCharacter = null;

			// Join new channel and set up listeners
			joinChannel(channelId);

			onChannelNewMessage((message: Message) => {
				messages = [...messages, message];
				tick().then(() => chatComponent?.scrollToBottom());
			});

			onChannelTyping(({ characterName, isTyping }) => {
				typingCharacter = isTyping ? characterName : null;
				if (isTyping) {
					tick().then(() => chatComponent?.scrollToBottom());
				}
			});

			onChannelEngagementChanged(({ engaged, cooldowns }) => {
				engagedMap = engaged;
				engagementVersion++;
			});

			loadMessages();
		});
	});

	$effect(() => {
		localStorage.setItem('channelMembersSidebar', membersSidebarCollapsed ? 'collapsed' : 'expanded');
	});

	// ─── Data Loading ───
	async function loadSettings() {
		try { const res = await fetch('/api/settings'); if (res.ok) { const d = await res.json(); avatarStyle = d.avatarStyle || 'circle'; } } catch {}
	}
	async function loadCharacters() {
		try { const res = await fetch('/api/characters'); const r = await res.json(); characters = r.characters || []; } catch (e) { console.error('Failed to load characters:', e); }
	}
	async function loadChannels() {
		try { const res = await fetch('/api/channels'); if (res.ok) { const r = await res.json(); channels = r.channels || []; } } catch {}
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
				// Tell server to trigger engagement response
				emitUserMessage(data.channelId, text);
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
				emitDebugClear(data.channelId);
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
			channelId={data.channelId}
			messagesCount={messages.length}
			generating={false}
			charactersAvailable={characters.length > 0}
			{allEngaged}
			{hasEngaged}
			{channels}
			bind:membersSidebarCollapsed
			onExport={exportChat}
			onDebugGenerate={() => emitDebugEngage(data.channelId)}
			onDebugEngage={() => emitDebugEngage(data.channelId)}
			onDebugClearEngage={() => emitDebugClear(data.channelId)}
			onDebugWipe={debugWipeChat}
			onDebugMoveEngagement={(toId) => emitMoveEngagement(data.channelId, toId)}
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
					{engagedIds}
					onShowMemories={(id, name) => { memoriesCharacterId = id; memoriesCharacterName = name; }}
					onEngageCharacter={(id) => emitEngageCharacter(data.channelId, id)}
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
