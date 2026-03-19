<script lang="ts">
	import ModelSelector from '$lib/components/ModelSelector.svelte';

	interface LLMSettings {
		provider: string;
		model: string;
		modelPool?: string | null;
		temperature: number;
		maxTokens: number;
		topP: number;
		frequencyPenalty: number;
		presencePenalty: number;
		contextWindow: number;
		reasoningEnabled?: boolean;
		topK?: number;
		minP?: number;
		repetitionPenalty?: number;
	}

	let {
		settings = $bindable(),
		saving = false,
		onSave,
		onSavePreset,
		onReload
	}: {
		settings: LLMSettings;
		saving?: boolean;
		onSave: () => void;
		onSavePreset?: () => void;
		onReload: () => void;
	} = $props();

	// Model pool state
	let poolModels = $state<string[]>([]);
	let poolEnabled = $state(false);

	// Sync pool state from settings
	$effect(() => {
		if (settings.modelPool) {
			try {
				const parsed = JSON.parse(settings.modelPool);
				if (Array.isArray(parsed) && parsed.length > 0) {
					poolModels = parsed;
					poolEnabled = true;
					return;
				}
			} catch {}
		}
		poolModels = [];
		poolEnabled = false;
	});

	function addToPool() {
		if (settings.model && !poolModels.includes(settings.model)) {
			poolModels = [...poolModels, settings.model];
			syncPoolToSettings();
		}
	}

	function removeFromPool(modelId: string) {
		poolModels = poolModels.filter(m => m !== modelId);
		syncPoolToSettings();
	}

	function syncPoolToSettings() {
		settings.modelPool = poolModels.length > 0 ? JSON.stringify(poolModels) : null;
	}

	function togglePool() {
		poolEnabled = !poolEnabled;
		if (!poolEnabled) {
			poolModels = [];
			settings.modelPool = null;
		}
	}
</script>

<form
	class="p-6 space-y-6"
	onsubmit={(e) => {
		e.preventDefault();
		onSave();
	}}
