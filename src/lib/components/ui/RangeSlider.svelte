<script lang="ts">
	interface Props {
		min?: number;
		max?: number;
		step?: number;
		valueLow: number;
		valueHigh: number;
		unit?: string;
	}

	let { min = 0, max = 100, step = 1, valueLow = $bindable(), valueHigh = $bindable(), unit = '' }: Props = $props();

	let track = $state<HTMLDivElement | undefined>();
	let dragging = $state<'low' | 'high' | null>(null);

	let lowPercent = $derived(((valueLow - min) / (max - min)) * 100);
	let highPercent = $derived(((valueHigh - min) / (max - min)) * 100);

	function clamp(val: number): number {
		return Math.round(Math.min(max, Math.max(min, val)) / step) * step;
	}

	function getValueFromEvent(e: MouseEvent | TouchEvent) {
		if (!track) return min;
		const rect = track.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		return clamp(min + percent * (max - min));
	}

	function handlePointerDown(handle: 'low' | 'high') {
		return (e: MouseEvent) => {
			e.preventDefault();
			dragging = handle;
			window.addEventListener('mousemove', handlePointerMove);
			window.addEventListener('mouseup', handlePointerUp);
		};
	}

	function handlePointerMove(e: MouseEvent) {
		if (!dragging) return;
		const val = getValueFromEvent(e);
		if (dragging === 'low') {
			valueLow = Math.min(val, valueHigh);
		} else {
			valueHigh = Math.max(val, valueLow);
		}
	}

	function handlePointerUp() {
		dragging = null;
		window.removeEventListener('mousemove', handlePointerMove);
		window.removeEventListener('mouseup', handlePointerUp);
	}

	function handleTrackClick(e: MouseEvent) {
		const val = getValueFromEvent(e);
		// Move whichever handle is closer
		const distLow = Math.abs(val - valueLow);
		const distHigh = Math.abs(val - valueHigh);
		if (distLow <= distHigh) {
			valueLow = Math.min(val, valueHigh);
		} else {
			valueHigh = Math.max(val, valueLow);
		}
	}
</script>

<div class="space-y-2">
	<!-- Labels -->
	<div class="flex items-center justify-between">
		<span class="text-sm font-mono text-[var(--accent-primary)]">{valueLow}{unit}</span>
		<span class="text-sm font-medium text-[var(--text-muted)]">to</span>
		<span class="text-sm font-mono text-[var(--accent-primary)]">{valueHigh}{unit}</span>
	</div>

	<!-- Track -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={track}
		class="relative h-8 flex items-center cursor-pointer"
		onclick={handleTrackClick}
	>
		<!-- Background track -->
		<div class="absolute w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full"></div>

		<!-- Active range fill -->
		<div
			class="absolute h-1.5 bg-[var(--accent-primary)] rounded-full"
			style="left: {lowPercent}%; width: {highPercent - lowPercent}%"
		></div>

		<!-- Low handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute w-5 h-5 bg-[var(--accent-primary)] rounded-full shadow-md border-2 border-[var(--bg-secondary)] cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
			style="left: {lowPercent}%; transform: translateX(-50%)"
			onmousedown={handlePointerDown('low')}
		></div>

		<!-- High handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute w-5 h-5 bg-[var(--accent-primary)] rounded-full shadow-md border-2 border-[var(--bg-secondary)] cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
			style="left: {highPercent}%; transform: translateX(-50%)"
			onmousedown={handlePointerDown('high')}
		></div>
	</div>

	<!-- Scale -->
	<div class="flex justify-between text-xs text-[var(--text-muted)]">
		<span>{min}{unit}</span>
		<span>{max}{unit}</span>
	</div>
</div>
