'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchAgentsApi,
  type CreateSearchAgentDto,
  type UpdateSearchAgentDto,
} from '@/lib/api/search-agents';

export function useSearchAgents(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['search-agents', page, limit],
    queryFn: () => searchAgentsApi.getAll(page, limit),
  });
}

export function useSearchAgent(id: string) {
  return useQuery({
    queryKey: ['search-agents', id],
    queryFn: () => searchAgentsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSearchAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSearchAgentDto) => searchAgentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-agents'] });
    },
  });
}

export function useUpdateSearchAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSearchAgentDto }) =>
      searchAgentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-agents'] });
    },
  });
}

export function useDeleteSearchAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => searchAgentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-agents'] });
    },
  });
}

export function useToggleSearchAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => searchAgentsApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-agents'] });
    },
  });
}

export function useRunSearchAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => searchAgentsApi.runNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-agents'] });
    },
  });
}
