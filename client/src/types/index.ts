// Base participant status
export type ParticipantStatus = 'online' | 'away' | 'offline';

// Avatar types
export type AvatarType = 'initials' | 'uploaded' | 'generated';

// Bot personality types
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

// Bot interface (extends base participant with bot-specific properties)
export interface Bot extends BaseParticipant {
  type: 'bot';
  personality: BotPersonality;
  triggers: string[];
  responses: string[];
  responseChance: number; // 0-1, probability of responding
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

// Bot creation configuration
export interface BotConfig {
  name: string;
  personality: BotPersonality;
  triggers: string[];
  responses: string[];
  avatar?: string;
  avatarType?: AvatarType;
  responseChance?: number;
}

// Message creation data (before it becomes a full Message)
export interface MessageData {
  content: string;
  room: string;
  authorId: string;
}