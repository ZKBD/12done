import { apiClient } from './client';
import type {
  Negotiation,
  Offer,
  Transaction,
  PaginatedResponse,
  NegotiationStatus,
  OfferStatus,
} from '@/lib/types';

// DTOs
export interface CreateNegotiationDto {
  propertyId: string;
  type: 'BUY' | 'RENT';
  initialOfferAmount?: number;
  currency?: string;
  message?: string;
  // For rentals
  startDate?: string;
  endDate?: string;
}

export interface CreateOfferDto {
  amount: number;
  currency: string;
  message?: string;
}

export interface NegotiationsParams {
  page?: number;
  limit?: number;
  status?: NegotiationStatus;
  role?: 'buyer' | 'seller' | 'all';
  propertyId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NegotiationWithDetails extends Negotiation {
  latestOffer?: Offer;
  transaction?: Transaction;
  unreadCount?: number;
}

export interface NegotiationStats {
  total: number;
  active: number;
  accepted: number;
  rejected: number;
  completed: number;
  totalValue: string;
  currency: string;
}

export const negotiationsApi = {
  // Get all negotiations for current user
  getAll: async (
    params: NegotiationsParams = {}
  ): Promise<PaginatedResponse<NegotiationWithDetails>> => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return apiClient.get<PaginatedResponse<NegotiationWithDetails>>(
      `/negotiations?${queryParams.toString()}`
    );
  },

  // Get single negotiation by ID
  getById: async (id: string): Promise<NegotiationWithDetails> => {
    return apiClient.get<NegotiationWithDetails>(`/negotiations/${id}`);
  },

  // Create new negotiation
  create: async (data: CreateNegotiationDto): Promise<Negotiation> => {
    return apiClient.post<Negotiation>('/negotiations', data);
  },

  // Get offers for a negotiation
  getOffers: async (negotiationId: string): Promise<Offer[]> => {
    return apiClient.get<Offer[]>(`/negotiations/${negotiationId}/offers`);
  },

  // Make a new offer (counter-offer)
  makeOffer: async (
    negotiationId: string,
    data: CreateOfferDto
  ): Promise<Offer> => {
    return apiClient.post<Offer>(`/negotiations/${negotiationId}/offers`, data);
  },

  // Accept an offer
  acceptOffer: async (
    negotiationId: string,
    offerId: string
  ): Promise<Negotiation> => {
    return apiClient.post<Negotiation>(
      `/negotiations/${negotiationId}/offers/${offerId}/accept`
    );
  },

  // Reject an offer
  rejectOffer: async (
    negotiationId: string,
    offerId: string,
    reason?: string
  ): Promise<Negotiation> => {
    return apiClient.post<Negotiation>(
      `/negotiations/${negotiationId}/offers/${offerId}/reject`,
      { reason }
    );
  },

  // Withdraw an offer (only by offer maker)
  withdrawOffer: async (
    negotiationId: string,
    offerId: string
  ): Promise<Offer> => {
    return apiClient.post<Offer>(
      `/negotiations/${negotiationId}/offers/${offerId}/withdraw`
    );
  },

  // Cancel negotiation
  cancel: async (negotiationId: string, reason?: string): Promise<Negotiation> => {
    return apiClient.post<Negotiation>(`/negotiations/${negotiationId}/cancel`, {
      reason,
    });
  },

  // Get negotiation stats
  getStats: async (): Promise<NegotiationStats> => {
    return apiClient.get<NegotiationStats>('/negotiations/stats');
  },

  // Check if user has active negotiation for a property
  checkExisting: async (
    propertyId: string
  ): Promise<{ exists: boolean; negotiation?: Negotiation }> => {
    return apiClient.get<{ exists: boolean; negotiation?: Negotiation }>(
      `/negotiations/check/${propertyId}`
    );
  },

  // Get transaction for a negotiation
  getTransaction: async (negotiationId: string): Promise<Transaction | null> => {
    return apiClient.get<Transaction | null>(
      `/negotiations/${negotiationId}/transaction`
    );
  },

  // Mark messages as read
  markAsRead: async (negotiationId: string): Promise<void> => {
    return apiClient.post(`/negotiations/${negotiationId}/read`);
  },
};
