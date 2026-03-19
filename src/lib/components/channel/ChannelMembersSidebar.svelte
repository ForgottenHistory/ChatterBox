<script lang="ts">
	import type { Character, User } from '$lib/server/db/schema';
	type UserWithoutPassword = Omit<User, 'passwordHash'>;

	interface Props {
		characters: Character[];
		user: UserWithoutPassword;
		avatarStyle?: 'circle' | 'rounded';
		engagedIds?: Set<number>;
		onShowMemories?: (characterId: number, characterName: string) => void;
	}

	let { characters, user, avatarStyle = 'circle', engagedIds = new Set(), onShowMemories }: Props = $props();

	let avatarClass = $derived(avatarStyle === 'rounded' ? 'rounded-lg' : 'rounded-full');
	let memberAvatarSize = $derived(avatarStyle === 'rounded' ? 'w-7 h-9' : 'w-8 h-8');

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

	const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

	interface CharacterStatus {
		character: Character;
		status: 'online' | 'away' | 'busy' | 'offline';
		activity: string;
	}

	function getCharacterStatus(character: Character): CharacterStatus {
		if (!character.scheduleData) {
			return { character, status: 'online', activity: '' };
		}

		try {
			const parsed = JSON.parse(character.scheduleData);
			const schedule = parsed.schedule || parsed;
			const now = new Date();
			const day = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
			const blocks = schedule[day];

			if (!blocks || blocks.length === 0) {
				return { character, status: 'online', activity: '' };
			}

			const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
			for (const block of blocks) {
				if (timeStr >= block.start && timeStr < block.end) {
					return { character, status: block.status, activity: block.activity || '' };
				}
			}
		} catch {}

		return { character, status: 'online', activity: '' };
	}

	let characterStatuses = $derived(characters.map(getCharacterStatus));

	let onlineMembers = $derived(characterStatuses.filter(c => c.status === 'online'));
	let awayMembers = $derived(characterStatuses.filter(c => c.status === 'away'));
	let busyMembers = $derived(characterStatuses.filter(c => c.status === 'busy'));
	let offlineMembers = $derived(characterStatuses.filter(c => c.status === 'offline'));

	// Popover state
	let selectedMember = $state<CharacterStatus | null>(null);
	let popoverX = $state(0);
	let popoverY = $state(0);

	function openPopover(member: CharacterStatus, event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		// Position to the left of the clicked row
		popoverX = rect.left - 288; // 272px card + 16px gap
		popoverY = Math.max(8, Math.min(rect.top - 40, window.innerHeight - 350));
		selectedMember = selectedMember?.character.id === member.character.id ? null : member;
	}

	function closePopover() {
		selectedMember = null;
	}

	// Get upcoming schedule blocks for a character
	function getUpcoming(character: Character, count: number = 1): { start: string; end: string; status: string; activity: string }[] {
		if (!character.scheduleData) return [];
		try {
			const parsed = JSON.parse(character.scheduleData);
			const schedule = parsed.schedule || parsed;
			const now = new Date();
			const day = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
			const blocks = schedule[day];
			if (!blocks) return [];

			const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
			const currentIdx = blocks.findIndex((b: any) => timeStr >= b.start && timeStr < b.end);
			if (currentIdx === -1) return [];

			return blocks.slice(currentIdx + 1, currentIdx + 1 + count);
		} catch {}
		return [];
	}
</script>

<svelte:window onclick={(e) => {
	if (selectedMember && !(e.target as HTMLElement)?.closest('.member-popover, .member-row')) {
		closePopover();
	}
}} />

