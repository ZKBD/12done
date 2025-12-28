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
    const response = await apiClient.get('/search/agents', {
      params: { page, limit },
    });
    return response.data;
  },

  getById: async (id: string): Promise<SearchAgent> => {
    const response = await apiClient.get(`/search/agents/${id}`);
    return response.data;
  },

  create: async (data: CreateSearchAgentDto): Promise<SearchAgent> => {
    const response = await apiClient.post('/search/agents', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSearchAgentDto): Promise<SearchAgent> => {
    const response = await apiClient.patch(`/search/agents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/search/agents/${id}`);
  },

  toggle: async (id: string): Promise<SearchAgent> => {
    const response = await apiClient.patch(`/search/agents/${id}/toggle`);
    return response.data;
  },

  runNow: async (id: string): Promise<{ matchCount: number }> => {
    const response = await apiClient.post(`/search/agents/${id}/run`);
    return response.data;
  },
};
