<script lang="ts">
	import type { PageData } from './$types';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import RangeSlider from '$lib/components/ui/RangeSlider.svelte';
	import Slider from '$lib/components/ui/Slider.svelte';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let loading = $state(true);

	let channelFrequencyMin = $state(5);
	let channelFrequencyMax = $state(30);
	let useNamePrimer = $state(true);
	let compactHistory = $state(true);

	// Engagement settings
	let engageRollMin = $state(1);
	let engageRollMax = $state(3);
	let doubleTextChanceMin = $state(10);
	let doubleTextChanceMax = $state(30);
	let engageChanceOnline = $state(80);
	let engageChanceAway = $state(30);
	let engageChanceBusy = $state(10);
	let joinChancePerMessage = $state(1);
	let engageCooldown = $state(5);
	let engageDurationOnline = $state(5);
	let engageDurationAway = $state(2);
	let engageDurationBusy = $state(1);

	$effect(() => {
		loadSettings();
	});

	async function loadSettings() {
		try {
			const res = await fetch('/api/behaviour-settings');
			if (res.ok) {
				const d = await res.json();
				channelFrequencyMin = d.channelFrequencyMin ?? 5;
				channelFrequencyMax = d.channelFrequencyMax ?? 30;
				useNamePrimer = d.useNamePrimer ?? true;
				compactHistory = d.compactHistory ?? true;
				engageRollMin = d.engageRollMin ?? 1;
				engageRollMax = d.engageRollMax ?? 3;
				joinChancePerMessage = d.joinChancePerMessage ?? 1;
				engageCooldown = d.engageCooldown ?? 5;
				doubleTextChanceMin = d.doubleTextChanceMin ?? 10;
				doubleTextChanceMax = d.doubleTextChanceMax ?? 30;
				engageChanceOnline = d.engageChanceOnline ?? 80;
				engageChanceAway = d.engageChanceAway ?? 30;
				engageChanceBusy = d.engageChanceBusy ?? 10;
				engageDurationOnline = d.engageDurationOnline ?? 5;
				engageDurationAway = d.engageDurationAway ?? 2;
				engageDurationBusy = d.engageDurationBusy ?? 1;
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
				body: JSON.stringify({
					channelFrequencyMin, channelFrequencyMax, useNamePrimer, compactHistory,
					engageRollMin, engageRollMax,
					joinChancePerMessage, engageCooldown,
					doubleTextChanceMin, doubleTextChanceMax,
					engageChanceOnline, engageChanceAway, engageChanceBusy,
					engageDurationOnline, engageDurationAway, engageDurationBusy
				})
			});

			if (res.ok) {
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
								Delay between character messages when multiple characters are engaged in conversation.
							</p>
							<RangeSlider
								min={1}
								max={120}
								step={1}
								bind:valueLow={channelFrequencyMin}
								bind:valueHigh={channelFrequencyMax}
								unit="s"
							/>
						</div>

						<!-- Double Text Chance -->
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Double Text Chance</h2>
							<p class="text-sm text-[var(--text-muted)] mb-6">
								Probability that the same character sends another message in a row instead of passing to someone else. A random value in this range is rolled each time.
							</p>
							<RangeSlider
								min={0}
								max={100}
								step={5}
								bind:valueLow={doubleTextChanceMin}
								bind:valueHigh={doubleTextChanceMax}
								unit="%"
							/>
						</div>

						<!-- Engagement Roll Interval -->
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Engagement Roll Interval</h2>
							<p class="text-sm text-[var(--text-muted)] mb-6">
								How often the system checks if new characters should join the conversation. A random interval between min and max is chosen each time.
							</p>
							<RangeSlider
								min={1}
								max={15}
								step={1}
								bind:valueLow={engageRollMin}
								bind:valueHigh={engageRollMax}
								unit=" min"
							/>
						</div>

						<!-- Engagement Chance -->
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Engagement Chance</h2>
							<p class="text-sm text-[var(--text-muted)] mb-6">
								Probability a character joins the conversation when you send a message, based on their schedule status.
							</p>

							<div class="space-y-5">
								<div>
									<div class="flex items-center gap-2 mb-1">
										<div class="w-2.5 h-2.5 rounded-full bg-[var(--success)]"></div>
										<span class="text-sm font-medium text-[var(--text-secondary)]">Online</span>
										<span class="text-sm font-mono text-[var(--accent-primary)] ml-auto">{engageChanceOnline}%</span>
									</div>
									<Slider bind:value={engageChanceOnline} min={0} max={100} step={5} unit="%" accentColor="var(--success)" />
								</div>
								<div>
									<div class="flex items-center gap-2 mb-1">
										<div class="w-2.5 h-2.5 rounded-full bg-[var(--warning)]"></div>
										<span class="text-sm font-medium text-[var(--text-secondary)]">Away</span>
										<span class="text-sm font-mono text-[var(--accent-primary)] ml-auto">{engageChanceAway}%</span>
									</div>
									<Slider bind:value={engageChanceAway} min={0} max={100} step={5} unit="%" accentColor="var(--warning)" />
								</div>
								<div>
									<div class="flex items-center gap-2 mb-1">
										<div class="w-2.5 h-2.5 rounded-full bg-[var(--error)]"></div>
										<span class="text-sm font-medium text-[var(--text-secondary)]">Busy</span>
										<span class="text-sm font-mono text-[var(--accent-primary)] ml-auto">{engageChanceBusy}%</span>
									</div>
									<Slider bind:value={engageChanceBusy} min={0} max={100} step={5} unit="%" accentColor="var(--error)" />
								</div>
							</div>
						</div>

						<!-- Engagement Duration -->
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Engagement Duration</h2>
							<p class="text-sm text-[var(--text-muted)] mb-6">
								How long a character stays active in the conversation before disengaging, based on their schedule status.
							</p>

							<div class="space-y-5">
								<div>
									<div class="flex items-center gap-2 mb-1">
										<div class="w-2.5 h-2.5 rounded-full bg-[var(--success)]"></div>
										<span class="text-sm font-medium text-[var(--text-secondary)]">Online</span>
										<span class="text-sm font-mono text-[var(--accent-primary)] ml-auto">{engageDurationOnline} min</span>
									</div>
									<Slider bind:value={engageDurationOnline} min={1} max={30} step={1} unit=" min" accentColor="var(--success)" />
								</div>
								<div>
									<div class="flex items-center gap-2 mb-1">
										<div class="w-2.5 h-2.5 rounded-full bg-[var(--warning)]"></div>
										<span class="text-sm font-medium text-[var(--text-secondary)]">Away</span>
										<span class="text-sm font-mono text-[var(--accent-primary)] ml-auto">{engageDurationAway} min</span>
									</div>
									<Slider bind:value={engageDurationAway} min={1} max={30} step={1} unit=" min" accentColor="var(--warning)" />
								</div>
								<div>
									<div class="flex items-center gap-2 mb-1">
										<div class="w-2.5 h-2.5 rounded-full bg-[var(--error)]"></div>
										<span class="text-sm font-medium text-[var(--text-secondary)]">Busy</span>
										<span class="text-sm font-mono text-[var(--accent-primary)] ml-auto">{engageDurationBusy} min</span>
									</div>
									<Slider bind:value={engageDurationBusy} min={1} max={30} step={1} unit=" min" accentColor="var(--error)" />
								</div>
							</div>
						</div>

						<!-- Join Chance Per Message -->
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Join Chance Per Message</h2>
							<p class="text-sm text-[var(--text-muted)] mb-6">
								When characters are already chatting, chance that another character randomly joins each time you send a message.
							</p>
							<div class="flex items-center gap-2 mb-1">
								<span class="text-sm font-mono text-[var(--accent-primary)]">{joinChancePerMessage}%</span>
							</div>
							<Slider bind:value={joinChancePerMessage} min={0} max={25} step={1} unit="%" />
						</div>

						<!-- Engagement Cooldown -->
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Engagement Cooldown</h2>
							<p class="text-sm text-[var(--text-muted)] mb-6">
								After a character disengages, how long before they can be engaged again.
							</p>
							<div class="flex items-center gap-2 mb-1">
								<span class="text-sm font-mono text-[var(--accent-primary)]">{engageCooldown} min</span>
							</div>
							<Slider bind:value={engageCooldown} min={0} max={30} step={1} unit=" min" />
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

						<!-- Compact History -->
						<div>
							<div class="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-xl">
								<div>
									<h2 class="text-sm font-medium text-[var(--text-primary)]">Compact Conversation History</h2>
									<p class="text-xs text-[var(--text-muted)] mt-1">
										Group consecutive messages from the same sender to reduce token usage in prompts
									</p>
								</div>
								<label class="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										bind:checked={compactHistory}
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
