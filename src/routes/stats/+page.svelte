<script lang="ts">
	import type { PageData } from './$types';
	import MainLayout from '$lib/components/MainLayout.svelte';

	let { data }: { data: PageData } = $props();

	let stats = $state<any>(null);
	let loading = $state(true);

	$effect(() => { loadStats(); });

	async function loadStats() {
		try {
			const res = await fetch('/api/stats');
			if (res.ok) stats = await res.json();
		} catch (e) { console.error('Failed to load stats:', e); }
		finally { loading = false; }
	}
</script>

<svelte:head>
	<title>Statistics | ChatterBox</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/stats">
	<div class="h-full overflow-y-auto">
		<div class="max-w-5xl mx-auto px-8 py-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-[var(--text-primary)]">Statistics</h1>
				<p class="text-[var(--text-secondary)] mt-2">Overview of your ChatterBox usage</p>
			</div>

			{#if loading}
				<div class="text-center py-12 text-[var(--text-muted)]">
					<div class="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p>Loading stats...</p>
				</div>
			{:else if stats}
				<!-- Stats Grid -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<!-- Total Messages -->
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-5">
						<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Messages</p>
						<p class="text-2xl font-bold text-[var(--text-primary)]">{stats.messages.total.toLocaleString()}</p>
					</div>

					<!-- User Messages -->
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-5">
						<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Your Messages</p>
						<p class="text-2xl font-bold text-[var(--accent-primary)]">{stats.messages.user.toLocaleString()}</p>
					</div>

					<!-- AI Messages -->
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-5">
						<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">AI Messages</p>
						<p class="text-2xl font-bold text-[var(--accent-secondary)]">{stats.messages.ai.toLocaleString()}</p>
					</div>

					<!-- Total Memories -->
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-5">
						<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Memories</p>
						<p class="text-2xl font-bold text-[var(--warning)]">{stats.memories.total.toLocaleString()}</p>
					</div>
				</div>

				<!-- Second Row -->
				<div class="grid grid-cols-3 gap-4 mb-8">
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-5">
						<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Characters</p>
						<p class="text-2xl font-bold text-[var(--text-primary)]">{stats.characters.total}</p>
					</div>
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-5">
						<p class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Channels</p>
						<p class="text-2xl font-bold text-[var(--text-primary)]">{stats.channels}</p>
					</div>
				</div>

				<!-- Messages Per Character -->
				{#if stats.messages.perCharacter.length > 0}
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-6 mb-6">
						<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Messages by Character</h2>
						<div class="space-y-3">
							{#each stats.messages.perCharacter as { name, count }}
								{@const maxCount = stats.messages.perCharacter[0].count}
								<div class="flex items-center gap-3">
									<span class="text-sm text-[var(--text-secondary)] w-32 truncate flex-shrink-0">{name}</span>
									<div class="flex-1 bg-[var(--bg-tertiary)] rounded-full h-5 overflow-hidden">
										<div
											class="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all"
											style="width: {Math.max(2, (count / maxCount) * 100)}%"
										></div>
									</div>
									<span class="text-sm font-mono text-[var(--text-muted)] w-16 text-right flex-shrink-0">{count}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Memories Per Character -->
				{#if stats.memories.perCharacter.length > 0}
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-6">
						<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Memories by Character</h2>
						<div class="space-y-3">
							{#each stats.memories.perCharacter as { name, count }}
								{@const maxCount = stats.memories.perCharacter[0].count}
								<div class="flex items-center gap-3">
									<span class="text-sm text-[var(--text-secondary)] w-32 truncate flex-shrink-0">{name}</span>
									<div class="flex-1 bg-[var(--bg-tertiary)] rounded-full h-5 overflow-hidden">
										<div
											class="h-full bg-gradient-to-r from-[var(--warning)] to-[var(--error)] rounded-full transition-all"
											style="width: {Math.max(2, (count / maxCount) * 100)}%"
										></div>
									</div>
									<span class="text-sm font-mono text-[var(--text-muted)] w-16 text-right flex-shrink-0">{count}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- LLM Usage -->
				{#if stats.llm}
					<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-6 mb-6">
						<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">LLM Usage</h2>

						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
							<div class="p-3 bg-[var(--bg-tertiary)] rounded-lg">
								<p class="text-xs text-[var(--text-muted)] uppercase mb-1">API Calls</p>
								<p class="text-xl font-bold text-[var(--text-primary)]">{stats.llm.totalCalls.toLocaleString()}</p>
							</div>
							<div class="p-3 bg-[var(--bg-tertiary)] rounded-lg">
								<p class="text-xs text-[var(--text-muted)] uppercase mb-1">Success Rate</p>
								<p class="text-xl font-bold text-[var(--success)]">{stats.llm.totalCalls > 0 ? Math.round((stats.llm.successCalls / stats.llm.totalCalls) * 100) : 0}%</p>
							</div>
							<div class="p-3 bg-[var(--bg-tertiary)] rounded-lg">
								<p class="text-xs text-[var(--text-muted)] uppercase mb-1">Total Tokens</p>
								<p class="text-xl font-bold text-[var(--accent-primary)]">{stats.llm.tokens.total.toLocaleString()}</p>
							</div>
							<div class="p-3 bg-[var(--bg-tertiary)] rounded-lg">
								<p class="text-xs text-[var(--text-muted)] uppercase mb-1">Failed Calls</p>
								<p class="text-xl font-bold text-[var(--error)]">{stats.llm.failedCalls}</p>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3 mb-6">
							<div class="p-3 bg-[var(--bg-tertiary)] rounded-lg">
								<p class="text-xs text-[var(--text-muted)] uppercase mb-1">Prompt Tokens</p>
								<p class="text-lg font-bold text-[var(--text-secondary)]">{stats.llm.tokens.prompt.toLocaleString()}</p>
							</div>
							<div class="p-3 bg-[var(--bg-tertiary)] rounded-lg">
								<p class="text-xs text-[var(--text-muted)] uppercase mb-1">Completion Tokens</p>
								<p class="text-lg font-bold text-[var(--text-secondary)]">{stats.llm.tokens.completion.toLocaleString()}</p>
							</div>
						</div>

						<!-- Model Usage -->
						{#if stats.llm.modelUsage.length > 0}
							<h3 class="text-sm font-semibold text-[var(--text-secondary)] mb-3">Model Usage</h3>
							<div class="space-y-2 mb-6">
								{#each stats.llm.modelUsage as { model, count, tokens }}
									{@const maxCount = stats.llm.modelUsage[0].count}
									<div class="flex items-center gap-3">
										<span class="text-xs text-[var(--text-secondary)] w-40 truncate flex-shrink-0" title={model}>{model.split('/').pop() || model}</span>
										<div class="flex-1 bg-[var(--bg-primary)] rounded-full h-4 overflow-hidden">
											<div class="h-full bg-[var(--accent-primary)] rounded-full" style="width: {Math.max(2, (count / maxCount) * 100)}%"></div>
										</div>
										<span class="text-xs font-mono text-[var(--text-muted)] w-12 text-right flex-shrink-0">{count}</span>
										<span class="text-xs text-[var(--text-muted)] w-20 text-right flex-shrink-0">{Number(tokens).toLocaleString()} tk</span>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Calls by Type -->
						{#if stats.llm.callsByType.length > 0}
							<h3 class="text-sm font-semibold text-[var(--text-secondary)] mb-3">Calls by Type</h3>
							<div class="flex flex-wrap gap-2">
								{#each stats.llm.callsByType as { type, count }}
									<div class="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-xs">
										<span class="text-[var(--text-secondary)]">{type}</span>
										<span class="text-[var(--accent-primary)] font-bold ml-1">{count}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</MainLayout>
