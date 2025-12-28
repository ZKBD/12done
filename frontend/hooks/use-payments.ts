'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  paymentsApi,
  CreateCheckoutDto,
  TransactionsParams,
  RefundRequest,
} from '@/lib/api/payments';

// =============== TRANSACTIONS ===============

export function useTransactions(params: TransactionsParams = {}) {
  return useInfiniteQuery({
    queryKey: ['transactions', params],
    queryFn: async ({ pageParam = 1 }) => {
      return paymentsApi.getTransactions({
        ...params,
        page: pageParam,
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

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => paymentsApi.getTransaction(id),
    enabled: !!id,
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ['payments', 'stats'],
    queryFn: () => paymentsApi.getStats(),
  });
}

export function usePaymentStatus(sessionId: string) {
  return useQuery({
    queryKey: ['payment', 'status', sessionId],
    queryFn: () => paymentsApi.getPaymentStatus(sessionId),
    enabled: !!sessionId,
    refetchInterval: (data) => {
      // Keep polling until payment is complete
      if (data?.state?.data?.status === 'complete') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
}

export function useStripeConnectStatus() {
  return useQuery({
    queryKey: ['stripe', 'connect', 'status'],
    queryFn: () => paymentsApi.getConnectStatus(),
  });
}

export function usePayouts(params: { page?: number; limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['payouts', params],
    queryFn: async ({ pageParam = 1 }) => {
      return paymentsApi.getPayouts({
        ...params,
        page: pageParam,
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

// =============== MUTATIONS ===============

export function useCreateCheckout() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCheckoutDto) => paymentsApi.createCheckout(data),
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create checkout session.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreatePaymentIntent() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (negotiationId: string) =>
      paymentsApi.createPaymentIntent(negotiationId),
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize payment.',
        variant: 'destructive',
      });
    },
  });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: RefundRequest) => paymentsApi.requestRefund(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['transaction', variables.transactionId],
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Refund requested',
        description: 'Your refund request has been submitted for review.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to request refund.',
        variant: 'destructive',
      });
    },
  });
}

export function useGetConnectOnboardingUrl() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => paymentsApi.getConnectOnboardingUrl(),
    onSuccess: (data) => {
      // Redirect to Stripe Connect onboarding
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start onboarding.',
        variant: 'destructive',
      });
    },
  });
}
