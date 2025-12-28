'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/api/favorites';
import { useAuth } from '@/providers';
import { toast } from '@/hooks/use-toast';

export function useFavorites(page = 1, limit = 20) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['favorites', page, limit],
    queryFn: () => favoritesApi.getAll(page, limit),
    enabled: isAuthenticated,
  });
}

export function useFavoriteIds() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['favorite-ids'],
    queryFn: () => favoritesApi.getPropertyIds(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      if (!isAuthenticated) {
        throw new Error('Please log in to save favorites');
      }
      return favoritesApi.toggle(propertyId);
    },
    onMutate: async (propertyId) => {
      // Optimistic update for favorite IDs
      await queryClient.cancelQueries({ queryKey: ['favorite-ids'] });

      const previousIds = queryClient.getQueryData<string[]>(['favorite-ids']);

      queryClient.setQueryData<string[]>(['favorite-ids'], (old = []) => {
        if (old.includes(propertyId)) {
          return old.filter((id) => id !== propertyId);
        }
        return [...old, propertyId];
      });

      return { previousIds };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousIds) {
        queryClient.setQueryData(['favorite-ids'], context.previousIds);
      }

      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update favorites',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      // Invalidate favorites list
      queryClient.invalidateQueries({ queryKey: ['favorites'] });

      toast({
        title: data.isFavorite ? 'Added to favorites' : 'Removed from favorites',
        description: data.isFavorite
          ? 'Property saved to your favorites'
          : 'Property removed from favorites',
      });
    },
  });
}

export function useIsFavorite(propertyId: string): boolean {
  const { data: favoriteIds = [] } = useFavoriteIds();
  return favoriteIds.includes(propertyId);
}
