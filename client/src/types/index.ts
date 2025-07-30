// Base participant status
export type ParticipantStatus = 'online' | 'away' | 'offline';

// Avatar types
export type AvatarType = 'initials' | 'uploaded' | 'generated';

// Bot personality types (kept for backward compatibility but not actively used)
export type BotPersonality = 'friendly' | 'sarcastic' | 'helpful' | 'mysterious' | 'energetic';

// Base interface for all chat participants
export interface BaseParticipant {
  id: string;
  username: string;
  avatar: string;
  avatarType: AvatarType;
  status: ParticipantStatus;
  joinedAt: string;
  lastActive: string;
}

// User interface (extends base participant)
export interface User extends BaseParticipant {
  type: 'user';
}

// LLM Bot interface (simplified for LLM-based bots)
export interface Bot extends BaseParticipant {
  type: 'bot';

  // LLM-specific fields
  description?: string;
  exampleMessages?: string;

  // Legacy fields (kept for backward compatibility)
  personality: BotPersonality;
  triggers: string[];
  responses: string[];
  responseChance: number;
}

// Union type for any chat participant
export type Participant = User | Bot;

// Message interface with proper participant references
export interface Message {
  id: string;
  content: string;
  timestamp: string;
  room: string;
  author: Participant;
  isEdited?: boolean;
  editedAt?: string;
}

// Chat room interface
export interface ChatRoom {
  id: string;
  name: string;
  type: 'text' | 'voice';
  description?: string;
  participants: Participant[];
  isActive?: boolean;
}

// Bot creation configuration (minimal)
export interface BotConfig {
  name: string;
  description?: string;
  exampleMessages?: string;
  avatar?: string;
  avatarType?: AvatarType;
}

// Message creation data (before it becomes a full Message)
export interface MessageData {
  content: string;
  room: string;
  authorId: string;
}

// LLM Settings interface
export interface LLMSettings {
  systemPrompt: string;
  temperature: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  repetitionPenalty: number;
  minP: number;
}

// Default LLM settings
export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  systemPrompt: '',
  temperature: 0.6,
  topP: 1.0,
  topK: -1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  repetitionPenalty: 1.0,
  minP: 0
};

// Update BotConfig to include LLM settings
export interface BotConfig {
  name: string;
  description?: string;
  exampleMessages?: string;
  avatar?: string;
  avatarType?: AvatarType;
  llmSettings?: LLMSettings;
}