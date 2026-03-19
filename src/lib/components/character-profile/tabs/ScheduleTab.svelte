<script lang="ts">
	import type { Character } from '$lib/server/db/schema';

	interface Props {
		character: Character;
		onUpdate?: () => void;
	}

	interface TimeBlock {
		start: string;
		end: string;
		status: 'online' | 'away' | 'busy' | 'offline';
		activity: string;
	}

	interface WeekSchedule {
		[day: string]: TimeBlock[];
	}

	let { character, onUpdate }: Props = $props();

	const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	const DAY_LABELS: Record<string, string> = {
		monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
		friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
	};

	const STATUS_COLORS: Record<string, string> = {
		online: 'bg-[var(--success)]',
		away: 'bg-[var(--warning)]',
		busy: 'bg-[var(--error)]',
		offline: 'bg-[var(--text-muted)]'
	};

	const STATUS_TEXT_COLORS: Record<string, string> = {
		online: 'text-[var(--success)]',
		away: 'text-[var(--warning)]',
		busy: 'text-[var(--error)]',
		offline: 'text-[var(--text-muted)]'
	};

	let schedule = $state<WeekSchedule>({});
	let selectedDay = $state('monday');
	let generating = $state(false);
	let generatingDay = $state<string | null>(null);
	let saving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Editing state
	let editingBlock = $state<{ day: string; index: number } | null>(null);
	let editStart = $state('');
	let editEnd = $state('');
	let editStatus = $state<'online' | 'away' | 'busy' | 'offline'>('online');
	let editActivity = $state('');

	// Parse schedule from character data
	$effect(() => {
		if (character?.scheduleData) {
			try {
				const parsed = JSON.parse(character.scheduleData);
				schedule = parsed.schedule || parsed || {};
			} catch {
				schedule = {};
			}
		} else {
			schedule = {};
		}
	});

	let hasSchedule = $derived(Object.keys(schedule).length > 0);
	let currentDayBlocks = $derived(schedule[selectedDay] || []);

	// Get current real day
	let today = $derived(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

	function getCurrentStatus(): { status: string; activity: string } | null {
		const now = new Date();
		const day = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
		const blocks = schedule[day];
		if (!blocks) return null;

		const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
		for (const block of blocks) {
			if (timeStr >= block.start && timeStr < block.end) {
				return { status: block.status, activity: block.activity };
			}
		}
		return null;
	}

	let currentStatus = $derived(getCurrentStatus());

	async function generateFullSchedule() {
		if (generating) return;
		generating = true;
		message = null;

		try {
			const response = await fetch(`/api/characters/${character.id}/schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: 'full' })
			});

			if (response.ok) {
				const result = await response.json();
				schedule = result.schedule || {};
				message = { type: 'success', text: 'Schedule generated!' };
				if (onUpdate) onUpdate();
			} else {
				const err = await response.json();
				message = { type: 'error', text: err.error || 'Failed to generate schedule' };
			}
		} catch {
			message = { type: 'error', text: 'Failed to generate schedule' };
		} finally {
			generating = false;
		}
	}

	async function generateDay(day: string) {
		if (generatingDay) return;
		generatingDay = day;
		message = null;

		try {
			const response = await fetch(`/api/characters/${character.id}/schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mode: 'day', day })
			});

			if (response.ok) {
				const result = await response.json();
				schedule = { ...schedule, [day]: result.daySchedule };
				message = { type: 'success', text: `${day.charAt(0).toUpperCase() + day.slice(1)} regenerated!` };
				if (onUpdate) onUpdate();
			} else {
				const err = await response.json();
				message = { type: 'error', text: err.error || 'Failed to generate day' };
			}
		} catch {
			message = { type: 'error', text: 'Failed to generate day' };
		} finally {
			generatingDay = null;
		}
	}

	function startEdit(day: string, index: number) {
		const block = schedule[day][index];
		editingBlock = { day, index };
		editStart = block.start;
		editEnd = block.end;
		editStatus = block.status;
		editActivity = block.activity;
	}

	function cancelEdit() {
		editingBlock = null;
	}

	async function saveEdit() {
		if (!editingBlock) return;
		saving = true;

		const { day, index } = editingBlock;
		const updatedBlocks = [...(schedule[day] || [])];
		updatedBlocks[index] = {
			start: editStart,
			end: editEnd,
			status: editStatus,
			activity: editActivity
		};

		const updatedSchedule = { ...schedule, [day]: updatedBlocks };

		try {
			const response = await fetch(`/api/characters/${character.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduleData: JSON.stringify({ schedule: updatedSchedule }) })
			});

			if (response.ok) {
				schedule = updatedSchedule;
				editingBlock = null;
				if (onUpdate) onUpdate();
			}
		} catch {
			message = { type: 'error', text: 'Failed to save edit' };
		} finally {
			saving = false;
		}
	}

	async function deleteBlock(day: string, index: number) {
		const updatedBlocks = (schedule[day] || []).filter((_, i) => i !== index);
		const updatedSchedule = { ...schedule, [day]: updatedBlocks };

		try {
			await fetch(`/api/characters/${character.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduleData: JSON.stringify({ schedule: updatedSchedule }) })
			});
			schedule = updatedSchedule;
			if (onUpdate) onUpdate();
		} catch {
			message = { type: 'error', text: 'Failed to delete block' };
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-xl font-semibold text-[var(--text-primary)]">Schedule</h3>
		<button
			onclick={generateFullSchedule}
			disabled={generating || !!generatingDay}
			class="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
		>
			{#if generating}
				<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				Generating...
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
				</svg>
				Generate Week
			{/if}
		</button>
	</div>

	{#if message}
		<div class="p-3 rounded-lg text-sm {message.type === 'success'
			? 'bg-[var(--success)]/10 text-[var(--success)]'
			: 'bg-[var(--error)]/10 text-[var(--error)]'}">
			{message.text}
		</div>
	{/if}

	<!-- Current Status -->
	{#if currentStatus}
		<div class="flex items-center gap-2 px-4 py-3 bg-[var(--bg-tertiary)] rounded-lg">
			<div class="w-2.5 h-2.5 rounded-full {STATUS_COLORS[currentStatus.status]}"></div>
			<span class="text-sm font-medium {STATUS_TEXT_COLORS[currentStatus.status]} capitalize">{currentStatus.status}</span>
			{#if currentStatus.activity}
				<span class="text-sm text-[var(--text-muted)]">— {currentStatus.activity}</span>
			{/if}
		</div>
	{/if}

	{#if !hasSchedule}
		<div class="text-center py-12 px-4">
			<div class="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
				<svg class="w-8 h-8 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			</div>
			<p class="text-[var(--text-secondary)] font-semibold text-sm mb-1">No schedule yet</p>
			<p class="text-[var(--text-muted)] text-xs">Generate a weekly schedule to give this character a daily routine</p>
		</div>
	{:else}
		<!-- Day Tabs -->
		<div class="flex gap-1 bg-[var(--bg-primary)] rounded-lg p-1">
			{#each DAYS as day}
				<button
					onclick={() => selectedDay = day}
					class="flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer {selectedDay === day
						? 'bg-[var(--accent-primary)] text-white shadow-md'
						: day === today
							? 'text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]'
							: 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}"
				>
					{DAY_LABELS[day]}
				</button>
			{/each}
		</div>

		<!-- Day Header -->
		<div class="flex items-center justify-between">
			<h4 class="text-sm font-semibold text-[var(--text-primary)] capitalize">{selectedDay}</h4>
			<button
				onclick={() => generateDay(selectedDay)}
				disabled={generating || !!generatingDay}
				class="px-3 py-1 text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
			>
				{#if generatingDay === selectedDay}
					<div class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
				{:else}
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
					</svg>
				{/if}
				Regenerate Day
			</button>
		</div>

		<!-- Time Blocks -->
		{#if currentDayBlocks.length === 0}
			<p class="text-sm text-[var(--text-muted)] italic py-4 text-center">No blocks for this day</p>
		{:else}
			<div class="space-y-1">
				{#each currentDayBlocks as block, i}
					{#if editingBlock?.day === selectedDay && editingBlock?.index === i}
						<!-- Edit Mode -->
						<div class="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--accent-primary)] space-y-2">
							<div class="flex gap-2">
								<input type="text" bind:value={editStart} placeholder="HH:MM" class="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none" />
								<span class="text-[var(--text-muted)] self-center">—</span>
								<input type="text" bind:value={editEnd} placeholder="HH:MM" class="w-20 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none" />
								<select bind:value={editStatus} class="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none">
									<option value="online">Online</option>
									<option value="away">Away</option>
									<option value="busy">Busy</option>
									<option value="offline">Offline</option>
								</select>
							</div>
							<input type="text" bind:value={editActivity} placeholder="Activity..." class="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded text-sm text-[var(--text-primary)] focus:outline-none" />
							<div class="flex gap-2 text-xs">
								<button onclick={saveEdit} disabled={saving} class="text-[var(--accent-primary)] hover:underline cursor-pointer">save</button>
								<button onclick={cancelEdit} class="text-[var(--text-muted)] hover:underline cursor-pointer">cancel</button>
							</div>
						</div>
					{:else}
						<!-- Display Mode -->
						<div class="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)]/50 group transition-colors">
							<!-- Status dot -->
							<div class="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 {STATUS_COLORS[block.status]}"></div>

							<!-- Time -->
							<span class="text-xs font-mono text-[var(--text-muted)] w-24 flex-shrink-0 mt-0.5">{block.start}–{block.end}</span>

							<!-- Activity -->
							<span class="text-sm text-[var(--text-primary)] flex-1">{block.activity || block.status}</span>

							<!-- Actions -->
							<div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
								<button onclick={() => startEdit(selectedDay, i)} class="p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition cursor-pointer" title="Edit">
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
								</button>
								<button onclick={() => deleteBlock(selectedDay, i)} class="p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition cursor-pointer" title="Delete">
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
								</button>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
</div>
