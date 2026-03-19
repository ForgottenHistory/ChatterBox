<script lang="ts">
	import type { PageData } from './$types';
	import type { Message, Character } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import ChannelMembersSidebar from '$lib/components/channel/ChannelMembersSidebar.svelte';
	import { onMount, tick } from 'svelte';
	import { getCharactersCache, isCharactersCacheLoaded } from '$lib/stores/characters';

	let { data }: { data: PageData } = $props();

	let messages = $state<Message[]>([]);
	let characters = $state<Character[]>(getCharactersCache());
	let loading = $state(true);
	let input = $state('');
	let sending = $state(false);
	let generating = $state(false);
	let typingCharacter = $state<string | null>(null);
	let messagesContainer = $state<HTMLDivElement | undefined>();
	let membersSidebarCollapsed = $state(false);
	let avatarStyle = $state<'circle' | 'rounded'>('circle');
	let avatarClass = $derived(avatarStyle === 'rounded' ? 'rounded-lg' : 'rounded-full');
	let avatarSize = $derived(avatarStyle === 'rounded' ? 'w-9 h-12' : 'w-10 h-10');
	let compactPadding = $derived(avatarStyle === 'rounded' ? 'pl-12' : 'pl-14');

	// Edit state
	let editingMessageId = $state<number | null>(null);
	let editContent = $state('');

	// Reasoning modal
	let showReasoningForId = $state<number | null>(null);
	let reasoningContent = $derived(
		showReasoningForId
			? messages.find(m => m.id === showReasoningForId)?.reasoning || ''
			: ''
	);

	// Clipboard feedback
	let copiedMessageId = $state<number | null>(null);

	onMount(() => {
		loadMessages();
		loadSettings();
		if (!isCharactersCacheLoaded()) {
			loadCharacters();
		}

		const savedMembersSidebar = localStorage.getItem('channelMembersSidebar');
		if (savedMembersSidebar !== null) {
			membersSidebarCollapsed = savedMembersSidebar === 'collapsed';
		}
	});

	async function loadSettings() {
		try {
			const res = await fetch('/api/settings');
			if (res.ok) {
				const data = await res.json();
				avatarStyle = data.avatarStyle || 'circle';
			}
		} catch {}
	}

	$effect(() => {
		localStorage.setItem('channelMembersSidebar', membersSidebarCollapsed ? 'collapsed' : 'expanded');
	});

	async function loadCharacters() {
		try {
			const response = await fetch('/api/characters');
			const result = await response.json();
			characters = result.characters || [];
		} catch (error) {
			console.error('Failed to load characters:', error);
		}
	}

	async function loadMessages() {
		try {
			const response = await fetch(`/api/channels/${data.channelId}/messages`);
			if (response.ok) {
				const result = await response.json();
				messages = result.messages || [];
				await tick();
				scrollToBottom();
			}
		} catch (error) {
			console.error('Failed to load messages:', error);
		} finally {
			loading = false;
		}
	}

	async function sendMessage() {
		const text = input.trim();
		if (!text || sending) return;

		sending = true;
		input = '';

		try {
			const response = await fetch(`/api/channels/${data.channelId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: text })
			});

			if (response.ok) {
				const result = await response.json();
				messages = [...messages, result.message];
				await tick();
				scrollToBottom();
			}
		} catch (error) {
			console.error('Failed to send message:', error);
		} finally {
			sending = false;
		}
	}

	function sleep(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async function debugGenerateCharacterMessage() {
		if (generating) return;
		generating = true;

		// Pick a random character and tell the API to use it
		const pickedCharacter = characters.length > 0
			? characters[Math.floor(Math.random() * characters.length)]
			: null;
		typingCharacter = pickedCharacter?.name || 'Someone';
		await tick();
		scrollToBottom();

		try {
			const response = await fetch(`/api/channels/${data.channelId}/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ characterId: pickedCharacter?.id })
			});

			if (response.ok) {
				const result = await response.json();
				const newMessages: Message[] = result.messages || [];

				// Update typing indicator to actual character name
				if (newMessages.length > 0) {
					typingCharacter = newMessages[0].senderName || typingCharacter;
				}

				// Stagger messages with a small delay for natural feel
				for (let i = 0; i < newMessages.length; i++) {
					if (i > 0) {
						await sleep(1000 + Math.random() * 1500);
					}
					messages = [...messages, newMessages[i]];
					// Show typing between messages, hide after last
					typingCharacter = i < newMessages.length - 1 ? (newMessages[0].senderName || typingCharacter) : null;
					await tick();
					scrollToBottom();
				}
			} else {
				const err = await response.json();
				console.error('Generate failed:', err.error);
			}
		} catch (error) {
			console.error('Failed to generate character message:', error);
		} finally {
			generating = false;
			typingCharacter = null;
		}
	}

	async function copyMessage(msg: Message) {
		try {
			await navigator.clipboard.writeText(msg.content);
			copiedMessageId = msg.id;
			setTimeout(() => copiedMessageId = null, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function startEdit(msg: Message) {
		editingMessageId = msg.id;
		editContent = msg.content;
	}

	function cancelEdit() {
		editingMessageId = null;
		editContent = '';
	}

	async function saveEdit(msgId: number) {
		if (!editContent.trim()) return;

		try {
			const response = await fetch(`/api/chat/messages/${msgId}/edit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: editContent.trim() })
			});

			if (response.ok) {
				const result = await response.json();
				messages = messages.map(m => m.id === msgId ? result.message : m);
				cancelEdit();
			}
		} catch (error) {
			console.error('Failed to edit message:', error);
		}
	}

	async function deleteMessage(msgId: number) {
		try {
			const response = await fetch(`/api/chat/messages/${msgId}/delete`, {
				method: 'DELETE'
			});

			if (response.ok) {
				// Remove this message and all after it
				const idx = messages.findIndex(m => m.id === msgId);
				if (idx !== -1) {
					messages = messages.slice(0, idx);
				}
			}
		} catch (error) {
			console.error('Failed to delete message:', error);
		}
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function formatTime(date: Date | string) {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>#{data.channelName} | ChatterBox</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/channel/{data.channelId}">
	<div class="h-full flex flex-col">
		<!-- Channel Header -->
		<div class="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-3 flex items-center gap-3 flex-shrink-0">
			<svg class="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
			</svg>
			<h2 class="text-lg font-semibold text-[var(--text-primary)]">{data.channelName}</h2>
			{#if data.channelDescription}
				<span class="text-sm text-[var(--text-muted)] border-l border-[var(--border-primary)] pl-3 ml-1 flex-1 truncate">{data.channelDescription}</span>
			{:else}
				<div class="flex-1"></div>
			{/if}
			<!-- Debug: trigger character message -->
			<button
				onclick={debugGenerateCharacterMessage}
				disabled={generating || characters.length === 0}
				class="p-1.5 rounded-lg transition cursor-pointer text-[var(--warning)] hover:bg-[var(--warning)]/10 disabled:opacity-30 disabled:cursor-not-allowed"
				title="Debug: Generate character message"
			>
				{#if generating}
					<div class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
					</svg>
				{/if}
			</button>
			<!-- Members toggle -->
			<button
				onclick={() => membersSidebarCollapsed = !membersSidebarCollapsed}
				class="p-1.5 rounded-lg transition cursor-pointer {membersSidebarCollapsed
					? 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
					: 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'}"
				title="{membersSidebarCollapsed ? 'Show' : 'Hide'} members"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
				</svg>
			</button>
		</div>

		<!-- Chat + Members layout -->
		<div class="flex-1 flex overflow-hidden">
		<!-- Chat Column -->
		<div class="flex-1 flex flex-col min-w-0">
		<!-- Messages Area -->
		<div bind:this={messagesContainer} class="flex-1 overflow-y-auto">
			{#if loading}
				<div class="flex items-center justify-center h-full">
					<div class="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
				</div>
			{:else if messages.length === 0}
				<div class="flex items-center justify-center h-full">
					<div class="text-center px-4">
						<div class="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
							<svg class="w-10 h-10 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
							</svg>
						</div>
						<h3 class="text-xl font-bold text-[var(--text-primary)] mb-1">Welcome to #{data.channelName}!</h3>
						<p class="text-[var(--text-muted)] text-sm">
							{data.channelDescription || 'This is the beginning of the channel. Say something!'}
						</p>
					</div>
				</div>
			{:else}
				<div class="px-4 py-4 space-y-0">
					{#each messages as msg, i}
						{@const prevMsg = i > 0 ? messages[i - 1] : null}
						{@const sameSender = prevMsg && prevMsg.senderName === msg.senderName && prevMsg.role === msg.role}
						{@const isUser = msg.role === 'user'}

						{#if sameSender}
							<!-- Compact: same sender continuation -->
							<div class="relative {compactPadding} py-0.5 group rounded">
								{#if editingMessageId === msg.id}
									<div class="space-y-2 pr-2">
										<textarea
											bind:value={editContent}
											onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') cancelEdit(); }}
											rows="2"
											class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none resize-none"
										></textarea>
										<div class="flex gap-2 text-xs">
											<button onclick={() => saveEdit(msg.id)} class="text-[var(--accent-primary)] hover:underline">save</button>
											<button onclick={cancelEdit} class="text-[var(--text-muted)] hover:underline">cancel</button>
										</div>
									</div>
								{:else}
									<p class="text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
								{/if}
								<!-- Hover controls -->
								{#if editingMessageId !== msg.id}
									<div class="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md shadow-lg px-1 py-0.5">
										{#if msg.reasoning}
											<button onclick={() => showReasoningForId = msg.id} class="p-1 text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] transition" title="View reasoning">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
											</button>
										{/if}
										<button onclick={() => copyMessage(msg)} class="p-1 transition {copiedMessageId === msg.id ? 'text-[var(--success)]' : 'text-[var(--text-muted)] hover:text-[var(--accent-primary)]'}" title="Copy">
											{#if copiedMessageId === msg.id}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
											{/if}
										</button>
										<button onclick={() => startEdit(msg)} class="p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition" title="Edit">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
										</button>
										<button onclick={() => deleteMessage(msg.id)} class="p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition" title="Delete from here">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
										</button>
									</div>
								{/if}
							</div>
						{:else}
							<!-- Full message with avatar -->
							<div class="relative {compactPadding} mt-3 pb-0.5 hover:bg-[var(--bg-secondary)]/50 group rounded px-1">
								<!-- Avatar (absolute so tall avatars don't inflate row height) -->
								{#if msg.senderAvatar}
									<img
										src={msg.senderAvatar}
										alt={msg.senderName || (isUser ? 'User' : 'Assistant')}
										class="absolute left-1 top-0 {avatarSize} {avatarClass} object-cover"
									/>
								{:else}
									<div class="absolute left-1 top-0 {avatarSize} {avatarClass} flex items-center justify-center text-white font-bold text-sm {isUser
										? 'bg-[var(--accent-primary)]'
										: 'bg-[var(--accent-secondary)]'}">
										{(msg.senderName || (isUser ? 'U' : 'A')).charAt(0).toUpperCase()}
									</div>
								{/if}

								<div class="flex items-baseline gap-2">
									<span class="font-semibold text-sm {isUser ? 'text-[var(--accent-primary)]' : 'text-[var(--accent-secondary)]'}">
										{msg.senderName || (isUser ? 'User' : 'Assistant')}
									</span>
									<span class="text-xs text-[var(--text-muted)]">{formatTime(msg.createdAt)}</span>
								</div>
								{#if editingMessageId === msg.id}
									<div class="space-y-2 pr-2">
										<textarea
											bind:value={editContent}
											onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') cancelEdit(); }}
											rows="2"
											class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none resize-none"
										></textarea>
										<div class="flex gap-2 text-xs">
											<button onclick={() => saveEdit(msg.id)} class="text-[var(--accent-primary)] hover:underline">save</button>
											<button onclick={cancelEdit} class="text-[var(--text-muted)] hover:underline">cancel</button>
										</div>
									</div>
								{:else}
									<p class="text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
								{/if}

								<!-- Hover controls -->
								{#if editingMessageId !== msg.id}
									<div class="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md shadow-lg px-1 py-0.5">
										{#if msg.reasoning}
											<button onclick={() => showReasoningForId = msg.id} class="p-1 text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] transition" title="View reasoning">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
											</button>
										{/if}
										<button onclick={() => copyMessage(msg)} class="p-1 transition {copiedMessageId === msg.id ? 'text-[var(--success)]' : 'text-[var(--text-muted)] hover:text-[var(--accent-primary)]'}" title="Copy">
											{#if copiedMessageId === msg.id}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
											{/if}
										</button>
										<button onclick={() => startEdit(msg)} class="p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition" title="Edit">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
										</button>
										<button onclick={() => deleteMessage(msg.id)} class="p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition" title="Delete from here">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
										</button>
									</div>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			{/if}

		</div>

		<!-- Typing indicator -->
		{#if typingCharacter}
			<div class="px-5 h-5 flex items-center">
				<span class="text-xs text-[var(--text-muted)]">
					<span class="font-semibold">{typingCharacter}</span> is typing<span class="inline-flex w-4 ml-0.5 tracking-widest animate-pulse">...</span>
				</span>
			</div>
		{:else}
			<div class="h-5"></div>
		{/if}

		<!-- Input Area -->
		<div class="px-4 pb-4 pt-2 flex-shrink-0">
			<div class="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-3">
				<textarea
					bind:value={input}
					onkeydown={handleKeydown}
					placeholder="Message #{data.channelName}"
					rows="1"
					disabled={sending}
					class="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none max-h-32 disabled:opacity-50 leading-normal"
				></textarea>
				<button
					onclick={sendMessage}
					disabled={!input.trim() || sending}
					class="p-1.5 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
					</svg>
				</button>
			</div>
		</div>
		</div><!-- /chat column -->

		<!-- Members Sidebar -->
		{#if !membersSidebarCollapsed}
			<ChannelMembersSidebar {characters} user={data.user} {avatarStyle} />
		{/if}
		</div><!-- /flex wrapper -->
	</div>
</MainLayout>

<!-- Reasoning Modal -->
{#if showReasoningForId !== null}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
		onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) showReasoningForId = null; }}
		onkeydown={(e) => e.key === 'Escape' && (showReasoningForId = null)}
	>
		<div class="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
			<div class="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
				<h2 class="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
					<svg class="w-5 h-5 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
					</svg>
					Reasoning
				</h2>
				<button
					onclick={() => showReasoningForId = null}
					class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition cursor-pointer"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
					</svg>
				</button>
			</div>
			<div class="p-4 overflow-y-auto">
				<pre class="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">{reasoningContent}</pre>
			</div>
		</div>
	</div>
{/if}