>
	<!-- Provider Selection -->
	<div>
		<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Provider</label>
		<select
			bind:value={settings.provider}
			class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
		>
			<option value="openrouter">OpenRouter</option>
			<option value="featherless">Featherless</option>
			<option value="nanogpt">NanoGPT</option>
		</select>
	</div>

	<!-- Model Selection -->
	<div>
		<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Model</label>
		<ModelSelector
			selectedModel={settings.model}
			provider={settings.provider}
			onSelect={(modelId) => (settings.model = modelId)}
		/>
	</div>

	<!-- Model Rotation Pool -->
	<div class="border border-[var(--border-primary)] rounded-xl p-4 space-y-3">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-medium text-[var(--text-primary)]">Model Rotation</h3>
				<p class="text-xs text-[var(--text-muted)] mt-0.5">Randomly pick from a pool of models each request</p>
			</div>
			<label class="relative inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					checked={poolEnabled}
					onchange={togglePool}
					class="sr-only peer"
				/>
				<div class="w-11 h-6 bg-[var(--border-secondary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
			</label>
		</div>

		{#if poolEnabled}
			<!-- Add current model to pool button -->
			<button
				type="button"
				onclick={addToPool}
				disabled={!settings.model || poolModels.includes(settings.model)}
				class="w-full px-3 py-2 text-sm border rounded-lg transition cursor-pointer disabled:cursor-not-allowed {!settings.model || poolModels.includes(settings.model)
					? 'bg-[var(--bg-primary)] border-[var(--border-secondary)] text-[var(--text-muted)]'
					: 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20'}"
			>
				+ Add "{settings.model.split('/').pop() || settings.model}" to pool
			</button>

			<!-- Pool list -->
			{#if poolModels.length > 0}
				<div class="space-y-1.5">
					{#each poolModels as modelId}
						<div class="flex items-center justify-between px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg">
							<span class="text-sm text-[var(--text-primary)] truncate flex-1">{modelId}</span>
							<button
								type="button"
								onclick={() => removeFromPool(modelId)}
								class="p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition cursor-pointer flex-shrink-0 ml-2"
								title="Remove from pool"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
				<p class="text-xs text-[var(--text-muted)]">{poolModels.length} model{poolModels.length !== 1 ? 's' : ''} in rotation</p>
			{:else}
				<p class="text-xs text-[var(--text-muted)]">Select models above and add them to the pool</p>
			{/if}
		{/if}
	</div>

	<!-- Temperature -->
	<div>
		<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
			Temperature: {settings.temperature}
		</label>
		<input
			type="range"
			bind:value={settings.temperature}
			min="0"
			max="2"
			step="0.1"
			class="w-full accent-[var(--accent-primary)]"
		/>
		<p class="text-xs text-[var(--text-muted)] mt-1">
			Higher values make output more random, lower values more deterministic
		</p>
	</div>

	<!-- Max Tokens -->
	<div>
		<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Max Tokens</label>
		<input
			type="number"
			bind:value={settings.maxTokens}
			min="50"
			max="50000"
			step="50"
			class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
		/>
		<p class="text-xs text-[var(--text-muted)] mt-1">Maximum length of generated responses</p>
	</div>

	<!-- Context Window -->
	<div>
		<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Context Window</label>
		<input
			type="number"
			bind:value={settings.contextWindow}
			min="1000"
			max="200000"
			step="1000"
			class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
		/>
		<p class="text-xs text-[var(--text-muted)] mt-1">Total tokens available for context</p>
	</div>

	<!-- Reasoning (OpenRouter & NanoGPT) -->
	{#if settings.provider === 'openrouter' || settings.provider === 'nanogpt'}
		<div class="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-xl">
			<div>
				<label class="block text-sm font-medium text-[var(--text-primary)]">Extended Thinking</label>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Enable reasoning for models that support it (OpenRouter)
				</p>
			</div>
			<label class="relative inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					checked={settings.reasoningEnabled ?? false}
					onchange={(e) => settings.reasoningEnabled = e.currentTarget.checked}
					class="sr-only peer"
				/>
				<div class="w-11 h-6 bg-[var(--border-secondary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-primary)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
			</label>
		</div>
	{/if}

	<!-- Extended Sampling Parameters (Featherless & NanoGPT) -->
	{#if settings.provider === 'featherless' || settings.provider === 'nanogpt'}
		<div class="border border-[var(--border-primary)] rounded-xl p-4 space-y-4">
			<h3 class="font-medium text-[var(--text-primary)]">Extended Sampling Parameters</h3>

			<!-- Top K -->
			<div>
				<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Top K: {settings.topK ?? -1}
				</label>
				<input
					type="range"
					bind:value={settings.topK}
					min="-1"
					max="100"
					step="1"
					class="w-full accent-[var(--accent-primary)]"
				/>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Limits tokens to top K most likely (-1 = disabled)
				</p>
			</div>

			<!-- Min P -->
			<div>
				<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Min P: {(settings.minP ?? 0).toFixed(2)}
				</label>
				<input
					type="range"
					bind:value={settings.minP}
					min="0"
					max="1"
					step="0.01"
					class="w-full accent-[var(--accent-primary)]"
				/>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Minimum probability threshold for tokens (0 = disabled)
				</p>
			</div>

			<!-- Repetition Penalty -->
			<div>
				<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Repetition Penalty: {(settings.repetitionPenalty ?? 1.0).toFixed(2)}
				</label>
				<input
					type="range"
					bind:value={settings.repetitionPenalty}
					min="1"
					max="2"
					step="0.05"
					class="w-full accent-[var(--accent-primary)]"
				/>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Penalize repeated tokens (1.0 = no penalty)
				</p>
			</div>
		</div>
	{/if}

	<!-- Advanced Settings -->
	<details class="border border-[var(--border-primary)] rounded-xl">
		<summary
			class="px-4 py-3 cursor-pointer font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl"
		>
			Advanced Settings
		</summary>
		<div class="px-4 py-4 space-y-4 border-t border-[var(--border-primary)]">
			<!-- Top P -->
			<div>
				<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Top P: {settings.topP}
				</label>
				<input
					type="range"
					bind:value={settings.topP}
					min="0"
					max="1"
					step="0.05"
					class="w-full accent-[var(--accent-primary)]"
				/>
				<p class="text-xs text-[var(--text-muted)] mt-1">Nucleus sampling threshold</p>
			</div>

			<!-- Frequency Penalty -->
			<div>
				<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Frequency Penalty: {settings.frequencyPenalty}
				</label>
				<input
					type="range"
					bind:value={settings.frequencyPenalty}
					min="0"
					max="2"
					step="0.1"
					class="w-full accent-[var(--accent-primary)]"
				/>
				<p class="text-xs text-[var(--text-muted)] mt-1">
					Penalize repeated tokens based on frequency
				</p>
			</div>

			<!-- Presence Penalty -->
			<div>
				<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Presence Penalty: {settings.presencePenalty}
				</label>
				<input
					type="range"
					bind:value={settings.presencePenalty}
					min="0"
					max="2"
					step="0.1"
					class="w-full accent-[var(--accent-primary)]"
				/>
				<p class="text-xs text-[var(--text-muted)] mt-1">Penalize tokens that appear at all</p>
			</div>
		</div>
	</details>

	<!-- Save Buttons -->
	<div class="flex items-center gap-3">
		<button
			type="submit"
			disabled={saving}
			class="px-8 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-2"
		>
			{#if saving}
				<div
					class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
				></div>
				Saving...
			{:else}
				Save Settings
			{/if}
		</button>
		{#if onSavePreset}
			<button
				type="button"
				onclick={onSavePreset}
				class="px-8 py-3 bg-[var(--success)] hover:bg-[var(--success)]/80 text-white rounded-xl transition font-semibold shadow-lg hover:shadow-xl"
			>
				Save as Preset
			</button>
		{/if}
		<button
			type="button"
			onclick={onReload}
			disabled={saving}
			class="px-8 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] disabled:opacity-50 text-[var(--text-primary)] rounded-xl transition font-semibold shadow-lg hover:shadow-xl border border-[var(--border-primary)]"
		>
			Reload
		</button>
	</div>
</form>
