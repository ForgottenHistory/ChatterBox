<script lang="ts">
	import type { User } from '$lib/server/db/schema';
	import Sidebar from './layout/Sidebar.svelte';
	import TopNavBar from './layout/TopNavBar.svelte';

	interface Props {
		user: Omit<User, 'passwordHash'>;
		currentPath: string;
	}

	let { user, currentPath }: Props = $props();

	let sidebarCollapsed = $state(false);

	// Load/save collapsed state
	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('sidebarCollapsed');
		if (saved !== null) sidebarCollapsed = saved === 'true';
	}

	$effect(() => {
		localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
	});
</script>

<div class="flex h-screen bg-[var(--bg-primary)]">
	<Sidebar {user} {currentPath} bind:collapsed={sidebarCollapsed} />

	<!-- Sidebar Toggle Button -->
	<button
		onclick={() => sidebarCollapsed = !sidebarCollapsed}
		class="fixed left-{sidebarCollapsed
			? '0'
			: '[312px]'} top-1/2 -translate-y-1/2 z-50 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] p-2 rounded-r-lg shadow-md hover:bg-[var(--bg-tertiary)] transition"
		title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			{#if sidebarCollapsed}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			{:else}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			{/if}
		</svg>
	</button>

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col">
		<TopNavBar {currentPath} />

		<div class="flex-1 overflow-hidden">
			<slot />
		</div>
	</div>
</div>
