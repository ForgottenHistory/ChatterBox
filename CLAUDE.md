# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered character chat application enabling users to create and chat with AI characters using character cards (v1/v2 format), manage conversations, group chat channels, lorebooks, user personas, and configure LLM settings.

## Rules
- Don't git commit without permission
- Don't add features that were not part of original request
- Styling needs to be consistent. Check other similar components first before implementation.

## Tech Stack

- **Framework**: SvelteKit 2.47+ with Svelte 5
- **Language**: TypeScript 5.9+
- **Styling**: Tailwind CSS 4.1+ with dark theme (CSS custom properties in app.css)
- **Database**: SQLite (better-sqlite3) with Drizzle ORM 0.44+
- **LLM Providers**: OpenRouter, Featherless, NanoGPT APIs
- **Real-time**: Socket.IO 4.8+ (custom Vite plugin at `src/lib/server/vite-plugin-socket.ts`)
- **Image Processing**: Sharp 0.34+
- **Other**: `twemoji` (Apple-style emoji), `marked` (markdown), `axios` (HTTP), `bcryptjs` (passwords)

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run check         # Type check with svelte-check
npm run lint          # Run ESLint
npm run db:push       # Push schema changes to SQLite
npm run db:studio     # Open Drizzle Studio (visual DB editor)
```

## Architecture

### Key Directories

- `src/lib/server/` - Server-side code (auth, LLM, database, services)
- `src/lib/components/` - Reusable Svelte components
- `src/lib/stores/` - Client-side state (characters cache, socket client)
- `src/routes/api/` - REST API endpoints
- `src/routes/` - Frontend pages
- `data/prompts/` - File-based system prompts (13 files)
- `data/` - Generated tags, images, other user data
- `logs/` - LLM call logs (prompt/response debugging)

### Database Schema (`src/lib/server/db/schema.ts`)

**All Tables:**
- `users` - Auth, preferences, engagement settings, layout config
- `llmSettings` - Chat LLM configuration
- `decisionEngineSettings` - Decision LLM configuration
- `contentLlmSettings` - Content LLM configuration
- `imageLlmSettings` - Image tag generation LLM configuration
- `llmPresets` - Saved LLM configurations
- `promptPresets` - Saved prompt configurations
- `characters` - Character cards (card data as JSON, image as Base64)
- `tagLibrary` - Danbooru tags library per user
- `conversations` - DM conversations per character/user
- `messages` - Messages with swipes (alternatives) as JSON array
- `userPersonas` - User-created personas (name, description, avatar)
- `lorebooks` - Knowledge bases for keyword-triggered context injection
- `lorebookEntries` - Individual entries with keywords, content, priority, case sensitivity
- `characterLorebooks` - Many-to-many: characters ↔ lorebooks
- `characterMemories` - Extracted memories with importance scores and decay
- `conversationCharacters` - Many-to-many: channels ↔ characters
- `llmUsageStats` - Token/message usage tracking per provider/model/type

**Key Character Fields:**
- `imageTags` - Always-included tags for image generation
- `contextualTags` - AI-selected tags based on context
- `mainPromptOverride` / `negativePromptOverride` - Per-character SD prompt overrides
- `scheduleData` - JSON weekly schedule with time blocks (ONLINE/AWAY/BUSY/OFFLINE)

**Key User Fields (engagement/channel behavior):**
- `chatLayout` - 'bubbles' or 'discord'
- `avatarStyle` - 'circle' or 'rounded'
- `engageRollMin/Max`, `engageChanceOnline/Away/Busy`, `engageDurationOnline/Away/Busy`, `engageCooldown`, `engageContextOffset`
- `doubleTextChanceMin/Max`, `joinChancePerMessage`, `memoryDecayPoints`
- `useNamePrimer`, `compactHistory`, `channelFrequencyMin/Max`

### Multi-LLM Architecture

Four separate LLM configurations, each with its own settings table and service:

| LLM Type | Purpose | Settings Service |
|----------|---------|------------------|
| **Chat** | Character conversations | `llmSettingsService.ts` |
| **Decision** | Pre-processing decisions before content | `decisionEngineSettingsService.ts` |
| **Content** | Content creation/generation | `contentLlmSettingsService.ts` |
| **Image** | Generate Danbooru tags for SD | `imageLlmSettingsService.ts` |

**Provider Concurrency Limits (queueService):**
- OpenRouter: 3 concurrent
- Featherless: 3 concurrent
- NanoGPT: 50 concurrent

**Featherless-Specific Parameters:**
- `modelPool` - JSON array of model IDs (rotated randomly per request)
- `topK`, `minP`, `repetitionPenalty`

### LLM Services (`src/lib/server/services/`)

- `llmService.ts` - High-level chat completion (retry logic: max 3, exponential backoff)
- `llmCallService.ts` - Unified LLM call handler (OpenRouter, Featherless, NanoGPT)
- `llmLogService.ts` - Stores last 5 prompts/responses per type for debugging
- `queueService.ts` - Request concurrency control per provider
- `decisionEngineService.ts` - Pre-processing decisions (e.g., when to send images)
- `contentLlmService.ts` - Content rewriting (description, personality, greeting, scenario)
- `memoryService.ts` - Memory extraction with importance scoring and decay
- `personaService.ts` - User persona management (create, retrieve, set active)
- `imageTagGenerationService.ts` - Generates Danbooru-style tags from conversation context
- `sdService.ts` - Stable Diffusion API integration (txt2img, health check, model listing)
- `sdSettingsService.ts` - Stable Diffusion configuration
- `llmSettingsService.ts` / `decisionEngineSettingsService.ts` / `contentLlmSettingsService.ts` / `imageLlmSettingsService.ts` - Per-LLM config access
- `lorebookService.ts` - Lorebook keyword injection and retrieval

### Prompt Files (`data/prompts/`)

13 prompt files with template variable substitution:
- `chat_system.txt` - Main DM system prompt
- `chat_impersonate.txt` - Impersonation prompt
- `decision_system.txt` - Decision Engine prompt
- `schedule.txt` - Schedule generation prompt
- `memory_extraction.txt` - Memory extraction prompt
- `image_character.txt`, `image_scene.txt`, `image_user.txt` - Image context prompts
- `content_description.txt`, `content_personality.txt`, `content_greeting.txt`, `content_scenario.txt`, `content_message_example.txt` - Content rewriting prompts

**Template Variables:** `{{char}}`, `{{user}}`, `{{description}}`, `{{personality}}`, `{{scenario}}`, `{{characterName}}`, `{{conversationHistory}}`, `{{existingMemories}}`, `{{dayOrWeek}}`, `{{name}}`

### Image Generation

- Character-specific `imageTags` (always included) + `contextualTags` (AI-selected per context)
- Per-character main/negative prompt overrides
- Stable Diffusion integration with Adetailer support
- Tags stored per-user in `data/tags_{userId}.txt`

### Authentication

Cookie-based sessions using userId. Password hashing via bcryptjs. Auth logic in `src/lib/server/auth.ts`.

### Socket.IO Integration

Custom Vite plugin integrates Socket.IO. Instance stored in `global.__socketio` (persists across hot reloads).

- **Rooms:** `conversation-{conversationId}`
- **Client → Server:** `join-conversation(conversationId)`, `leave-conversation(conversationId)`
- **Server → Client:** `new-message(message)`, `typing(isTyping)`

### Character Cards

- Supports v1/v2 formats
- Image extraction from PNG metadata (tEXt, zTXt, iTXt chunks) via `src/lib/utils/characterImageParser.ts`
- Original description/personality preserved for revert capability

### Advanced Features

**Engagement & Channel Behavior:**
- Characters dynamically join/leave group chats based on status and configured chances
- Proactive messages with varied opening styles (vibe check, life update, hot take, question)
- Double-text chance, time gaps, cooldown after disengagement
- Schedule-aware: characters know their current activity/status

**Swipes & Variants:**
- Messages store multiple response variants (swipes) as JSON array
- Switch between swipes, regenerate to add new, regenerate-fresh ignores history

**Conversation Branching:**
- Branch from any message point, multiple branches per character

**Memory System:**
- Memories extracted from conversations with importance scores
- Configurable decay (memoryDecayPoints per extraction cycle)
- Injected into system context as relevant background

**Lorebooks:**
- Keyword-triggered content injection into conversation context
- Per-entry priority, case sensitivity, enable/disable
- Global and character-specific lorebooks

## API Patterns

- Endpoints at `src/routes/api/[feature]/+server.ts`
- Export `GET`, `POST`, `PUT`, `DELETE` functions
- Access userId from cookies for auth
- Return JSON responses

### Key API Route Groups

- `/api/auth/*` - register, login, logout
- `/api/chat/[characterId]/*` - DM send, generate, impersonate, branches, export, reset
- `/api/chat/messages/[messageId]/*` - delete, edit, regenerate, regenerate-fresh, swipe
- `/api/channels/*` - list, create, messages, generate, extract-memories, wipe
- `/api/characters/*` - CRUD, upload, image, schedule, memories
- `/api/personas/*` - CRUD, set/get active
- `/api/lorebooks/*` - CRUD, entries, import
- `/api/llm/*` - settings per LLM type, models
- `/api/llm-presets/*` - CRUD
- `/api/prompt-presets/*` - CRUD
- `/api/prompts` - get/update prompt files
- `/api/image/*` - generate, generate-tags, sd-status, sd-models
- `/api/sd/*` - settings
- `/api/user/profile` - profile management
- `/api/settings`, `/api/behaviour-settings` - user preferences
- `/api/stats` - usage statistics
- `/api/tag-library` - Danbooru tag library

## Frontend Pages

- `/` - Home
- `/chat/[id]` - DM chat with character
- `/channel/[id]` - Group chat channel
- `/library` - Character library
- `/lorebooks` - Lorebook management
- `/tags` - Tag library
- `/prompts` - Prompt management
- `/settings` - LLM settings
- `/general-settings` - General user settings
- `/image-settings` - Image generation settings
- `/behaviour-settings` - Channel engagement settings
- `/stats` - Usage statistics
- `/profile` - User profile

## Styling

Dark theme with CSS custom properties (--bg-primary, --accent-primary, etc.) defined in `src/app.css`. Use Tailwind classes in components.

## Environment Variables

Create `.env` from `.env.example`:
```
OPENROUTER_API_KEY=sk-or-v1-...
FEATHERLESS_API_KEY=...   # optional
NANOGPT_API_KEY=...       # optional
SD_SERVER_URL=http://127.0.0.1:7860  # Stable Diffusion server
```
