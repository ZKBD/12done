'use client';

import { apiClient } from './client';
import type { SearchAgent, SearchAgentCriteria, PaginatedResponse } from '@/lib/types';

export interface CreateSearchAgentDto {
  name: string;
  criteria: SearchAgentCriteria;
  frequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
}

export interface UpdateSearchAgentDto {
  name?: string;
  criteria?: SearchAgentCriteria;
  frequency?: 'INSTANT' | 'DAILY' | 'WEEKLY';
  isActive?: boolean;
}

export const searchAgentsApi = {
  getAll: async (page = 1, limit = 20): Promise<PaginatedResponse<SearchAgent>> => {
    return apiClient.get<PaginatedResponse<SearchAgent>>('/search/agents', {
      params: { page, limit },
    });
  },

  getById: async (id: string): Promise<SearchAgent> => {
    return apiClient.get<SearchAgent>(`/search/agents/${id}`);
  },

  create: async (data: CreateSearchAgentDto): Promise<SearchAgent> => {
    return apiClient.post<SearchAgent>('/search/agents', data);
  },

  update: async (id: string, data: UpdateSearchAgentDto): Promise<SearchAgent> => {
    return apiClient.patch<SearchAgent>(`/search/agents/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/search/agents/${id}`);
  },

  toggle: async (id: string): Promise<SearchAgent> => {
    return apiClient.patch<SearchAgent>(`/search/agents/${id}/toggle`);
  },

  runNow: async (id: string): Promise<{ matchCount: number }> => {
    return apiClient.post<{ matchCount: number }>(`/search/agents/${id}/run`);
  },
};
