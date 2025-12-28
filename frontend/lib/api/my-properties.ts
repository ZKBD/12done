import { apiClient } from './client';
import type {
  Property,
  PropertyMedia,
  PaginatedResponse,
  ListingType,
  PropertyStatus,
} from '@/lib/types';
import type { AvailabilitySlot, PricingRule } from './properties';

// DTOs for property management
export interface CreatePropertyDto {
  title: string;
  description?: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  listingTypes: ListingType[];
  basePrice: number;
  currency: string;
  squareMeters?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  yearBuilt?: number;
  petFriendly?: boolean;
  noAgents?: boolean;
}

export interface UpdatePropertyDto extends Partial<CreatePropertyDto> {
  status?: PropertyStatus;
}

export interface MyPropertiesParams {
  page?: number;
  limit?: number;
  status?: PropertyStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MediaUploadResponse {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: PropertyMedia['type'];
}

export interface UpdateMediaDto {
  caption?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface CreateAvailabilityDto {
  date: string;
  isAvailable: boolean;
  price?: number;
}

export interface UpdateAvailabilityDto {
  dates: {
    date: string;
    isAvailable: boolean;
    price?: number;
  }[];
}

export interface CreatePricingRuleDto {
  name: string;
  type: PricingRule['type'];
  adjustment: number;
  adjustmentType: 'PERCENTAGE' | 'FIXED';
  startDate?: string;
  endDate?: string;
  minNights?: number;
  maxNights?: number;
}

export interface UpdatePricingRuleDto extends Partial<CreatePricingRuleDto> {}

export interface PropertyStats {
  totalViews: number;
  viewsThisMonth: number;
  totalFavorites: number;
  activeNegotiations: number;
}

export const myPropertiesApi = {
  // Get user's properties
  getMyProperties: async (
    params: MyPropertiesParams = {}
  ): Promise<PaginatedResponse<Property>> => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return apiClient.get<PaginatedResponse<Property>>(
      `/properties/my?${queryParams.toString()}`
    );
  },

  // Get single property for editing
  getPropertyForEdit: async (id: string): Promise<Property> => {
    return apiClient.get<Property>(`/properties/${id}/edit`);
  },

  // Create new property
  create: async (data: CreatePropertyDto): Promise<Property> => {
    return apiClient.post<Property>('/properties', data);
  },

  // Update property
  update: async (id: string, data: UpdatePropertyDto): Promise<Property> => {
    return apiClient.patch<Property>(`/properties/${id}`, data);
  },

