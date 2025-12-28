'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { propertiesApi, type PropertySearchParams } from '@/lib/api/properties';
import type { Property, PaginatedResponse } from '@/lib/types';

export function useProperties(params: PropertySearchParams = {}) {
  return useInfiniteQuery({
    queryKey: ['properties', params],
    queryFn: async ({ pageParam = 1 }) => {
      return propertiesApi.search({
        ...params,
        page: pageParam,
        limit: params.limit || 20,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesApi.getById(id),
    enabled: !!id,
  });
}

export function useFeaturedProperties(limit = 8) {
  return useQuery({
    queryKey: ['properties', 'featured', limit],
    queryFn: () => propertiesApi.getFeatured(limit),
  });
}

export function useNearbyProperties(
  latitude: number | undefined,
  longitude: number | undefined,
  radiusKm = 10,
  limit = 8
) {
  return useQuery({
    queryKey: ['properties', 'nearby', latitude, longitude, radiusKm, limit],
    queryFn: () =>
      propertiesApi.getNearby(latitude!, longitude!, radiusKm, limit),
    enabled: latitude !== undefined && longitude !== undefined,
  });
}

export function useSimilarProperties(propertyId: string, limit = 4) {
  return useQuery({
    queryKey: ['properties', propertyId, 'similar', limit],
    queryFn: () => propertiesApi.getSimilar(propertyId, limit),
    enabled: !!propertyId,
  });
}

export function usePropertyAvailability(
  propertyId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['property', propertyId, 'availability', startDate, endDate],
    queryFn: () =>
      propertiesApi.getAvailability(propertyId, startDate, endDate),
    enabled: !!propertyId && !!startDate && !!endDate,
  });
}

export function usePropertyOpenHouses(propertyId: string) {
  return useQuery({
    queryKey: ['property', propertyId, 'open-houses'],
    queryFn: () => propertiesApi.getOpenHouses(propertyId),
    enabled: !!propertyId,
  });
}

export function useInspectionSlots(propertyId: string, date?: string) {
  return useQuery({
    queryKey: ['property', propertyId, 'inspections', date],
    queryFn: () => propertiesApi.getInspectionSlots(propertyId, date),
    enabled: !!propertyId,
  });
}
