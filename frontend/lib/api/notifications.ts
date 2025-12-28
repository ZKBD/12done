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
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  getStats: async (): Promise<NotificationStats> => {
    const response = await apiClient.get('/notifications/stats');
    return response.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  deleteAll: async (): Promise<{ count: number }> => {
    const response = await apiClient.delete('/notifications');
    return response.data;
  },
};
