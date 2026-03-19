<script lang="ts">
	import type { User, Character, Conversation } from '$lib/server/db/schema';
	import { onMount } from 'svelte';
	import { getCharactersCache, setCharactersCache, isCharactersCacheLoaded } from '$lib/stores/characters';
	import CreateChannelModal from './CreateChannelModal.svelte';

	interface Props {
		user: User;
		currentPath: string;
		collapsed: boolean;
	}

	interface ActivePersonaInfo {
		name: string;
		description: string | null;
		avatarData: string | null;
		personaId: number | null;
	}

	let { user, currentPath, collapsed = $bindable() }: Props = $props();

	function getInitialMode(): 'channels' | 'dms' {
		// Match mode to current route
		if (currentPath.startsWith('/channel/')) return 'channels';
		if (currentPath.startsWith('/chat/')) return 'dms';
		// Otherwise use saved preference
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem('sidebarMode');
			if (saved === 'channels' || saved === 'dms') return saved;
		}
		return 'dms';
	}

	let sidebarMode = $state<'channels' | 'dms'>(getInitialMode());
	let characters = $state<Character[]>(getCharactersCache());
	let channels = $state<Conversation[]>([]);
	let activePersona = $state<ActivePersonaInfo | null>(null);
	let searchQuery = $state('');
	let isSearching = $state(false);
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let showCreateChannel = $state(false);

	let filteredCharacters = $derived(
		searchQuery.trim()
			? characters.filter(c =>
				c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(c.description?.toLowerCase().includes(searchQuery.toLowerCase()))
			)
			: characters
	);

	function startSearch() {
		isSearching = true;
		setTimeout(() => searchInputRef?.focus(), 0);
	}

	function endSearch() {
		if (!searchQuery.trim()) {
			isSearching = false;
		}
	}

	function clearSearch() {
		searchQuery = '';
		isSearching = false;
	}

	function isChannelActive(channelId: number): boolean {
		return currentPath === `/channel/${channelId}`;
	}

	function handleChannelCreated(channel: Conversation) {
		channels = [...channels, channel];
	}

	onMount(() => {
		if (!isCharactersCacheLoaded()) {
			loadCharacters();
		}

		loadChannels();
		loadActivePersona();

		const handleCharacterUpdate = () => loadCharacters();
		const handleChannelUpdate = () => loadChannels();
		const handlePersonaUpdate = () => loadActivePersona();

		window.addEventListener('characterUpdated', handleCharacterUpdate);
		window.addEventListener('channelUpdated', handleChannelUpdate);
		window.addEventListener('personaUpdated', handlePersonaUpdate);

		return () => {
			window.removeEventListener('characterUpdated', handleCharacterUpdate);
			window.removeEventListener('channelUpdated', handleChannelUpdate);
			window.removeEventListener('personaUpdated', handlePersonaUpdate);
		};
	});

	$effect(() => {
		localStorage.setItem('sidebarMode', sidebarMode);
	});

	async function loadChannels() {
		try {
			const response = await fetch('/api/channels');
			if (response.ok) {
				const result = await response.json();
				channels = result.channels || [];
			}
		} catch (error) {
			console.error('Failed to load channels:', error);
		}
	}

	async function loadActivePersona() {
		try {
			const response = await fetch('/api/personas/active');
			if (response.ok) {
				activePersona = await response.json();
			}
		} catch (error) {
			console.error('Failed to load active persona:', error);
		}
	}

	async function loadCharacters() {
		try {
			const response = await fetch('/api/characters');
			const result = await response.json();
			characters = result.characters || [];
			setCharactersCache(characters);
		} catch (error) {
			console.error('Failed to load characters:', error);
		}
	}
</script>

<div
	class="bg-[var(--sidebar-bg)] border-r border-[var(--border-primary)] shadow-lg flex flex-col transition-all duration-300 flex-shrink-0 {collapsed
		? 'w-0'
		: 'w-80'} overflow-hidden"
