'use client';

import { apiClient } from './client';
import type { Conversation, ConversationDetail, Message, PaginatedResponse } from '@/lib/types';

// Request DTOs
export interface CreateConversationDto {
  recipientId?: string;
  propertyId?: string;
  negotiationId?: string;
  subject?: string;
  initialMessage?: string;
}

export interface SendMessageDto {
  content: string;
}

export interface ConversationQueryParams {
  page?: number;
  limit?: number;
  isArchived?: boolean;
}

export interface MessageQueryParams {
  page?: number;
  limit?: number;
  before?: string;
}

// Response types
export interface ConversationsResponse extends PaginatedResponse<Conversation> {}

export interface MessagesResponse {
  data: Message[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface UnreadCountResponse {
  count: number;
}

export const messagingApi = {
  // Conversations
  getConversations: async (
    params: ConversationQueryParams = {}
  ): Promise<ConversationsResponse> => {
    return apiClient.get<ConversationsResponse>('/messages/conversations', params);
  },

  createConversation: async (dto: CreateConversationDto): Promise<Conversation> => {
    return apiClient.post<Conversation>('/messages/conversations', dto);
  },

  getConversation: async (id: string): Promise<ConversationDetail> => {
    return apiClient.get<ConversationDetail>(`/messages/conversations/${id}`);
  },

  // Messages
  getMessages: async (
    conversationId: string,
    params: MessageQueryParams = {}
  ): Promise<MessagesResponse> => {
    return apiClient.get<MessagesResponse>(
      `/messages/conversations/${conversationId}/messages`,
      params
    );
  },

  sendMessage: async (conversationId: string, dto: SendMessageDto): Promise<Message> => {
    return apiClient.post<Message>(`/messages/conversations/${conversationId}/messages`, dto);
  },

  deleteMessage: async (messageId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/messages/${messageId}`);
  },

  // Read status
  markAsRead: async (conversationId: string): Promise<{ message: string }> => {
    return apiClient.patch<{ message: string }>(`/messages/conversations/${conversationId}/read`);
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return apiClient.get<UnreadCountResponse>('/messages/unread-count');
  },

  // Archive
  archiveConversation: async (conversationId: string): Promise<{ message: string }> => {
    return apiClient.patch<{ message: string }>(
      `/messages/conversations/${conversationId}/archive`
    );
  },

  unarchiveConversation: async (conversationId: string): Promise<{ message: string }> => {
    return apiClient.patch<{ message: string }>(
      `/messages/conversations/${conversationId}/unarchive`
    );
  },
};
