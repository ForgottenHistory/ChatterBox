<script lang="ts">
	import type { Character } from '$lib/server/db/schema';
	import { estimateTokens } from '$lib/utils/tokenCount';

	interface Props {
		character: Character;
		onSave: (value: string) => Promise<void>;
	}

	let { character, onSave }: Props = $props();

	let editing = $state(false);
	let editedDescription = $state('');
	let saving = $state(false);
	let copied = $state(false);
	let rewriting = $state(false);

	async function copyDescription() {
		const content = character.description || '';
		if (!content) return;

		try {
			await navigator.clipboard.writeText(content);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function rewriteDescription() {
		const input = editing ? editedDescription : (character.description || '');
		if (!input.trim()) return;

		rewriting = true;
		try {
			const response = await fetch('/api/content/rewrite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'description', input })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Rewrite failed');
			}

			const { rewritten } = await response.json();
			editedDescription = rewritten;
			editing = true;
		} catch (err: any) {
			console.error('Failed to rewrite description:', err);
			alert(`Failed to rewrite: ${err.message}`);
		} finally {
			rewriting = false;
		}
	}

	function startEditing() {
		editedDescription = character.description || '';
		editing = true;
	}

	async function save() {
		saving = true;
		try {
			await onSave(editedDescription);
			editing = false;
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-4">
	<h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">Character Overview</h3>

	<!-- Description -->
	<div>
		<div class="flex items-center justify-between mb-2 group">
			<div class="flex items-center gap-2">
				<h4 class="text-sm font-medium text-[var(--text-secondary)]">Description</h4>
				<span class="text-xs text-[var(--text-muted)]">~{estimateTokens(editing ? editedDescription : (character.description || '')).toLocaleString()} tokens</span>
			</div>
			{#if !editing}
				<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
					{#if character.description}
					<button
						onclick={copyDescription}
						class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
						title="Copy to clipboard"
					>
						{#if copied}
							<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						{/if}
					</button>
					{/if}
					<button
						onclick={rewriteDescription}
						disabled={rewriting || !character.description}
						class="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
						title="Rewrite with AI"
					>
						{#if rewriting}
							<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
							</svg>
						{/if}
					</button>
					<button
						onclick={startEditing}
						class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
						aria-label="Edit description"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
						</svg>
					</button>
				</div>
			{/if}
		</div>
		{#if editing}
			<div class="space-y-2">
				<textarea
					bind:value={editedDescription}
					rows="6"
					class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
					placeholder="Enter description..."
				></textarea>
				<div class="flex gap-2">
					<button
						onclick={save}
						disabled={saving}
						class="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<button
						onclick={rewriteDescription}
						disabled={rewriting || !editedDescription.trim()}
						class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--accent-primary)] text-sm rounded-lg hover:bg-[var(--accent-primary)]/10 transition disabled:opacity-50 flex items-center gap-1.5"
					>
						{#if rewriting}
							<div class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
							Rewriting...
						{:else}
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
							</svg>
							Rewrite
						{/if}
					</button>
					<button
						onclick={() => editing = false}
						class="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-lg hover:bg-[var(--border-primary)] transition"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else if character.description}
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
				{character.description}
			</div>
		{:else}
			<p class="text-[var(--text-muted)] italic">No description available</p>
		{/if}
	</div>
</div>
