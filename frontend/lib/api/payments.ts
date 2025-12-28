import { apiClient } from './client';
import type { Transaction, PaginatedResponse } from '@/lib/types';

// DTOs
export interface CreateCheckoutDto {
  negotiationId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface TransactionsParams {
  page?: number;
  limit?: number;
  status?: Transaction['status'];
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionWithDetails extends Transaction {
  negotiation: {
    id: string;
    property: {
      id: string;
      title: string;
      address: string;
      city: string;
    };
    buyer: {
      id: string;
      firstName: string;
      lastName: string;
    };
    seller: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface PaymentStats {
  totalEarnings: string;
  totalSpent: string;
  pendingPayouts: string;
  completedTransactions: number;
  currency: string;
}

export interface RefundRequest {
  transactionId: string;
  reason: string;
  amount?: number; // For partial refunds
}

export const paymentsApi = {
  // Create Stripe checkout session
  createCheckout: async (data: CreateCheckoutDto): Promise<CheckoutSession> => {
    return apiClient.post<CheckoutSession>('/payments/checkout', data);
  },

  // Create payment intent (for custom payment flow)
  createPaymentIntent: async (
    negotiationId: string
  ): Promise<PaymentIntent> => {
    return apiClient.post<PaymentIntent>('/payments/intent', { negotiationId });
  },

  // Get payment status
  getPaymentStatus: async (
    sessionId: string
  ): Promise<{ status: string; transaction?: Transaction }> => {
    return apiClient.get(`/payments/status/${sessionId}`);
  },

  // Get all transactions for current user
  getTransactions: async (
    params: TransactionsParams = {}
  ): Promise<PaginatedResponse<TransactionWithDetails>> => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return apiClient.get<PaginatedResponse<TransactionWithDetails>>(
      `/payments/transactions?${queryParams.toString()}`
    );
  },

  // Get single transaction
  getTransaction: async (id: string): Promise<TransactionWithDetails> => {
    return apiClient.get<TransactionWithDetails>(`/payments/transactions/${id}`);
  },

  // Get payment stats
  getStats: async (): Promise<PaymentStats> => {
    return apiClient.get<PaymentStats>('/payments/stats');
  },

  // Request refund
  requestRefund: async (data: RefundRequest): Promise<Transaction> => {
    return apiClient.post<Transaction>('/payments/refund', data);
  },

  // Get Stripe connect onboarding URL (for sellers)
  getConnectOnboardingUrl: async (): Promise<{ url: string }> => {
    return apiClient.get<{ url: string }>('/payments/connect/onboarding');
  },

  // Check Stripe connect status
  getConnectStatus: async (): Promise<{
    connected: boolean;
    accountId?: string;
    payoutsEnabled: boolean;
  }> => {
    return apiClient.get('/payments/connect/status');
  },

  // Get payout history
  getPayouts: async (
    params: { page?: number; limit?: number } = {}
  ): Promise<
    PaginatedResponse<{
      id: string;
      amount: string;
      currency: string;
      status: string;
      arrivalDate: string;
      createdAt: string;
    }>
  > => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    return apiClient.get(`/payments/payouts?${queryParams.toString()}`);
  },
};
