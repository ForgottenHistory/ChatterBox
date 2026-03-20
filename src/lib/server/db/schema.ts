import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').unique().notNull(),
	displayName: text('display_name').notNull(),
	passwordHash: text('password_hash').notNull(),
	bio: text('bio'),
	avatarData: text('avatar_data'), // Base64 image data (full size)
	avatarThumbnail: text('avatar_thumbnail'), // Base64 thumbnail for chat messages
	activePersonaId: integer('active_persona_id'), // Currently active persona (null = use user profile)
	chatLayout: text('chat_layout').notNull().default('bubbles'), // 'bubbles' (chat app style) or 'discord' (full-width rows)
	avatarStyle: text('avatar_style').notNull().default('circle'), // 'circle' or 'rounded' (rounded square)
	// Behaviour settings
	channelFrequencyMin: integer('channel_frequency_min').notNull().default(5), // Min seconds between character messages in channels
	channelFrequencyMax: integer('channel_frequency_max').notNull().default(30), // Max seconds between character messages in channels
	useNamePrimer: integer('use_name_primer', { mode: 'boolean' }).notNull().default(true), // Append "CharName: " to prompt to prime the response
	compactHistory: integer('compact_history', { mode: 'boolean' }).notNull().default(true), // Group same-sender messages in conversation history to save tokens
	// Engagement roll interval (minutes)
	engageRollMin: integer('engage_roll_min').notNull().default(1), // Min minutes between engagement rolls
	engageRollMax: integer('engage_roll_max').notNull().default(3), // Max minutes between engagement rolls
	// Double text chance (%)
	doubleTextChanceMin: integer('double_text_chance_min').notNull().default(10),
	doubleTextChanceMax: integer('double_text_chance_max').notNull().default(30),
	// Chance (%) a new character joins per user message when someone is already engaged
	joinChancePerMessage: integer('join_chance_per_message').notNull().default(1),
	// Memory decay points per extraction cycle (0 = disabled)
	memoryDecayPoints: integer('memory_decay_points').notNull().default(2),
	// How many messages before engage start to include for context
	engageContextOffset: integer('engage_context_offset').notNull().default(10),
	// Engagement cooldown after disengaging (minutes)
	engageCooldown: integer('engage_cooldown').notNull().default(5),
	// Engagement settings - chance to join conversation (%)
	engageChanceOnline: integer('engage_chance_online').notNull().default(80),
	engageChanceAway: integer('engage_chance_away').notNull().default(30),
	engageChanceBusy: integer('engage_chance_busy').notNull().default(10),
	// Engagement duration - how long they stay engaged (minutes)
	engageDurationOnline: integer('engage_duration_online').notNull().default(5),
	engageDurationAway: integer('engage_duration_away').notNull().default(2),
	engageDurationBusy: integer('engage_duration_busy').notNull().default(1),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const userPersonas = sqliteTable('user_personas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'), // Description/bio for this persona
	avatarData: text('avatar_data'), // Base64 image data for persona (full size)
	avatarThumbnail: text('avatar_thumbnail'), // Base64 thumbnail for chat messages
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const llmSettings = sqliteTable('llm_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'), // 'openrouter', 'featherless', etc.
	model: text('model').notNull().default('anthropic/claude-3.5-sonnet'),
	temperature: real('temperature').notNull().default(0.7),
	maxTokens: integer('max_tokens').notNull().default(500),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(8000),
	reasoningEnabled: integer('reasoning_enabled', { mode: 'boolean' }).notNull().default(false),
	// Featherless-specific parameters
	modelPool: text('model_pool'), // JSON array of model IDs for rotation (null = use primary model only)
	topK: integer('top_k').notNull().default(-1), // -1 means disabled
	minP: real('min_p').notNull().default(0.0),
	repetitionPenalty: real('repetition_penalty').notNull().default(1.0)
});

export const decisionEngineSettings = sqliteTable('decision_engine_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'),
	model: text('model').notNull().default('anthropic/claude-3.5-sonnet'),
	temperature: real('temperature').notNull().default(0.3),
	maxTokens: integer('max_tokens').notNull().default(200),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(4000),
	reasoningEnabled: integer('reasoning_enabled', { mode: 'boolean' }).notNull().default(false),
	// Featherless-specific parameters
	topK: integer('top_k').notNull().default(-1),
	minP: real('min_p').notNull().default(0.0),
	repetitionPenalty: real('repetition_penalty').notNull().default(1.0)
});

export const contentLlmSettings = sqliteTable('content_llm_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'),
	model: text('model').notNull().default('anthropic/claude-3.5-sonnet'),
	temperature: real('temperature').notNull().default(0.8),
	maxTokens: integer('max_tokens').notNull().default(2000),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(16000),
	reasoningEnabled: integer('reasoning_enabled', { mode: 'boolean' }).notNull().default(false),
	// Featherless-specific parameters
	topK: integer('top_k').notNull().default(-1),
	minP: real('min_p').notNull().default(0.0),
	repetitionPenalty: real('repetition_penalty').notNull().default(1.0)
});

