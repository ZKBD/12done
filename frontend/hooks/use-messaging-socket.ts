'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import {
  connectSocket,
  disconnectSocket,
  type NewMessageEvent,
  type TypingEvent,
  type StoppedTypingEvent,
  type ReadReceiptEvent,
} from '@/lib/socket';
import { messagingKeys } from './use-messaging';
import type { Message } from '@/lib/types';

interface UseMessagingSocketOptions {
  conversationId?: string;
  onNewMessage?: (message: NewMessageEvent) => void;
  onTyping?: (event: TypingEvent) => void;
  onStoppedTyping?: (event: StoppedTypingEvent) => void;
  onReadReceipt?: (event: ReadReceiptEvent) => void;
}

interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
}

export function useMessagingSocket(options: UseMessagingSocketOptions = {}) {
  const { conversationId, onNewMessage, onTyping, onStoppedTyping, onReadReceipt } = options;
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Connect to socket
  useEffect(() => {
    socketRef.current = connectSocket();

    if (socketRef.current) {
      socketRef.current.on('connect', () => {
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });
    }

    return () => {
      disconnectSocket();
      setIsConnected(false);
    };
  }, []);

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

  // Send message via socket (alternative to REST)
  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current || !conversationId) return;

      socketRef.current.emit('send_message', { conversationId, content });
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
    isConnected,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
  };
}
