<script lang="ts">
	interface Props {
		channelName: string;
		channelDescription?: string | null;
		messagesCount: number;
		generating: boolean;
		charactersAvailable: boolean;
		allEngaged: boolean;
		hasEngaged: boolean;
		membersSidebarCollapsed: boolean;
		onExport: () => void;
		onDebugGenerate: () => void;
		onDebugEngage: () => void;
		onDebugClearEngage: () => void;
		onDebugWipe: () => void;
		onToggleMembers: () => void;
	}

	let {
		channelName,
		channelDescription,
		messagesCount,
		generating,
		charactersAvailable,
		allEngaged,
		hasEngaged,
		membersSidebarCollapsed = $bindable(),
		onExport,
		onDebugGenerate,
		onDebugEngage,
		onDebugClearEngage,
		onDebugWipe,
		onToggleMembers
	}: Props = $props();
</script>

<div class="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-3 flex items-center gap-3 flex-shrink-0">
	<svg class="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
	</svg>
	<h2 class="text-lg font-semibold text-[var(--text-primary)]">{channelName}</h2>
	{#if channelDescription}
		<span class="text-sm text-[var(--text-muted)] border-l border-[var(--border-primary)] pl-3 ml-1 flex-1 truncate">{channelDescription}</span>
	{:else}
		<div class="flex-1"></div>
	{/if}
	<!-- Export chat -->
	<button
		onclick={onExport}
		disabled={messagesCount === 0}
		class="p-1.5 rounded-lg transition cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed"
		title="Export chat to .txt"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
		</svg>
	</button>
	<!-- Debug: trigger character message -->
	<button
		onclick={onDebugGenerate}
		disabled={generating || !charactersAvailable}
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
	<!-- Debug: engage random character -->
	<button
		onclick={onDebugEngage}
		disabled={!charactersAvailable || allEngaged}
		class="p-1.5 rounded-lg transition cursor-pointer text-[var(--warning)] hover:bg-[var(--warning)]/10 disabled:opacity-30 disabled:cursor-not-allowed"
		title="Debug: Engage random character"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
		</svg>
	</button>
	<!-- Debug: clear all engagement -->
	<button
		onclick={onDebugClearEngage}
		disabled={!hasEngaged}
		class="p-1.5 rounded-lg transition cursor-pointer text-[var(--error)] hover:bg-[var(--error)]/10 disabled:opacity-30 disabled:cursor-not-allowed"
		title="Debug: Clear all engagement"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/>
		</svg>
	</button>
	<!-- Debug: wipe chat + memories -->
	<button
		onclick={onDebugWipe}
		class="p-1.5 rounded-lg transition cursor-pointer text-[var(--error)] hover:bg-[var(--error)]/10"
		title="Debug: Wipe all messages and memories"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
		</svg>
	</button>
	<!-- Members toggle -->
	<button
		onclick={onToggleMembers}
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