export const imageLlmSettings = sqliteTable('image_llm_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull().default('openrouter'),
	model: text('model').notNull().default('openai/gpt-4o-mini'),
	temperature: real('temperature').notNull().default(1.0),
	maxTokens: integer('max_tokens').notNull().default(1000),
	topP: real('top_p').notNull().default(1.0),
	frequencyPenalty: real('frequency_penalty').notNull().default(0.0),
	presencePenalty: real('presence_penalty').notNull().default(0.0),
	contextWindow: integer('context_window').notNull().default(4000),
	reasoningEnabled: integer('reasoning_enabled', { mode: 'boolean' }).notNull().default(false),
	// Featherless-specific parameters
	topK: integer('top_k').notNull().default(-1),
	minP: real('min_p').notNull().default(0.0),
	repetitionPenalty: real('repetition_penalty').notNull().default(1.0)
});

export const sdSettings = sqliteTable('sd_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	mainPrompt: text('main_prompt').notNull().default('masterpiece, best quality, amazing quality, 1girl, solo'),
	negativePrompt: text('negative_prompt').notNull().default('lowres, bad anatomy, bad hands, text, error, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, speech bubble, multiple views'),
	model: text('model').notNull().default(''),
	steps: integer('steps').notNull().default(30),
	cfgScale: real('cfg_scale').notNull().default(7.0),
	sampler: text('sampler').notNull().default('DPM++ 2M'),
	scheduler: text('scheduler').notNull().default('Karras'),
	enableHr: integer('enable_hr', { mode: 'boolean' }).notNull().default(true),
	hrScale: real('hr_scale').notNull().default(1.5),
	hrUpscaler: text('hr_upscaler').notNull().default('Latent'),
	hrSteps: integer('hr_steps').notNull().default(15),
	hrCfg: real('hr_cfg').notNull().default(5.0),
	denoisingStrength: real('denoising_strength').notNull().default(0.7),
	enableAdetailer: integer('enable_adetailer', { mode: 'boolean' }).notNull().default(false),
	adetailerModel: text('adetailer_model').notNull().default('face_yolov8n.pt')
});

