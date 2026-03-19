<script lang="ts">
	import type { Character } from '$lib/server/db/schema';
	import { estimateTokens } from '$lib/utils/tokenCount';

	interface Props {
		character: Character;
		onSaveDescription: (value: string) => Promise<void>;
		onSavePersonality: (value: string) => Promise<void>;
	}

	let { character, onSaveDescription, onSavePersonality }: Props = $props();

	// Description state
	let editingDesc = $state(false);
	let editedDesc = $state('');
	let savingDesc = $state(false);
	let copiedDesc = $state(false);
	let rewritingDesc = $state(false);

	// Personality state
	let editingPers = $state(false);
	let editedPers = $state('');
	let savingPers = $state(false);
	let copiedPers = $state(false);
	let rewritingPers = $state(false);

	let hasOriginalDesc = $derived(!!character.originalDescription && character.originalDescription !== character.description);
	let hasOriginalPers = $derived(!!character.originalPersonality && character.originalPersonality !== character.personality);

	async function copyField(content: string, field: 'desc' | 'pers') {
		if (!content) return;
		try {
			await navigator.clipboard.writeText(content);
			if (field === 'desc') { copiedDesc = true; setTimeout(() => copiedDesc = false, 2000); }
			else { copiedPers = true; setTimeout(() => copiedPers = false, 2000); }
		} catch (err) { console.error('Failed to copy:', err); }
	}

	async function rewriteField(field: 'desc' | 'pers') {
		// Description rewrites from itself; personality summarizes from the description
		const input = field === 'desc'
			? (editingDesc ? editedDesc : (character.description || ''))
			: (character.description || character.personality || '');
		if (!input.trim()) return;

		if (field === 'desc') rewritingDesc = true;
		else rewritingPers = true;

		try {
			const response = await fetch('/api/content/rewrite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: field === 'desc' ? 'description' : 'personality', input })
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Rewrite failed');
			}
			const { rewritten } = await response.json();
			if (field === 'desc') { editedDesc = rewritten; editingDesc = true; }
			else { editedPers = rewritten; editingPers = true; }
		} catch (err: any) {
			console.error(`Failed to rewrite:`, err);
			alert(`Failed to rewrite: ${err.message}`);
		} finally {
			rewritingDesc = false;
			rewritingPers = false;
		}
	}

	async function saveDesc() {
		savingDesc = true;
		try { await onSaveDescription(editedDesc); editingDesc = false; }
		finally { savingDesc = false; }
	}

	async function savePers() {
		savingPers = true;
		try { await onSavePersonality(editedPers); editingPers = false; }
		finally { savingPers = false; }
	}

	async function revertDesc() {
		if (!character.originalDescription) return;
		savingDesc = true;
		try { await onSaveDescription(character.originalDescription); }
		finally { savingDesc = false; }
	}

	async function revertPers() {
		if (!character.originalPersonality) return;
		savingPers = true;
		try { await onSavePersonality(character.originalPersonality); }
		finally { savingPers = false; }
	}
</script>

<div class="space-y-6">
	<h3 class="text-xl font-semibold text-[var(--text-primary)]">Character Overview</h3>

	<!-- Description -->
	<div>
		<div class="flex items-center justify-between mb-2 group">
			<div class="flex items-center gap-2">
				<h4 class="text-sm font-medium text-[var(--text-secondary)]">Description</h4>
				<span class="text-xs text-[var(--text-muted)]">~{estimateTokens(editingDesc ? editedDesc : (character.description || '')).toLocaleString()} tokens</span>
			</div>
			{#if !editingDesc}
				<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
					{#if hasOriginalDesc}
						<button onclick={revertDesc} disabled={savingDesc} class="p-1.5 text-[var(--warning)] hover:bg-[var(--warning)]/10 rounded-lg transition" title="Revert to original card description">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
						</button>
					{/if}
					{#if character.description}
						<button onclick={() => copyField(character.description || '', 'desc')} class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition" title="Copy">
							{#if copiedDesc}
								<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
							{/if}
						</button>
					{/if}
					<button onclick={() => rewriteField('desc')} disabled={rewritingDesc || !character.description} class="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition disabled:opacity-30" title="Rewrite with AI">
						{#if rewritingDesc}
							<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
						{/if}
					</button>
					<button onclick={() => { editedDesc = character.description || ''; editingDesc = true; }} class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition" title="Edit">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
					</button>
				</div>
			{/if}
		</div>
		{#if editingDesc}
			<div class="space-y-2">
				<textarea bind:value={editedDesc} rows="6" class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"></textarea>
				<div class="flex gap-2 text-xs">
					<button onclick={saveDesc} disabled={savingDesc} class="text-[var(--accent-primary)] hover:underline">{savingDesc ? 'Saving...' : 'Save'}</button>
					<button onclick={() => rewriteField('desc')} disabled={rewritingDesc || !editedDesc.trim()} class="text-[var(--accent-primary)] hover:underline flex items-center gap-1">
						{#if rewritingDesc}<div class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>Rewriting...{:else}Rewrite{/if}
					</button>
					<button onclick={() => editingDesc = false} class="text-[var(--text-muted)] hover:underline">Cancel</button>
				</div>
			</div>
		{:else if character.description}
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed text-sm">{character.description}</div>
		{:else}
			<p class="text-[var(--text-muted)] italic">No description available</p>
		{/if}
	</div>

	<!-- Personality -->
	<div>
		<div class="flex items-center justify-between mb-2 group">
			<div class="flex items-center gap-2">
				<h4 class="text-sm font-medium text-[var(--text-secondary)]">Personality</h4>
				<span class="text-xs text-[var(--text-muted)]">~{estimateTokens(editingPers ? editedPers : (character.personality || '')).toLocaleString()} tokens</span>
			</div>
			{#if !editingPers}
				<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
					{#if hasOriginalPers}
						<button onclick={revertPers} disabled={savingPers} class="p-1.5 text-[var(--warning)] hover:bg-[var(--warning)]/10 rounded-lg transition" title="Revert to original card personality">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
						</button>
					{/if}
					{#if character.personality}
						<button onclick={() => copyField(character.personality || '', 'pers')} class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition" title="Copy">
							{#if copiedPers}
								<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
							{/if}
						</button>
					{/if}
					<button onclick={() => rewriteField('pers')} disabled={rewritingPers || !character.description} class="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition disabled:opacity-30" title="Generate from description">
						{#if rewritingPers}
							<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
						{/if}
					</button>
					<button onclick={() => { editedPers = character.personality || ''; editingPers = true; }} class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition" title="Edit">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
					</button>
				</div>
			{/if}
		</div>
		{#if editingPers}
			<div class="space-y-2">
				<textarea bind:value={editedPers} rows="6" class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"></textarea>
				<div class="flex gap-2 text-xs">
					<button onclick={savePers} disabled={savingPers} class="text-[var(--accent-primary)] hover:underline">{savingPers ? 'Saving...' : 'Save'}</button>
					<button onclick={() => rewriteField('pers')} disabled={rewritingPers || !character.description} class="text-[var(--accent-primary)] hover:underline flex items-center gap-1">
						{#if rewritingPers}<div class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>Rewriting...{:else}Rewrite{/if}
					</button>
					<button onclick={() => editingPers = false} class="text-[var(--text-muted)] hover:underline">Cancel</button>
				</div>
			</div>
		{:else if character.personality}
			<div class="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed text-sm">{character.personality}</div>
		{:else}
			<p class="text-[var(--text-muted)] italic">No personality defined</p>
		{/if}
	</div>
</div>
