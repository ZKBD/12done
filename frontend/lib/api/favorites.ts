import { apiClient } from './client';
import type { Property } from '@/lib/types';

export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  property: Property;
  createdAt: string;
}

export interface FavoritesResponse {
  data: Favorite[];
  total: number;
}

export const favoritesApi = {
  // Get user's favorites
  getAll: async (
    page = 1,
    limit = 20
  ): Promise<FavoritesResponse> => {
    // Backend returns array directly, wrap it for consistency
    const favorites = await apiClient.get<Favorite[]>('/favorites');
    return {
      data: favorites,
      total: favorites.length,
    };
  },

  // Get favorite property IDs (for quick lookup)
  getPropertyIds: async (): Promise<string[]> => {
    return apiClient.get<string[]>('/favorites/ids');
  },

  // Add property to favorites
  add: async (propertyId: string): Promise<Favorite> => {
    return apiClient.post<Favorite>(`/favorites/${propertyId}`);
  },

  // Remove property from favorites
  remove: async (propertyId: string): Promise<void> => {
    return apiClient.delete(`/favorites/${propertyId}`);
  },

  // Toggle favorite status
  toggle: async (propertyId: string): Promise<{ isFavorite: boolean }> => {
    return apiClient.post<{ isFavorite: boolean }>(
      `/favorites/${propertyId}/toggle`
    );
  },

  // Check if property is favorited
  check: async (propertyId: string): Promise<boolean> => {
    const response = await apiClient.get<{ isFavorite: boolean }>(
      `/favorites/${propertyId}/check`
    );
    return response.isFavorite;
  },
};
