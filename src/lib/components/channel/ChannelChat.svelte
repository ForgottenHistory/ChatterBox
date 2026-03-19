<script lang="ts">
	import type { Message } from '$lib/server/db/schema';
	import { tick } from 'svelte';
	import { parseEmojis } from '$lib/utils/twemoji';

	interface Props {
		messages: Message[];
		loading: boolean;
		channelName: string;
		channelDescription?: string | null;
		channelId: number;
		typingCharacter: string | null;
		sending: boolean;
		avatarStyle: 'circle' | 'rounded';
		onSend: (text: string) => void;
		onShowReasoning: (msgId: number) => void;
	}

	let { messages = $bindable(), loading, channelName, channelDescription, channelId, typingCharacter, sending, avatarStyle, onSend, onShowReasoning }: Props = $props();

	let input = $state('');
	let inputRef = $state<HTMLTextAreaElement | undefined>();
	let messagesContainer = $state<HTMLDivElement | undefined>();

	// Edit state
	let editingMessageId = $state<number | null>(null);
	let editContent = $state('');
	let copiedMessageId = $state<number | null>(null);

	// Avatar derived
	let avatarClass = $derived(avatarStyle === 'rounded' ? 'rounded-lg' : 'rounded-full');
	let avatarSize = $derived(avatarStyle === 'rounded' ? 'w-9 h-12' : 'w-10 h-10');
	let compactPadding = $derived(avatarStyle === 'rounded' ? 'pl-12' : 'pl-14');

	export function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	export function focusInput() {
		inputRef?.focus();
	}

	function handleSend() {
		const text = input.trim();
		if (!text || sending) return;
		input = '';
		onSend(text);
	}

	function formatTime(date: Date | string) {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
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
			const response = await fetch(`/api/chat/messages/${msgId}/delete`, { method: 'DELETE' });
			if (response.ok) {
				const idx = messages.findIndex(m => m.id === msgId);
				if (idx !== -1) messages = messages.slice(0, idx);
			}
		} catch (error) {
			console.error('Failed to delete message:', error);
		}
	}
</script>

<!-- Messages Area -->
<div bind:this={messagesContainer} use:parseEmojis class="flex-1 overflow-y-auto">
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
				<h3 class="text-xl font-bold text-[var(--text-primary)] mb-1">Welcome to #{channelName}!</h3>
				<p class="text-[var(--text-muted)] text-sm">
					{channelDescription || 'This is the beginning of the channel. Say something!'}
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
					<div class="relative {compactPadding} py-0.5 group rounded">
						{#if editingMessageId === msg.id}
							<div class="space-y-2 pr-2">
								<textarea bind:value={editContent} onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') cancelEdit(); }} rows="2" class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none resize-none"></textarea>
								<div class="flex gap-2 text-xs">
									<button onclick={() => saveEdit(msg.id)} class="text-[var(--accent-primary)] hover:underline">save</button>
									<button onclick={cancelEdit} class="text-[var(--text-muted)] hover:underline">cancel</button>
								</div>
							</div>
						{:else}
							<p class="text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
						{/if}
						{@render hoverControls(msg)}
					</div>
				{:else}
					<div class="relative {compactPadding} mt-3 pb-0.5 hover:bg-[var(--bg-secondary)]/50 group rounded px-1">
						{#if msg.senderAvatar}
							<img src={msg.senderAvatar} alt={msg.senderName || (isUser ? 'User' : 'Assistant')} class="absolute left-1 top-0 {avatarSize} {avatarClass} object-cover" />
						{:else}
							<div class="absolute left-1 top-0 {avatarSize} {avatarClass} flex items-center justify-center text-white font-bold text-sm {isUser ? 'bg-[var(--accent-primary)]' : 'bg-[var(--accent-secondary)]'}">
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
								<textarea bind:value={editContent} onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') cancelEdit(); }} rows="2" class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none resize-none"></textarea>
								<div class="flex gap-2 text-xs">
									<button onclick={() => saveEdit(msg.id)} class="text-[var(--accent-primary)] hover:underline">save</button>
									<button onclick={cancelEdit} class="text-[var(--text-muted)] hover:underline">cancel</button>
								</div>
							</div>
						{:else}
							<p class="text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
						{/if}
						{@render hoverControls(msg)}
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
			bind:this={inputRef}
			bind:value={input}
			onkeydown={handleKeydown}
			placeholder="Message #{channelName}"
			rows="1"
			disabled={sending}
			class="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none max-h-32 disabled:opacity-50 leading-normal"
		></textarea>
		<button
			onclick={handleSend}
			disabled={!input.trim() || sending}
			class="p-1.5 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
			</svg>
		</button>
	</div>
</div>

{#snippet hoverControls(msg: Message)}
	{#if editingMessageId !== msg.id}
		<div class="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md shadow-lg px-1 py-0.5">
			{#if msg.reasoning}
				<button onclick={() => onShowReasoning(msg.id)} class="p-1 text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] transition" title="View reasoning">
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
{/snippet}
