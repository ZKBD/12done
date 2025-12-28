'use client';

import { apiClient } from './client';
import type { Notification } from '@/lib/types';

export interface NotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
}

export const notificationsApi = {
  getAll: async (params: NotificationsParams = {}): Promise<NotificationsResponse> => {
    return apiClient.get<NotificationsResponse>('/notifications', { params });
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    return apiClient.get<{ count: number }>('/notifications/unread-count');
  },

  getStats: async (): Promise<NotificationStats> => {
    return apiClient.get<NotificationStats>('/notifications/stats');
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return apiClient.patch<Notification>(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    return apiClient.patch<{ count: number }>('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  deleteAll: async (): Promise<{ count: number }> => {
    return apiClient.delete<{ count: number }>('/notifications');
  },
};
