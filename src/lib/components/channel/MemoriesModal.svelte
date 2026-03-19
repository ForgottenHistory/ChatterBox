<script lang="ts">
	import type { CharacterMemory } from '$lib/server/db/schema';

	interface Props {
		characterId: number;
		characterName: string;
		onClose: () => void;
	}

	let { characterId, characterName, onClose }: Props = $props();

	let memories = $state<CharacterMemory[]>([]);
	let loading = $state(true);

	$effect(() => {
		loadMemories();
	});

	async function loadMemories() {
		loading = true;
		try {
			const res = await fetch(`/api/characters/${characterId}/memories`);
			if (res.ok) {
				const data = await res.json();
				memories = data.memories || [];
			}
		} catch (err) {
			console.error('Failed to load memories:', err);
		} finally {
			loading = false;
		}
	}

	async function deleteMemory(memoryId: number) {
		try {
			const res = await fetch(`/api/characters/${characterId}/memories`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ memoryId })
			});
			if (res.ok) {
				memories = memories.filter(m => m.id !== memoryId);
			}
		} catch (err) {
			console.error('Failed to delete memory:', err);
		}
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
	onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); }}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
			<div>
				<h2 class="text-lg font-bold text-[var(--text-primary)]">{characterName}'s Memories</h2>
				<p class="text-xs text-[var(--text-muted)]">{memories.length} memories stored</p>
			</div>
			<button
				onclick={onClose}
				class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition cursor-pointer"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
				</div>
			{:else if memories.length === 0}
				<div class="text-center py-12">
					<svg class="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
					</svg>
					<p class="text-[var(--text-secondary)] text-sm">No memories yet</p>
					<p class="text-[var(--text-muted)] text-xs mt-1">Memories are created when {characterName} disengages from a conversation</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each memories as memory}
						<div class="group flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-primary)] transition">
							<div class="flex-1 min-w-0">
								<p class="text-sm text-[var(--text-primary)]">{memory.content}</p>
								<div class="flex items-center gap-2 mt-1">
									<span class="text-xs text-[var(--text-muted)]">{formatDate(memory.createdAt)}</span>
									<span class="text-xs text-[var(--text-muted)]">· {memory.source}</span>
								</div>
							</div>
							<button
								onclick={() => deleteMemory(memory.id)}
								class="p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0"
								title="Delete memory"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
