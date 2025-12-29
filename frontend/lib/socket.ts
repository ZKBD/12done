'use client';

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';

// Connection status types
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'offline';

// Queued message for offline support
export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  timestamp: Date;
}

let socket: Socket | null = null;
let connectionStatus: ConnectionStatus = 'disconnected';
let messageQueue: QueuedMessage[] = [];
let statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second

// Check if browser is online
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

// Update connection status and notify listeners
function setConnectionStatus(status: ConnectionStatus): void {
  connectionStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

// Subscribe to connection status changes
export function subscribeToConnectionStatus(
  listener: (status: ConnectionStatus) => void
): () => void {
  statusListeners.add(listener);
  // Immediately call with current status
  listener(connectionStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

// Get current connection status
export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

// Queue a message for sending when back online
export function queueMessage(conversationId: string, content: string): string {
  const id = `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  messageQueue.push({
    id,
    conversationId,
    content,
    timestamp: new Date(),
  });
  return id;
}

// Get queued messages
export function getQueuedMessages(): QueuedMessage[] {
  return [...messageQueue];
}

// Clear a message from queue (after successful send)
export function removeQueuedMessage(id: string): void {
  messageQueue = messageQueue.filter((m) => m.id !== id);
}

// Process queued messages when reconnected
function processMessageQueue(): void {
  if (!socket || !socket.connected || messageQueue.length === 0) return;

  const messages = [...messageQueue];
  messageQueue = [];

  messages.forEach((msg) => {
    socket?.emit('send_message', {
      conversationId: msg.conversationId,
      content: msg.content,
      queuedAt: msg.timestamp.toISOString(),
    });
  });

  console.log(`[Socket] Processed ${messages.length} queued message(s)`);
}

// Calculate reconnection delay with exponential backoff
function getReconnectDelay(): number {
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, Math.min(reconnectAttempts, 5));
  return Math.min(delay, 30000); // Max 30 seconds
}

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      console.warn('[Socket] No access token available');
      return null;
    }

    socket = io(`${WS_URL}/messaging`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: BASE_RECONNECT_DELAY,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to messaging namespace');
      setConnectionStatus('connected');
      reconnectAttempts = 0;
      // Process any queued messages
      processMessageQueue();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (isOnline()) {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('offline');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      reconnectAttempts++;
      setConnectionStatus(isOnline() ? 'disconnected' : 'offline');
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] Reconnection attempt ${attempt}`);
      setConnectionStatus('connecting');
    });

    socket.io.on('reconnect', (attempt) => {
      console.log(`[Socket] Reconnected after ${attempt} attempts`);
      reconnectAttempts = 0;
    });

    socket.io.on('reconnect_failed', () => {
      console.log('[Socket] Reconnection failed');
      setConnectionStatus('disconnected');
    });

    // Listen for browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
  }

  return socket;
}

function handleOnline(): void {
  console.log('[Socket] Browser is online, attempting reconnection');
  if (socket && !socket.connected) {
    setConnectionStatus('connecting');
    socket.connect();
  }
}

function handleOffline(): void {
  console.log('[Socket] Browser is offline');
  setConnectionStatus('offline');
}

export function connectSocket(): Socket | null {
  if (!isOnline()) {
    setConnectionStatus('offline');
    return null;
  }

  const sock = getSocket();
  if (sock && !sock.connected) {
    setConnectionStatus('connecting');
    sock.connect();
  }
  return sock;
}

export function disconnectSocket(): void {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }
  setConnectionStatus('disconnected');
  statusListeners.clear();
}

export function reconnectSocket(): Socket | null {
  disconnectSocket();
  return connectSocket();
}

// Force reconnection (useful after token refresh)
export function forceReconnect(): void {
  if (socket) {
    socket.disconnect();
    socket.connect();
  }
}

// Event types
export interface NewMessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
  content: string;
  type: string;
  createdAt: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  firstName: string;
  lastName: string;
}

export interface StoppedTypingEvent {
  conversationId: string;
  userId: string;
}

export interface ReadReceiptEvent {
  conversationId: string;
  userId: string;
  readAt: string;
}
