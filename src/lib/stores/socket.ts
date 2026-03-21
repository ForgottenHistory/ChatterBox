import { writable } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

let socket: Socket | null = null;

/**
 * Initialize Socket.IO client connection
 */
export function initSocket() {
	if (!browser) return null;
	if (socket?.connected) return socket;

	socket = io({
		path: '/socket.io',
		withCredentials: true
	});

	socket.on('connect', () => {
		console.log('✅ Socket.IO connected');
	});

	socket.on('connect_error', (err) => {
		console.error('❌ Socket.IO connect error:', err.message);
	});

	socket.on('disconnect', () => {
		console.log('❌ Socket.IO disconnected');
	});

	return socket;
}

/**
 * Get Socket.IO client instance
 */
export function getSocket(): Socket | null {
	return socket;
}

/**
 * Join a conversation room
 */
export function joinConversation(conversationId: number) {
	if (!socket) return;
	socket.emit('join-conversation', conversationId);
	console.log(`🔌 Joined conversation ${conversationId}`);
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: number) {
	if (!socket) return;
	socket.emit('leave-conversation', conversationId);
	console.log(`🔌 Left conversation ${conversationId}`);
}

/**
 * Listen for new messages
 */
export function onNewMessage(callback: (message: any) => void) {
	if (!socket) return;
	socket.on('new-message', callback);
}

/**
 * Listen for typing indicator
 */
export function onTyping(callback: (isTyping: boolean) => void) {
	if (!socket) return;
	socket.on('typing', callback);
}

/**
 * Remove all listeners
 */
export function removeAllListeners() {
	if (!socket) return;
	socket.off('new-message');
	socket.off('typing');
}

// ─── Channel engagement helpers ───

export function joinChannel(channelId: number) {
	if (!socket) return;
	socket.emit('join-channel', { channelId });
}

export function leaveChannel(channelId: number) {
	if (!socket) return;
	socket.emit('leave-channel', { channelId });
}

export function emitUserMessage(channelId: number, text: string) {
	if (!socket) return;
	socket.emit('channel-user-message', { channelId, text });
}

export function emitDebugEngage(channelId: number) {
	if (!socket) return;
	socket.emit('channel-debug-engage', { channelId });
}

export function emitDebugClear(channelId: number) {
	if (!socket) return;
	socket.emit('channel-debug-clear', { channelId });
}

export function emitMoveEngagement(fromChannelId: number, toChannelId: number) {
	if (!socket) return;
	socket.emit('channel-move-engagement', { fromChannelId, toChannelId });
}

export function onChannelNewMessage(callback: (message: any) => void) {
	if (!socket) return;
	socket.on('channel-new-message', callback);
}

export function onChannelTyping(callback: (data: { characterName: string; isTyping: boolean }) => void) {
	if (!socket) return;
	socket.on('channel-typing', callback);
}

export function onChannelEngagementChanged(callback: (data: { engaged: Record<number, number>; cooldowns: Record<number, number> }) => void) {
	if (!socket) return;
	socket.on('channel-engagement-changed', callback);
}

export function removeChannelListeners() {
	if (!socket) return;
	socket.off('channel-new-message');
	socket.off('channel-typing');
	socket.off('channel-engagement-changed');
}
