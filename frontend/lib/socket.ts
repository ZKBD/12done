'use client';

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';

let socket: Socket | null = null;

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
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to messaging namespace');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });
  }

  return socket;
}

export function connectSocket(): Socket | null {
  const sock = getSocket();
  if (sock && !sock.connected) {
    sock.connect();
  }
  return sock;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(): Socket | null {
  disconnectSocket();
  return connectSocket();
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
