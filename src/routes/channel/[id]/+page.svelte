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
	let messagesContainer = $state<HTMLDivElement | undefined>();
	let membersSidebarCollapsed = $state(false);

	onMount(() => {
		loadMessages();
		if (!isCharactersCacheLoaded()) {
			loadCharacters();
		}

		const savedMembersSidebar = localStorage.getItem('channelMembersSidebar');
		if (savedMembersSidebar !== null) {
			membersSidebarCollapsed = savedMembersSidebar === 'collapsed';
		}
	});

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
							<div class="pl-14 py-0.5 hover:bg-[var(--bg-secondary)]/50 group rounded">
								<p class="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
							</div>
						{:else}
							<!-- Full message with avatar -->
							<div class="flex items-start gap-3 pt-3 pb-0.5 hover:bg-[var(--bg-secondary)]/50 group rounded px-1">
								<!-- Avatar -->
								{#if msg.senderAvatar}
									<img
										src={msg.senderAvatar}
										alt={msg.senderName || (isUser ? 'User' : 'Assistant')}
										class="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5"
									/>
								{:else}
									<div class="w-10 h-10 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-white font-bold text-sm {isUser
										? 'bg-[var(--accent-primary)]'
										: 'bg-[var(--accent-secondary)]'}">
										{(msg.senderName || (isUser ? 'U' : 'A')).charAt(0).toUpperCase()}
									</div>
								{/if}

								<div class="flex-1 min-w-0">
									<div class="flex items-baseline gap-2">
										<span class="font-semibold text-sm {isUser ? 'text-[var(--accent-primary)]' : 'text-[var(--accent-secondary)]'}">
											{msg.senderName || (isUser ? 'User' : 'Assistant')}
										</span>
										<span class="text-xs text-[var(--text-muted)]">{formatTime(msg.createdAt)}</span>
									</div>
									<p class="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

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
			<ChannelMembersSidebar {characters} user={data.user} />
		{/if}
		</div><!-- /flex wrapper -->
	</div>
</MainLayout>