>
	<!-- Logo + Mode Toggle -->
	<div class="p-4 border-b border-[var(--border-primary)]">
		<h1 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] mb-3">
			ChatterBox
		</h1>
		<div class="flex bg-[var(--bg-primary)] rounded-lg p-1 gap-1">
			<button
				onclick={() => sidebarMode = 'channels'}
				class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer {sidebarMode === 'channels'
					? 'bg-[var(--accent-primary)] text-white shadow-md'
					: 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
				</svg>
				Channels
			</button>
			<button
				onclick={() => sidebarMode = 'dms'}
				class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer {sidebarMode === 'dms'
					? 'bg-[var(--accent-primary)] text-white shadow-md'
					: 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
				DMs
			</button>
		</div>
	</div>

	<!-- Sidebar Content -->
	<div class="flex-1 overflow-y-auto">
		{#if sidebarMode === 'channels'}
			<div class="p-3">
				<div class="flex items-center justify-between mb-3 px-2">
					<h2 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Text Channels</h2>
					<button
						onclick={() => showCreateChannel = true}
						class="p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] rounded transition cursor-pointer"
						title="Create Channel"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
						</svg>
					</button>
				</div>

				<div class="space-y-0.5">
					{#each channels as channel}
						<a
							href="/channel/{channel.id}"
							class="group flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors {isChannelActive(channel.id)
								? 'bg-[var(--sidebar-active)] text-[var(--text-primary)]'
								: 'text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-secondary)]'}"
						>
							<svg class="w-4 h-4 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
							</svg>
							<span class="text-sm font-medium truncate">{channel.name}</span>
						</a>
					{/each}
				</div>
			</div>
		{:else}
			<div class="p-3">
				<div class="mb-3">
					{#if isSearching}
						<div class="relative">
							<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
							</svg>
							<input
								bind:this={searchInputRef}
								type="text"
								bind:value={searchQuery}
								onblur={endSearch}
								onkeydown={(e) => e.key === 'Escape' && clearSearch()}
								placeholder="Search DMs..."
								class="w-full pl-10 pr-8 py-2 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition"
							/>
							<button
								onmousedown={(e) => e.preventDefault()}
								onclick={clearSearch}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
								</svg>
							</button>
						</div>
					{:else}
						<div class="flex items-center justify-between px-2">
							<h2 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
								Direct Messages
							</h2>
							<button
								onclick={startSearch}
								class="p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] rounded transition cursor-pointer"
								title="Search DMs"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
								</svg>
							</button>
						</div>
					{/if}
				</div>

				{#if characters.length === 0}
					<div class="text-center py-10 px-4">
						<div class="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
							<svg class="w-8 h-8 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
							</svg>
						</div>
						<p class="text-[var(--text-secondary)] font-semibold text-sm mb-1">No conversations yet</p>
						<p class="text-[var(--text-muted)] text-xs">Import characters to start chatting!</p>
					</div>
				{:else if filteredCharacters.length === 0}
					<div class="text-center py-8 px-4">
						<svg class="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
						</svg>
						<p class="text-[var(--text-secondary)] text-sm">No matches found</p>
					</div>
				{:else}
					<div class="space-y-1">
						{#each filteredCharacters as character}
							<a
								href="/chat/{character.id}"
								class="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors"
							>
								<div class="relative flex-shrink-0">
									{#if character.thumbnailData || character.imageData}
										<img
											src={character.thumbnailData || character.imageData}
											alt={character.name}
											class="w-9 h-9 rounded-full object-cover"
										/>
									{:else}
										<div class="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-bold text-sm">
											{character.name.charAt(0).toUpperCase()}
										</div>
									{/if}
									<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--sidebar-bg)]"></div>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-medium text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate transition-colors">
										{character.name}
									</h3>
									{#if character.description}
										<p class="text-xs text-[var(--text-muted)] truncate">
											{character.description}
										</p>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- User Profile at Bottom -->
	<div class="border-t border-[var(--border-primary)] p-4 bg-[var(--bg-secondary)]">
		<div class="flex items-center gap-1 p-3 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
			<a href="/profile" class="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
				<div class="relative">
					<div
						class="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full blur-sm opacity-50"
					></div>
					{#if activePersona?.avatarData}
						<img
							src={activePersona.avatarData}
							alt={activePersona.name}
							class="relative w-10 h-10 rounded-full object-cover shadow-md"
						/>
					{:else if (user.avatarThumbnail || user.avatarData) && !activePersona?.personaId}
						<img
							src={user.avatarThumbnail || user.avatarData}
							alt={user.displayName}
							class="relative w-10 h-10 rounded-full object-cover shadow-md"
						/>
					{:else}
						<div
							class="relative w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-bold shadow-md"
						>
							{(activePersona?.name || user.displayName).charAt(0).toUpperCase()}
						</div>
					{/if}
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="font-bold text-[var(--text-primary)] truncate text-sm">{activePersona?.name || user.displayName}</h3>
					<p class="text-xs text-[var(--text-muted)] truncate">{activePersona?.personaId ? 'Persona' : user.username}</p>
				</div>
			</a>
			<a
				href="/image-settings"
				class="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition"
				title="Image Generation Settings"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
				</svg>
			</a>
			<a
				href="/settings"
				class="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition"
				title="LLM Settings"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
				</svg>
			</a>
			<a
				href="/behaviour-settings"
				class="p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition"
				title="Behaviour Settings"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
				</svg>
			</a>
		</div>
	</div>
</div>

<CreateChannelModal
	bind:show={showCreateChannel}
	oncreated={handleChannelCreated}
/>
