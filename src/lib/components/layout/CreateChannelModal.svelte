<script lang="ts">
	import type { Conversation } from '$lib/server/db/schema';

	interface Props {
		show: boolean;
		oncreated: (channel: Conversation) => void;
	}

	let { show = $bindable(), oncreated }: Props = $props();

	let channelName = $state('');
	let channelDescription = $state('');
	let error = $state('');
	let isCreating = $state(false);
	let nameInputRef = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (show) {
			channelName = '';
			channelDescription = '';
			error = '';
			setTimeout(() => nameInputRef?.focus(), 0);
		}
	});

	function close() {
		show = false;
	}

	async function create() {
		if (!channelName.trim() || isCreating) return;

		isCreating = true;
		error = '';

		try {
			const response = await fetch('/api/channels', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: channelName.trim(),
					description: channelDescription.trim() || undefined
				})
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to create channel';
				return;
			}

			oncreated(result.channel);
			close();
		} catch {
			error = 'Failed to create channel';
		} finally {
			isCreating = false;
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
		onkeydown={(e) => e.key === 'Escape' && close()}
		onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) close(); }}
	>
		<div class="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
			<h2 class="text-lg font-bold text-[var(--text-primary)] mb-4">Create Channel</h2>

			<form onsubmit={(e) => { e.preventDefault(); create(); }}>
				<div class="mb-4">
					<label for="channel-name" class="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
						Channel Name
					</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">#</span>
						<input
							bind:this={nameInputRef}
							id="channel-name"
							type="text"
							bind:value={channelName}
							placeholder="new-channel"
							class="w-full pl-7 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
						/>
					</div>
					<p class="text-xs text-[var(--text-muted)] mt-1">Lowercase, no spaces (hyphens allowed)</p>
				</div>

				<div class="mb-5">
					<label for="channel-desc" class="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
						Description <span class="text-[var(--text-muted)]">(optional)</span>
					</label>
					<input
						id="channel-desc"
						type="text"
						bind:value={channelDescription}
						placeholder="What's this channel about?"
						class="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
					/>
				</div>

				{#if error}
					<p class="text-sm text-[var(--error)] mb-4">{error}</p>
				{/if}

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={close}
						class="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!channelName.trim() || isCreating}
						class="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isCreating ? 'Creating...' : 'Create Channel'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
