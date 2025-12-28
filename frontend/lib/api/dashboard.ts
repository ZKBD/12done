'use client';

import { apiClient } from './client';

export interface DashboardStats {
  properties: {
    total: number;
    active: number;
    pending: number;
    sold: number;
  };
  favorites: {
    count: number;
  };
  negotiations: {
    total: number;
    active: number;
    pending: number;
    completed: number;
  };
  views: {
    total: number;
    thisMonth: number;
    trend: number; // percentage change
  };
  earnings: {
    total: string;
    thisMonth: string;
    pending: string;
    currency: string;
  };
}

export interface RecentActivity {
  id: string;
  type: 'PROPERTY_VIEW' | 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'PAYMENT_RECEIVED' | 'PROPERTY_LISTED';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    propertyId?: string;
    negotiationId?: string;
    amount?: string;
    currency?: string;
  };
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/users/dashboard/stats');
    return response.data;
  },

  getRecentActivity: async (limit: number = 5): Promise<RecentActivity[]> => {
    const response = await apiClient.get('/users/dashboard/activity', {
      params: { limit },
    });
    return response.data;
  },
};
