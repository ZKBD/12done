import { apiClient } from './client';
import type {
  Property,
  PropertyFilters,
  PaginatedResponse,
  PropertyMedia,
} from '@/lib/types';

export interface PropertySearchParams extends PropertyFilters {
  // Geo search params
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  // Bounding box params
  northEast?: { lat: number; lng: number };
  southWest?: { lat: number; lng: number };
}

export interface PropertyDetail extends Property {
  amenities?: string[];
  rules?: string[];
  availabilityCalendar?: AvailabilitySlot[];
  pricingRules?: PricingRule[];
  upcomingOpenHouses?: OpenHouse[];
  viewCount?: number;
}

export interface AvailabilitySlot {
  id: string;
  date: string;
  isAvailable: boolean;
  price?: string;
}

export interface PricingRule {
  id: string;
  name: string;
  type: 'SEASONAL' | 'WEEKEND' | 'LAST_MINUTE' | 'LONG_STAY';
  adjustment: number;
  adjustmentType: 'PERCENTAGE' | 'FIXED';
  startDate?: string;
  endDate?: string;
}

export interface OpenHouse {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  maxAttendees: number;
  currentAttendees: number;
  notes?: string;
}

export interface InspectionSlot {
  id: string;
  propertyId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedByMe?: boolean;
}

export const propertiesApi = {
  // Search properties
  search: async (
    params: PropertySearchParams = {}
  ): Promise<PaginatedResponse<Property>> => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((v) => queryParams.append(key, String(v)));
        } else if (typeof value === 'object') {
          queryParams.append(key, JSON.stringify(value));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    return apiClient.get<PaginatedResponse<Property>>(
      `/properties?${queryParams.toString()}`
    );
  },

  // Get single property
  getById: async (id: string): Promise<PropertyDetail> => {
    return apiClient.get<PropertyDetail>(`/properties/${id}`);
  },

  // Get property by slug
  getBySlug: async (slug: string): Promise<PropertyDetail> => {
    return apiClient.get<PropertyDetail>(`/properties/slug/${slug}`);
  },

  // Get featured properties
  getFeatured: async (limit = 8): Promise<Property[]> => {
    const response = await apiClient.get<PaginatedResponse<Property>>(
      `/properties?limit=${limit}&sortBy=viewCount&sortOrder=desc`
    );
    return response.data;
  },

  // Get nearby properties
  getNearby: async (
    latitude: number,
    longitude: number,
    radiusKm = 10,
    limit = 8
  ): Promise<Property[]> => {
    const response = await apiClient.get<PaginatedResponse<Property>>(
      `/properties?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}&limit=${limit}`
    );
    return response.data;
  },

  // Map search with bounding box
  searchByBounds: async (
    northEast: { lat: number; lng: number },
    southWest: { lat: number; lng: number },
    filters?: PropertyFilters
  ): Promise<Property[]> => {
    const params = {
      ...filters,
      northEastLat: northEast.lat,
      northEastLng: northEast.lng,
      southWestLat: southWest.lat,
      southWestLng: southWest.lng,
    };

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const response = await apiClient.get<PaginatedResponse<Property>>(
      `/properties/map?${queryParams.toString()}`
    );
    return response.data;
  },

  // Get property media
  getMedia: async (propertyId: string): Promise<PropertyMedia[]> => {
    return apiClient.get<PropertyMedia[]>(`/properties/${propertyId}/media`);
  },

  // Get availability
  getAvailability: async (
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilitySlot[]> => {
    return apiClient.get<AvailabilitySlot[]>(
      `/properties/${propertyId}/availability?startDate=${startDate}&endDate=${endDate}`
    );
  },

  // Get inspection slots
  getInspectionSlots: async (
    propertyId: string,
    date?: string
  ): Promise<InspectionSlot[]> => {
    const query = date ? `?date=${date}` : '';
    return apiClient.get<InspectionSlot[]>(
      `/properties/${propertyId}/inspections${query}`
    );
  },

  // Book inspection
  bookInspection: async (
    propertyId: string,
    slotId: string
  ): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(
      `/properties/${propertyId}/inspections/${slotId}/book`
    );
  },

  // Get open houses
  getOpenHouses: async (propertyId: string): Promise<OpenHouse[]> => {
    return apiClient.get<OpenHouse[]>(`/properties/${propertyId}/open-houses`);
  },

  // Register for open house
  registerForOpenHouse: async (
    propertyId: string,
    openHouseId: string
  ): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(
      `/properties/${propertyId}/open-houses/${openHouseId}/register`
    );
  },

  // Get similar properties
  getSimilar: async (propertyId: string, limit = 4): Promise<Property[]> => {
    return apiClient.get<Property[]>(
      `/properties/${propertyId}/similar?limit=${limit}`
    );
  },

  // Track property view
  trackView: async (propertyId: string): Promise<void> => {
    return apiClient.post(`/properties/${propertyId}/view`);
  },
};