<div class="w-60 flex-shrink-0 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] overflow-y-auto relative sidebar-members">
	<div class="p-3">
		<!-- Online Section (user + online characters) -->
		<h3 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2">
			Online — {onlineMembers.length + 1}
		</h3>

		<!-- User (always online) -->
		<div class="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]/50 transition-colors">
			<div class="relative flex-shrink-0">
				{#if user.avatarThumbnail || user.avatarData}
					<img
						src={user.avatarThumbnail || user.avatarData}
						alt={user.displayName}
						class="{memberAvatarSize} {avatarClass} object-cover"
					/>
				{:else}
					<div class="{memberAvatarSize} {avatarClass} bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold text-xs">
						{user.displayName.charAt(0).toUpperCase()}
					</div>
				{/if}
				<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--bg-secondary)]"></div>
			</div>
			<span class="text-sm font-medium text-[var(--text-primary)] truncate">{user.displayName}</span>
		</div>

		{#each onlineMembers as { character, activity }}
			{@render memberRow(character, 'online', activity, false)}
		{/each}

		<!-- Away Section -->
		{#if awayMembers.length > 0}
			<h3 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2 mt-4">
				Away — {awayMembers.length}
			</h3>
			{#each awayMembers as { character, activity }}
				{@render memberRow(character, 'away', activity, false)}
			{/each}
		{/if}

		<!-- Busy Section -->
		{#if busyMembers.length > 0}
			<h3 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2 mt-4">
				Busy — {busyMembers.length}
			</h3>
			{#each busyMembers as { character, activity }}
				{@render memberRow(character, 'busy', activity, false)}
			{/each}
		{/if}

		<!-- Offline Section -->
		{#if offlineMembers.length > 0}
			<h3 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2 mt-4">
				Offline — {offlineMembers.length}
			</h3>
			{#each offlineMembers as { character, activity }}
				{@render memberRow(character, 'offline', activity, true)}
			{/each}
		{/if}
	</div>

	<!-- Member Popover (fixed to escape overflow-hidden) -->
	{#if selectedMember}
		{@const member = selectedMember}
		{@const upcoming = getUpcoming(member.character)}
		<div class="member-popover fixed w-64 rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10 ring-1 ring-white/5 bg-[var(--bg-primary)]" style="left: {popoverX}px; top: {popoverY}px">
			<!-- Banner image -->
			<div class="relative h-28 overflow-hidden">
				{#if member.character.imageData}
					<img
						src={member.character.imageData}
						alt={member.character.name}
						class="w-full h-full object-cover object-[center_25%]"
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] to-transparent"></div>
					<div class="absolute inset-0 backdrop-blur-[1px]" style="-webkit-mask-image: linear-gradient(to right, black, transparent 30%, transparent 70%, black); mask-image: linear-gradient(to right, black, transparent 30%, transparent 70%, black)"></div>
				{:else}
					<div class="w-full h-full bg-gradient-to-br from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/30"></div>
				{/if}
			</div>

			<!-- Content -->
			<div class="px-4 pb-4 -mt-4 relative">
				<div class="flex items-center gap-2 mb-2">
					<div class="w-2.5 h-2.5 rounded-full {STATUS_COLORS[member.status]} flex-shrink-0"></div>
					<h4 class="text-sm font-bold text-[var(--text-primary)]">{member.character.name}</h4>
				</div>

				{#if member.activity}
					<p class="text-sm text-[var(--text-secondary)]">{member.activity}</p>
				{:else}
					<p class="text-sm text-[var(--text-muted)] italic">No activity</p>
				{/if}

				{#if upcoming.length > 0}
					<div class="mt-3 pt-3 border-t border-[var(--border-primary)]">
						<h5 class="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">Coming Up</h5>
						<div class="space-y-1.5">
							{#each upcoming as block}
								<div class="flex gap-2 text-xs">
									<div class="w-1.5 h-1.5 rounded-full {STATUS_COLORS[block.status]} flex-shrink-0 mt-1"></div>
									<div>
										<span class="text-[var(--text-muted)] font-mono">{block.start}–{block.end}</span>
										<p class="text-[var(--text-secondary)]">{block.activity}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Memories button -->
				{#if onShowMemories}
					<div class="mt-3 pt-3 border-t border-[var(--border-primary)]">
						<button
							onclick={(e: MouseEvent) => { e.stopPropagation(); onShowMemories(member.character.id, member.character.name); closePopover(); }}
							class="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition cursor-pointer"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
							</svg>
							View Memories
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#snippet memberRow(character: Character, status: string, activity: string, dimmed: boolean)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="member-row flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer {dimmed ? 'opacity-50' : ''} {selectedMember?.character.id === character.id ? 'bg-[var(--bg-tertiary)]/50' : ''} {engagedIds.has(character.id) ? 'ring-1 ring-[var(--accent-primary)]/50' : ''}"
		title={activity || status}
		onclick={(e) => openPopover(getCharacterStatus(character), e)}
	>
		<div class="relative flex-shrink-0">
			{#if character.thumbnailData || character.imageData}
				<img
					src={character.thumbnailData || character.imageData}
					alt={character.name}
					class="{memberAvatarSize} {avatarClass} object-cover {dimmed ? 'grayscale' : ''}"
				/>
			{:else}
				<div class="{memberAvatarSize} {avatarClass} {dimmed ? 'bg-[var(--bg-tertiary)]' : 'bg-[var(--accent-secondary)]'} flex items-center justify-center {dimmed ? 'text-[var(--text-muted)]' : 'text-white'} font-bold text-xs">
					{character.name.charAt(0).toUpperCase()}
				</div>
			{/if}
			<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 {STATUS_COLORS[status]} rounded-full border-2 border-[var(--bg-secondary)]"></div>
		</div>
		<div class="flex-1 min-w-0">
			<span class="text-sm font-medium {dimmed ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'} truncate block">{character.name}</span>
			{#if activity}
				<span class="text-xs text-[var(--text-muted)] truncate block">{activity}</span>
			{/if}
		</div>
	</div>
{/snippet}