export const llmPresets = sqliteTable('llm_presets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	temperature: real('temperature').notNull(),
	maxTokens: integer('max_tokens').notNull(),
	topP: real('top_p').notNull(),
	frequencyPenalty: real('frequency_penalty').notNull(),
	presencePenalty: real('presence_penalty').notNull(),
	contextWindow: integer('context_window').notNull(),
	reasoningEnabled: integer('reasoning_enabled', { mode: 'boolean' }).notNull().default(false),
	// Featherless-specific parameters
	topK: integer('top_k').notNull().default(-1),
	minP: real('min_p').notNull().default(0.0),
	repetitionPenalty: real('repetition_penalty').notNull().default(1.0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const characters = sqliteTable('characters', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	personality: text('personality'),
	originalDescription: text('original_description'), // Preserved from card import for revert
	originalPersonality: text('original_personality'), // Preserved from card import for revert
	tags: text('tags'), // JSON array of tags
	imageData: text('image_data'), // Base64 image data (full size)
	thumbnailData: text('thumbnail_data'), // Base64 thumbnail for sidebar
	// Image generation settings (per-character)
	imageTags: text('image_tags'), // Always included tags (hair color, eye color, body type)
	contextualTags: text('contextual_tags'), // AI chooses from these based on context
	mainPromptOverride: text('main_prompt_override'), // Override global main prompt
	negativePromptOverride: text('negative_prompt_override'), // Override global negative prompt
	// Schedule
	scheduleData: text('schedule_data'), // JSON weekly schedule { monday: [{start, end, status, activity}], ... }
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const promptPresets = sqliteTable('prompt_presets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	prompts: text('prompts').notNull(), // JSON object of all prompts: { chat: { system: "...", impersonate: "..." }, ... }
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const lorebooks = sqliteTable('lorebooks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true), // Quick toggle on/off
	isGlobal: integer('is_global', { mode: 'boolean' }).notNull().default(false), // Apply to all chats
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const lorebookEntries = sqliteTable('lorebook_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	lorebookId: integer('lorebook_id')
		.notNull()
		.references(() => lorebooks.id, { onDelete: 'cascade' }),
	name: text('name').notNull(), // Entry name/title for organization
	keywords: text('keywords').notNull(), // JSON array of trigger keywords
	content: text('content').notNull(), // The lore content to inject
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
	caseSensitive: integer('case_sensitive', { mode: 'boolean' }).notNull().default(false),
	priority: integer('priority').notNull().default(0), // Higher = inserted first
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const characterLorebooks = sqliteTable('character_lorebooks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	characterId: integer('character_id')
		.notNull()
		.references(() => characters.id, { onDelete: 'cascade' }),
	lorebookId: integer('lorebook_id')
		.notNull()
		.references(() => lorebooks.id, { onDelete: 'cascade' })
});

export const tagLibrary = sqliteTable('tag_library', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' })
		.unique(),
	content: text('content').notNull().default(''),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const conversations = sqliteTable('conversations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	characterId: integer('character_id')
		.references(() => characters.id, { onDelete: 'cascade' }), // Legacy / convenience for DMs, nullable for channels
	conversationType: text('conversation_type').notNull().default('dm'), // 'dm' or 'channel'
	name: text('name'), // Channel name or branch name
	description: text('description'), // Channel description
	parentConversationId: integer('parent_conversation_id'), // ID of conversation this branched from
	branchPointMessageId: integer('branch_point_message_id'), // Message ID where branch was created
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), // Currently active branch
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const conversationCharacters = sqliteTable('conversation_characters', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	conversationId: integer('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	characterId: integer('character_id')
		.notNull()
		.references(() => characters.id, { onDelete: 'cascade' }),
	addedAt: integer('added_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const messages = sqliteTable('messages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	conversationId: integer('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	characterId: integer('character_id')
		.references(() => characters.id, { onDelete: 'set null' }), // Which character sent this (null for user messages)
	role: text('role').notNull(), // 'user' or 'assistant'
	content: text('content').notNull(),
	swipes: text('swipes'), // JSON array of alternative content variants
	currentSwipe: integer('current_swipe').default(0), // Index of currently selected swipe
	senderName: text('sender_name'), // Display name at time of message (persona or user profile)
	senderAvatar: text('sender_avatar'), // Avatar data at time of message
	reasoning: text('reasoning'), // LLM reasoning/thinking content (if available)
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const characterMemories = sqliteTable('character_memories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	characterId: integer('character_id')
		.notNull()
		.references(() => characters.id, { onDelete: 'cascade' }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	content: text('content').notNull(), // The memory text
	source: text('source').notNull().default('conversation'), // 'conversation', 'manual', 'system'
	sourceConversationId: integer('source_conversation_id')
		.references(() => conversations.id, { onDelete: 'set null' }), // Where it was learned
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const llmUsageStats = sqliteTable('llm_usage_stats', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	messageType: text('message_type').notNull(), // 'channel', 'channel-proactive', 'chat', 'schedule', 'memory-extraction', etc.
	promptTokens: integer('prompt_tokens').notNull().default(0),
	completionTokens: integer('completion_tokens').notNull().default(0),
	totalTokens: integer('total_tokens').notNull().default(0),
	durationMs: integer('duration_ms').notNull().default(0),
	success: integer('success', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserPersona = typeof userPersonas.$inferSelect;
export type NewUserPersona = typeof userPersonas.$inferInsert;
export type LlmSettings = typeof llmSettings.$inferSelect;
export type NewLlmSettings = typeof llmSettings.$inferInsert;
export type DecisionEngineSettings = typeof decisionEngineSettings.$inferSelect;
export type NewDecisionEngineSettings = typeof decisionEngineSettings.$inferInsert;
export type ContentLlmSettings = typeof contentLlmSettings.$inferSelect;
export type NewContentLlmSettings = typeof contentLlmSettings.$inferInsert;
export type ImageLlmSettings = typeof imageLlmSettings.$inferSelect;
export type NewImageLlmSettings = typeof imageLlmSettings.$inferInsert;
export type SdSettings = typeof sdSettings.$inferSelect;
export type NewSdSettings = typeof sdSettings.$inferInsert;
export type LlmPreset = typeof llmPresets.$inferSelect;
export type NewLlmPreset = typeof llmPresets.$inferInsert;
export type PromptPreset = typeof promptPresets.$inferSelect;
export type NewPromptPreset = typeof promptPresets.$inferInsert;
export type Lorebook = typeof lorebooks.$inferSelect;
export type NewLorebook = typeof lorebooks.$inferInsert;
export type LorebookEntry = typeof lorebookEntries.$inferSelect;
export type NewLorebookEntry = typeof lorebookEntries.$inferInsert;
export type CharacterLorebook = typeof characterLorebooks.$inferSelect;
export type NewCharacterLorebook = typeof characterLorebooks.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type TagLibrary = typeof tagLibrary.$inferSelect;
export type NewTagLibrary = typeof tagLibrary.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationCharacter = typeof conversationCharacters.$inferSelect;
export type NewConversationCharacter = typeof conversationCharacters.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type CharacterMemory = typeof characterMemories.$inferSelect;
export type NewCharacterMemory = typeof characterMemories.$inferInsert;
export type LlmUsageStat = typeof llmUsageStats.$inferSelect;
export type NewLlmUsageStat = typeof llmUsageStats.$inferInsert;
