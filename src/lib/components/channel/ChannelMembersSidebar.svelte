<script lang="ts">
	import type { Character, User } from '$lib/server/db/schema';

	interface Props {
		characters: Character[];
		user: User;
	}

	let { characters, user }: Props = $props();

	// For now all characters are online
	let onlineCharacters = $derived(characters);
	let offlineCharacters = $derived<Character[]>([]);
</script>

<div class="w-60 flex-shrink-0 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] overflow-y-auto">
	<div class="p-3">
		<!-- Online Section -->
		<h3 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2">
			Online — {onlineCharacters.length + 1}
		</h3>

		<!-- User (always online, always first) -->
		<div class="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]/50 transition-colors">
			<div class="relative flex-shrink-0">
				{#if user.avatarThumbnail || user.avatarData}
					<img
						src={user.avatarThumbnail || user.avatarData}
						alt={user.displayName}
						class="w-8 h-8 rounded-full object-cover"
					/>
				{:else}
					<div class="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold text-xs">
						{user.displayName.charAt(0).toUpperCase()}
					</div>
				{/if}
				<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--bg-secondary)]"></div>
			</div>
			<span class="text-sm font-medium text-[var(--text-primary)] truncate">{user.displayName}</span>
		</div>

		<!-- Online Characters -->
		{#each onlineCharacters as character}
			<div class="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]/50 transition-colors">
				<div class="relative flex-shrink-0">
					{#if character.thumbnailData || character.imageData}
						<img
							src={character.thumbnailData || character.imageData}
							alt={character.name}
							class="w-8 h-8 rounded-full object-cover"
						/>
					{:else}
						<div class="w-8 h-8 rounded-full bg-[var(--accent-secondary)] flex items-center justify-center text-white font-bold text-xs">
							{character.name.charAt(0).toUpperCase()}
						</div>
					{/if}
					<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--bg-secondary)]"></div>
				</div>
				<span class="text-sm font-medium text-[var(--text-secondary)] truncate">{character.name}</span>
			</div>
		{/each}

		<!-- Offline Section -->
		{#if offlineCharacters.length > 0}
			<h3 class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2 mt-4">
				Offline — {offlineCharacters.length}
			</h3>

			{#each offlineCharacters as character}
				<div class="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]/50 transition-colors opacity-50">
					<div class="relative flex-shrink-0">
						{#if character.thumbnailData || character.imageData}
							<img
								src={character.thumbnailData || character.imageData}
								alt={character.name}
								class="w-8 h-8 rounded-full object-cover grayscale"
							/>
						{:else}
							<div class="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] font-bold text-xs">
								{character.name.charAt(0).toUpperCase()}
							</div>
						{/if}
						<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--text-muted)] rounded-full border-2 border-[var(--bg-secondary)]"></div>
					</div>
					<span class="text-sm font-medium text-[var(--text-muted)] truncate">{character.name}</span>
				</div>
			{/each}
		{/if}
	</div>
</div>
