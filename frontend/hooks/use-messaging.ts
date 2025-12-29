'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  messagingApi,
  type ConversationQueryParams,
  type MessageQueryParams,
  type CreateConversationDto,
  type SendMessageDto,
} from '@/lib/api/messaging';
import type { Message } from '@/lib/types';

// Query keys for cache management
export const messagingKeys = {
  all: ['messaging'] as const,
  conversations: () => [...messagingKeys.all, 'conversations'] as const,
  conversationsList: (params: ConversationQueryParams) =>
    [...messagingKeys.conversations(), params] as const,
  conversation: (id: string) => [...messagingKeys.conversations(), id] as const,
  messages: (conversationId: string) =>
    [...messagingKeys.all, 'messages', conversationId] as const,
  messagesList: (conversationId: string, params: MessageQueryParams) =>
    [...messagingKeys.messages(conversationId), params] as const,
  unreadCount: () => [...messagingKeys.all, 'unread-count'] as const,
};

// Get paginated conversations
export function useConversations(params: ConversationQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: messagingKeys.conversationsList(params),
    queryFn: ({ pageParam = 1 }) =>
      messagingApi.getConversations({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta) return undefined;
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

// Get single conversation with recent messages
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: messagingKeys.conversation(id || ''),
    queryFn: () => messagingApi.getConversation(id!),
    enabled: !!id,
  });
}

// Get paginated messages for a conversation
export function useMessages(conversationId: string | undefined, params: MessageQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: messagingKeys.messagesList(conversationId || '', params),
    queryFn: ({ pageParam = 1 }) =>
      messagingApi.getMessages(conversationId!, { ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta?.hasMore) return undefined;
      return lastPage.meta.page + 1;
    },
    initialPageParam: 1,
    enabled: !!conversationId,
  });
}

// Get unread message count
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: messagingKeys.unreadCount(),
    queryFn: messagingApi.getUnreadCount,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

// Create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateConversationDto) => messagingApi.createConversation(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() });
    },
  });
}

// Send a message
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SendMessageDto) => messagingApi.sendMessage(conversationId, dto),
    onSuccess: (newMessage: Message) => {
      // Optimistically update messages list
      queryClient.setQueryData(
        messagingKeys.messages(conversationId),
        (oldData: { pages: { data: Message[] }[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page, index) =>
              index === 0 ? { ...page, data: [newMessage, ...page.data] } : page
            ),
          };
        }
      );

      // Invalidate conversation to update lastMessage
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() });
    },
  });
}

// Delete a message
export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => messagingApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(conversationId) });
    },
  });
}

// Mark conversation as read
export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => messagingApi.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: messagingKeys.unreadCount() });
    },
  });
}

// Archive conversation
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => messagingApi.archiveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() });
    },
  });
}

// Unarchive conversation
export function useUnarchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => messagingApi.unarchiveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations() });
    },
  });
}

// Get or create negotiation conversation
export function useNegotiationConversation(negotiationId: string | undefined) {
  return useQuery({
    queryKey: [...messagingKeys.all, 'negotiation', negotiationId],
    queryFn: () => messagingApi.getNegotiationConversation(negotiationId!),
    enabled: !!negotiationId,
  });
}
