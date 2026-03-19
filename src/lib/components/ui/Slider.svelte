<script lang="ts">
	interface Props {
		min?: number;
		max?: number;
		step?: number;
		value: number;
		unit?: string;
		accentColor?: string;
	}

	let { min = 0, max = 100, step = 1, value = $bindable(), unit = '', accentColor = 'var(--accent-primary)' }: Props = $props();

	let track = $state<HTMLDivElement | undefined>();
	let dragging = $state(false);

	let percent = $derived(((value - min) / (max - min)) * 100);

	function clamp(val: number): number {
		return Math.round(Math.min(max, Math.max(min, val)) / step) * step;
	}

	function getValueFromEvent(e: MouseEvent | TouchEvent) {
		if (!track) return min;
		const rect = track.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		return clamp(min + pct * (max - min));
	}

	function handlePointerDown(e: MouseEvent) {
		e.preventDefault();
		dragging = true;
		value = getValueFromEvent(e);
		window.addEventListener('mousemove', handlePointerMove);
		window.addEventListener('mouseup', handlePointerUp);
	}

	function handlePointerMove(e: MouseEvent) {
		if (!dragging) return;
		value = getValueFromEvent(e);
	}

	function handlePointerUp() {
		dragging = false;
		window.removeEventListener('mousemove', handlePointerMove);
		window.removeEventListener('mouseup', handlePointerUp);
	}
</script>

<div class="space-y-2">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={track}
		class="relative h-8 flex items-center cursor-pointer"
		onmousedown={handlePointerDown}
	>
		<!-- Background track -->
		<div class="absolute w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full"></div>

		<!-- Active fill -->
		<div
			class="absolute h-1.5 rounded-full"
			style="width: {percent}%; background-color: {accentColor}"
		></div>

		<!-- Handle -->
		<div
			class="absolute w-5 h-5 rounded-full shadow-md border-2 border-[var(--bg-secondary)] cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
			style="left: {percent}%; transform: translateX(-50%); background-color: {accentColor}"
		></div>
	</div>

	<!-- Scale -->
	<div class="flex justify-between text-xs text-[var(--text-muted)]">
		<span>{min}{unit}</span>
		<span>{max}{unit}</span>
	</div>
</div>
