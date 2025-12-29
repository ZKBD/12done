'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import {
  connectSocket,
  disconnectSocket,
  subscribeToConnectionStatus,
  queueMessage,
  getQueuedMessages,
  type ConnectionStatus,
  type NewMessageEvent,
  type TypingEvent,
  type StoppedTypingEvent,
  type ReadReceiptEvent,
} from '@/lib/socket';
import { messagingKeys } from './use-messaging';
import type { Message } from '@/lib/types';

// Re-export ConnectionStatus type for consumers
export type { ConnectionStatus } from '@/lib/socket';

interface UseMessagingSocketOptions {
  conversationId?: string;
  onNewMessage?: (message: NewMessageEvent) => void;
  onTyping?: (event: TypingEvent) => void;
  onStoppedTyping?: (event: StoppedTypingEvent) => void;
  onReadReceipt?: (event: ReadReceiptEvent) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
}

export function useMessagingSocket(options: UseMessagingSocketOptions = {}) {
  const { conversationId, onNewMessage, onTyping, onStoppedTyping, onReadReceipt, onConnectionChange } = options;
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [pendingMessages, setPendingMessages] = useState<number>(0);

  // Derived states for convenience
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isOffline = connectionStatus === 'offline';

  // Connect to socket and subscribe to connection status
  useEffect(() => {
    socketRef.current = connectSocket();

    // Subscribe to connection status changes
    const unsubscribe = subscribeToConnectionStatus((status) => {
      setConnectionStatus(status);
      onConnectionChange?.(status);

      // Update pending messages count
      if (status === 'connected') {
        setPendingMessages(0);
      }
    });

    // Initialize pending messages count
    setPendingMessages(getQueuedMessages().length);

    return () => {
      unsubscribe();
      disconnectSocket();
      setConnectionStatus('disconnected');
    };
  }, [onConnectionChange]);

  // Join/leave conversation room
  useEffect(() => {
    if (!socketRef.current || !conversationId || !isConnected) return;

    socketRef.current.emit('join_conversation', { conversationId });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leave_conversation', { conversationId });
      }
    };
  }, [conversationId, isConnected]);

  // Handle new messages
  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (message: NewMessageEvent) => {
      // Update cache
      queryClient.setQueryData(
        messagingKeys.messages(message.conversationId),
        (oldData: { pages: { data: Message[] }[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page, index) =>
              index === 0
                ? { ...page, data: [message as unknown as Message, ...page.data] }
                : page
            ),
          };
        }
      );

      // Invalidate conversations list to update lastMessage
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount() });

      // Call custom handler
      onNewMessage?.(message);
    };

    socketRef.current.on('new_message', handleNewMessage);

    return () => {
      socketRef.current?.off('new_message', handleNewMessage);
    };
  }, [queryClient, onNewMessage]);

  // Handle typing indicators
  useEffect(() => {
    if (!socketRef.current) return;

    const handleTyping = (event: TypingEvent) => {
      if (event.conversationId !== conversationId) return;

      setTypingUsers((prev) => {
        const exists = prev.some((u) => u.id === event.userId);
        if (exists) return prev;
        return [...prev, { id: event.userId, firstName: event.firstName, lastName: event.lastName }];
      });

      onTyping?.(event);
    };

    const handleStoppedTyping = (event: StoppedTypingEvent) => {
      if (event.conversationId !== conversationId) return;

      setTypingUsers((prev) => prev.filter((u) => u.id !== event.userId));

      onStoppedTyping?.(event);
    };

    socketRef.current.on('user_typing', handleTyping);
    socketRef.current.on('user_stopped_typing', handleStoppedTyping);

    return () => {
      socketRef.current?.off('user_typing', handleTyping);
      socketRef.current?.off('user_stopped_typing', handleStoppedTyping);
    };
  }, [conversationId, onTyping, onStoppedTyping]);

  // Handle read receipts
  useEffect(() => {
    if (!socketRef.current) return;

    const handleReadReceipt = (event: ReadReceiptEvent) => {
      // Update conversation data
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(event.conversationId) });

      onReadReceipt?.(event);
    };

    socketRef.current.on('read_receipt', handleReadReceipt);

    return () => {
      socketRef.current?.off('read_receipt', handleReadReceipt);
    };
  }, [queryClient, onReadReceipt]);

  // Send message via socket (with offline queue support)
  const sendMessage = useCallback(
    (content: string): { queued: boolean; queueId?: string } => {
      if (!conversationId) return { queued: false };

      // If connected, send immediately
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { conversationId, content });
        return { queued: false };
      }

      // If offline or disconnected, queue the message
      const queueId = queueMessage(conversationId, content);
      setPendingMessages((prev) => prev + 1);
      console.log('[Socket] Message queued for later delivery:', queueId);
      return { queued: true, queueId };
    },
    [conversationId]
  );

  // Typing indicator controls
  const startTyping = useCallback(() => {
    if (!socketRef.current || !conversationId) return;

    socketRef.current.emit('typing_start', { conversationId });

    // Auto-stop after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current || !conversationId) return;

    socketRef.current.emit('typing_stop', { conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId]);

  // Mark conversation as read via socket
  const markRead = useCallback(() => {
    if (!socketRef.current || !conversationId) return;

    socketRef.current.emit('mark_read', { conversationId });

    // Also update local cache
    queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount() });
  }, [conversationId, queryClient]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection status
    connectionStatus,
    isConnected,
    isConnecting,
    isOffline,

    // Typing
    typingUsers,

    // Pending messages (queued while offline)
    pendingMessages,

    // Actions
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
  };
}
