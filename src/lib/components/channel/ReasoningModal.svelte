<script lang="ts">
	interface Props {
		content: string;
		onClose: () => void;
	}

	let { content, onClose }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
	onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); }}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
		<div class="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
			<h2 class="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
				<svg class="w-5 h-5 text-[var(--accent-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
				</svg>
				Reasoning
			</h2>
			<button
				onclick={onClose}
				class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition cursor-pointer"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>
		<div class="p-4 overflow-y-auto">
			<pre class="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
		</div>
	</div>
</div>