  // Delete property
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/properties/${id}`);
  },

  // Update property status
  updateStatus: async (
    id: string,
    status: PropertyStatus
  ): Promise<Property> => {
    return apiClient.patch<Property>(`/properties/${id}/status`, { status });
  },

  // Publish property (change from DRAFT to ACTIVE)
  publish: async (id: string): Promise<Property> => {
    return apiClient.post<Property>(`/properties/${id}/publish`);
  },

  // Pause property
  pause: async (id: string): Promise<Property> => {
    return apiClient.post<Property>(`/properties/${id}/pause`);
  },

  // Unpause property
  unpause: async (id: string): Promise<Property> => {
    return apiClient.post<Property>(`/properties/${id}/unpause`);
  },

  // Get property stats
  getStats: async (id: string): Promise<PropertyStats> => {
    return apiClient.get<PropertyStats>(`/properties/${id}/stats`);
  },

  // =============== MEDIA MANAGEMENT ===============

  // Upload media files
  uploadMedia: async (
    propertyId: string,
    files: File[],
    type: PropertyMedia['type'] = 'photo'
  ): Promise<MediaUploadResponse[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('type', type);

    return apiClient.upload<MediaUploadResponse[]>(
      `/properties/${propertyId}/media`,
      formData
    );
  },

  // Update media metadata
  updateMedia: async (
    propertyId: string,
    mediaId: string,
    data: UpdateMediaDto
  ): Promise<PropertyMedia> => {
    return apiClient.patch<PropertyMedia>(
      `/properties/${propertyId}/media/${mediaId}`,
      data
    );
  },

  // Delete media
  deleteMedia: async (propertyId: string, mediaId: string): Promise<void> => {
    return apiClient.delete(`/properties/${propertyId}/media/${mediaId}`);
  },

  // Reorder media
  reorderMedia: async (
    propertyId: string,
    mediaIds: string[]
  ): Promise<PropertyMedia[]> => {
    return apiClient.post<PropertyMedia[]>(
      `/properties/${propertyId}/media/reorder`,
      { mediaIds }
    );
  },

  // Set primary image
  setPrimaryMedia: async (
    propertyId: string,
    mediaId: string
  ): Promise<PropertyMedia> => {
    return apiClient.post<PropertyMedia>(
      `/properties/${propertyId}/media/${mediaId}/primary`
    );
  },

  // =============== AVAILABILITY MANAGEMENT ===============

  // Get availability calendar
  getAvailability: async (
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilitySlot[]> => {
    return apiClient.get<AvailabilitySlot[]>(
      `/properties/${propertyId}/availability?startDate=${startDate}&endDate=${endDate}`
    );
  },

  // Update availability (bulk)
  updateAvailability: async (
    propertyId: string,
    data: UpdateAvailabilityDto
  ): Promise<AvailabilitySlot[]> => {
    return apiClient.put<AvailabilitySlot[]>(
      `/properties/${propertyId}/availability`,
      data
    );
  },

  // Block dates
  blockDates: async (
    propertyId: string,
    startDate: string,
    endDate: string,
    reason?: string
  ): Promise<AvailabilitySlot[]> => {
    return apiClient.post<AvailabilitySlot[]>(
      `/properties/${propertyId}/availability/block`,
      { startDate, endDate, reason }
    );
  },

  // Unblock dates
  unblockDates: async (
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilitySlot[]> => {
    return apiClient.post<AvailabilitySlot[]>(
      `/properties/${propertyId}/availability/unblock`,
      { startDate, endDate }
    );
  },

  // =============== PRICING RULES ===============

  // Get pricing rules
  getPricingRules: async (propertyId: string): Promise<PricingRule[]> => {
    return apiClient.get<PricingRule[]>(
      `/properties/${propertyId}/pricing-rules`
    );
  },

  // Create pricing rule
  createPricingRule: async (
    propertyId: string,
    data: CreatePricingRuleDto
  ): Promise<PricingRule> => {
    return apiClient.post<PricingRule>(
      `/properties/${propertyId}/pricing-rules`,
      data
    );
  },

  // Update pricing rule
  updatePricingRule: async (
    propertyId: string,
    ruleId: string,
    data: UpdatePricingRuleDto
  ): Promise<PricingRule> => {
    return apiClient.patch<PricingRule>(
      `/properties/${propertyId}/pricing-rules/${ruleId}`,
      data
    );
  },

  // Delete pricing rule
  deletePricingRule: async (
    propertyId: string,
    ruleId: string
  ): Promise<void> => {
    return apiClient.delete(`/properties/${propertyId}/pricing-rules/${ruleId}`);
  },

  // =============== INSPECTION SLOTS ===============

  // Get inspection slots
  getInspectionSlots: async (
    propertyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<InspectionSlot[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiClient.get<InspectionSlot[]>(
      `/properties/${propertyId}/inspections?${params.toString()}`
    );
  },

  // Create inspection slots
  createInspectionSlots: async (
    propertyId: string,
    slots: { startTime: string; endTime: string }[]
  ): Promise<InspectionSlot[]> => {
    return apiClient.post<InspectionSlot[]>(
      `/properties/${propertyId}/inspections`,
      { slots }
    );
  },

  // Delete inspection slot
  deleteInspectionSlot: async (
    propertyId: string,
    slotId: string
  ): Promise<void> => {
    return apiClient.delete(`/properties/${propertyId}/inspections/${slotId}`);
  },
};

// Types
export interface InspectionSlot {
  id: string;
  propertyId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
