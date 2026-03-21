import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import { logger } from './utils/logger';

// The engagement service stores itself in global.__engagementService.
// We read it lazily here to avoid $lib import resolution issues
// (this file is loaded by the vite plugin at config time).
function getEngagementService(): any {
	return (global as any).__engagementService || null;
}

// Use global to persist Socket.IO instance across hot reloads
declare global {
	var __socketio: SocketIOServer | undefined;
}

let io: SocketIOServer | null = global.__socketio || null;

/**
 * Parse userId from cookie string
 */
function parseCookieUserId(cookieStr?: string): number | null {
	if (!cookieStr) return null;
	const match = cookieStr.match(/(?:^|;\s*)userId=(\d+)/);
	return match ? parseInt(match[1]) : null;
}

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: Server) {
	if (io) {
		logger.warn('Socket.IO server already initialized');
		return io;
	}

	io = new SocketIOServer(httpServer, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		}
	});

	// Store in global for persistence across hot reloads
	global.__socketio = io;

	// Auth middleware — attach userId to socket
	io.use((socket, next) => {
		const userId = parseCookieUserId(socket.handshake.headers.cookie);
		socket.data.userId = userId || null;
		next();
	});

	io.on('connection', (socket) => {
		const userId: number | null = socket.data.userId;
		logger.info(`Socket connected: ${socket.id} (user ${userId || 'unknown'})`);

		socket.on('disconnect', () => {
			logger.info(`Socket disconnected: ${socket.id}`);
		});

		// ─── Legacy conversation room events (used by DM chat) ───

		socket.on('join-conversation', (conversationId: number) => {
			socket.join(`conversation-${conversationId}`);
			logger.debug(`Socket ${socket.id} joined conversation ${conversationId}`);
		});

		socket.on('leave-conversation', (conversationId: number) => {
			socket.leave(`conversation-${conversationId}`);
			logger.debug(`Socket ${socket.id} left conversation ${conversationId}`);
		});

		// ─── Channel engagement events ───

		socket.on('join-channel', async (data: { channelId: number }) => {
			const { channelId } = data;
			socket.join(`conversation-${channelId}`);
			logger.info(`Socket ${socket.id} joined channel ${channelId}`);

			if (!userId) { logger.warn('[Socket] join-channel: no userId'); return; }
			const svc = getEngagementService();
			if (!svc) { logger.warn('[Socket] join-channel: engagement service not available'); return; }
			svc.setFocus(channelId);
			await svc.activateChannel(channelId, userId);
			const state = svc.getState(channelId);
			socket.emit('channel-engagement-changed', state);
		});

		socket.on('leave-channel', (data: { channelId: number }) => {
			const { channelId } = data;
			socket.leave(`conversation-${channelId}`);
			logger.info(`Socket ${socket.id} left channel ${channelId}`);
			const svc = getEngagementService();
			if (svc) svc.clearFocus(channelId);
		});

		socket.on('channel-user-message', async (data: { channelId: number; text: string }) => {
			if (!userId) return;
			const svc = getEngagementService();
			if (svc) await svc.onUserMessage(data.channelId, userId, data.text);
		});

		socket.on('channel-debug-engage', async (data: { channelId: number }) => {
			logger.info(`[Socket] channel-debug-engage received for channel ${data.channelId}`);
			const svc = getEngagementService();
			if (!svc) { logger.warn('[Socket] Engagement service not available'); return; }
			await svc.debugEngageRandom(data.channelId);
		});

		socket.on('channel-debug-clear', async (data: { channelId: number }) => {
			const svc = getEngagementService();
			if (svc) await svc.debugClear(data.channelId);
		});

		socket.on('channel-move-engagement', async (data: { fromChannelId: number; toChannelId: number }) => {
			if (!userId) return;
			const svc = getEngagementService();
			if (svc) await svc.moveEngagement(data.fromChannelId, data.toChannelId, userId);
		});
	});

	logger.success('Socket.IO server initialized');
	console.log('🔍 Socket.IO instance stored in global:', global.__socketio ? 'YES' : 'NO');
	return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
	if (!io && global.__socketio) {
		io = global.__socketio;
	}
	return io;
}

/**
 * Emit a new message to a conversation room
 */
export function emitMessage(conversationId: number, message: any) {
	if (!io && global.__socketio) {
		io = global.__socketio;
	}

	if (!io) {
		logger.warn('Socket.IO not initialized, cannot emit message');
		return;
	}

	io.to(`conversation-${conversationId}`).emit('new-message', message);
	logger.info(`Emitted message to conversation ${conversationId}`);
}

/**
 * Emit typing indicator to a conversation room
 */
export function emitTyping(conversationId: number, isTyping: boolean) {
	if (!io && global.__socketio) {
		io = global.__socketio;
	}

	if (!io) return;
	io.to(`conversation-${conversationId}`).emit('typing', isTyping);
	logger.debug(`Emitted typing=${isTyping} to conversation ${conversationId}`);
}
