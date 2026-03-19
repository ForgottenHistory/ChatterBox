<script lang="ts">
	import type { PageData } from './$types';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import RangeSlider from '$lib/components/ui/RangeSlider.svelte';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let loading = $state(true);

	let channelFrequencyMin = $state(5);
	let channelFrequencyMax = $state(30);
	let useNamePrimer = $state(true);

	$effect(() => {
		loadSettings();
	});

	async function loadSettings() {
		try {
			const res = await fetch('/api/behaviour-settings');
			if (res.ok) {
				const data = await res.json();
				channelFrequencyMin = data.channelFrequencyMin ?? 5;
				useNamePrimer = data.useNamePrimer ?? true;
				channelFrequencyMax = data.channelFrequencyMax ?? 30;
			}
		} catch (err) {
			console.error('Failed to load settings:', err);
		} finally {
			loading = false;
		}
	}

	async function saveSettings() {
		saving = true;
		message = null;

		try {
			const res = await fetch('/api/behaviour-settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ channelFrequencyMin, channelFrequencyMax, useNamePrimer })
			});

			if (res.ok) {
				const result = await res.json();
				channelFrequencyMin = result.channelFrequencyMin;
				channelFrequencyMax = result.channelFrequencyMax;
				message = { type: 'success', text: 'Settings saved successfully!' };
			} else {
				const err = await res.json();
				message = { type: 'error', text: err.error || 'Failed to save settings' };
			}
		} catch {
			message = { type: 'error', text: 'Failed to save settings' };
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Behaviour Settings | ChatterBox</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/behaviour-settings">
	<div class="h-full overflow-y-auto">
		<div class="max-w-5xl mx-auto px-8 py-8">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-[var(--text-primary)]">Behaviour Settings</h1>
				<p class="text-[var(--text-secondary)] mt-2">Configure how characters behave in channels</p>
			</div>

			<!-- Messages -->
			{#if message}
				<div
					class="mb-6 p-4 rounded-xl {message.type === 'success'
						? 'bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)]'
						: 'bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)]'}"
				>
					{message.text}
				</div>
			{/if}

			<!-- Settings Content -->
			<div class="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] p-6">
				{#if loading}
					<div class="text-center py-12 text-[var(--text-muted)]">
						<div class="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p>Loading settings...</p>
					</div>
				{:else}
					<div class="space-y-8">
						<!-- Channel Chat Frequency -->
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Channel Chat Frequency</h2>
							<p class="text-sm text-[var(--text-muted)] mb-6">
								How often characters respond in text channels. A random delay between the min and max is chosen each time a character replies.
							</p>

							<div class="space-y-6">
								<RangeSlider
									min={1}
									max={120}
									step={1}
									bind:valueLow={channelFrequencyMin}
									bind:valueHigh={channelFrequencyMax}
									unit="s"
								/>

								<!-- Preview -->
								<div class="p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)]">
									<p class="text-sm text-[var(--text-secondary)]">
										Characters will wait between
										<span class="font-semibold text-[var(--accent-primary)]">{channelFrequencyMin}</span>
										and
										<span class="font-semibold text-[var(--accent-primary)]">{channelFrequencyMax}</span>
										seconds before responding in a channel.
									</p>
								</div>
							</div>
						</div>

						<!-- Name Primer -->
						<div>
							<div class="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-xl">
								<div>
									<h2 class="text-sm font-medium text-[var(--text-primary)]">Roleplay Name Primer</h2>
									<p class="text-xs text-[var(--text-muted)] mt-1">
										Append "CharacterName: " to the end of the prompt to guide the model into responding as the correct character
									</p>
								</div>
								<label class="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										bind:checked={useNamePrimer}
										class="sr-only peer"
									/>
									<div class="w-11 h-6 bg-[var(--border-secondary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
								</label>
							</div>
						</div>

						<!-- Save Button -->
						<div class="pt-4 border-t border-[var(--border-primary)]">
							<button
								onclick={saveSettings}
								disabled={saving}
								class="px-6 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if saving}
									<span class="flex items-center gap-2">
										<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										Saving...
									</span>
								{:else}
									Save Changes
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</MainLayout>
