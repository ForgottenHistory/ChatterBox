<script lang="ts">
	import type { PageData } from './$types';
	import MainLayout from '$lib/components/MainLayout.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>#{data.channelName} | ChatterBox</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/channel/{data.channelId}">
	<div class="h-full flex flex-col">
		<!-- Channel Header -->
		<div class="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-3 flex items-center gap-3">
			<svg class="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
			</svg>
			<h2 class="text-lg font-semibold text-[var(--text-primary)]">{data.channelName}</h2>
			{#if data.channelDescription}
				<span class="text-sm text-[var(--text-muted)] border-l border-[var(--border-primary)] pl-3 ml-1">{data.channelDescription}</span>
			{/if}
		</div>

		<!-- Messages Area (placeholder) -->
		<div class="flex-1 overflow-y-auto flex items-center justify-center">
			<div class="text-center px-4">
				<div class="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
					<svg class="w-10 h-10 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
					</svg>
				</div>
				<h3 class="text-xl font-bold text-[var(--text-primary)] mb-1">Welcome to #{data.channelName}!</h3>
				<p class="text-[var(--text-muted)] text-sm">
					{data.channelDescription || 'This is the start of the channel.'}
				</p>
			</div>
		</div>

		<!-- Input Area (placeholder) -->
		<div class="p-4 border-t border-[var(--border-primary)]">
			<div class="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-3">
				<input
					type="text"
					placeholder="Message #{data.channelName}"
					disabled
					class="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none disabled:opacity-50"
				/>
			</div>
			<p class="text-xs text-[var(--text-muted)] mt-2 text-center">Channel messaging coming soon</p>
		</div>
	</div>
</MainLayout>
