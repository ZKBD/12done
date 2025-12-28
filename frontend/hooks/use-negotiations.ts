'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  negotiationsApi,
  CreateNegotiationDto,
  CreateOfferDto,
  NegotiationsParams,
} from '@/lib/api/negotiations';
import type { NegotiationStatus } from '@/lib/types';

// =============== NEGOTIATIONS ===============

export function useNegotiations(params: NegotiationsParams = {}) {
  return useInfiniteQuery({
    queryKey: ['negotiations', params],
    queryFn: async ({ pageParam = 1 }) => {
      return negotiationsApi.getAll({
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

export function useNegotiation(id: string) {
  return useQuery({
    queryKey: ['negotiation', id],
    queryFn: () => negotiationsApi.getById(id),
    enabled: !!id,
  });
}

export function useNegotiationStats() {
  return useQuery({
    queryKey: ['negotiations', 'stats'],
    queryFn: () => negotiationsApi.getStats(),
  });
}

export function useNegotiationOffers(negotiationId: string) {
  return useQuery({
    queryKey: ['negotiation', negotiationId, 'offers'],
    queryFn: () => negotiationsApi.getOffers(negotiationId),
    enabled: !!negotiationId,
  });
}

export function useCheckExistingNegotiation(propertyId: string) {
  return useQuery({
    queryKey: ['negotiation', 'check', propertyId],
    queryFn: () => negotiationsApi.checkExisting(propertyId),
    enabled: !!propertyId,
  });
}

export function useNegotiationTransaction(negotiationId: string) {
  return useQuery({
    queryKey: ['negotiation', negotiationId, 'transaction'],
    queryFn: () => negotiationsApi.getTransaction(negotiationId),
    enabled: !!negotiationId,
  });
}

// =============== MUTATIONS ===============

export function useCreateNegotiation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateNegotiationDto) => negotiationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast({
        title: 'Offer sent',
        description: 'Your offer has been sent to the property owner.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send offer.',
        variant: 'destructive',
      });
    },
  });
}

export function useMakeOffer(negotiationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateOfferDto) =>
      negotiationsApi.makeOffer(negotiationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
      queryClient.invalidateQueries({
        queryKey: ['negotiation', negotiationId, 'offers'],
      });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast({
        title: 'Counter-offer sent',
        description: 'Your counter-offer has been sent.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send counter-offer.',
        variant: 'destructive',
      });
    },
  });
}

export function useAcceptOffer(negotiationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (offerId: string) =>
      negotiationsApi.acceptOffer(negotiationId, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast({
        title: 'Offer accepted',
        description: 'The offer has been accepted. Proceed to payment.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept offer.',
        variant: 'destructive',
      });
    },
  });
}

export function useRejectOffer(negotiationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason?: string }) =>
      negotiationsApi.rejectOffer(negotiationId, offerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast({
        title: 'Offer rejected',
        description: 'The offer has been rejected.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject offer.',
        variant: 'destructive',
      });
    },
  });
}

export function useWithdrawOffer(negotiationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (offerId: string) =>
      negotiationsApi.withdrawOffer(negotiationId, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
      queryClient.invalidateQueries({
        queryKey: ['negotiation', negotiationId, 'offers'],
      });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast({
        title: 'Offer withdrawn',
        description: 'Your offer has been withdrawn.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to withdraw offer.',
        variant: 'destructive',
      });
    },
  });
}

export function useCancelNegotiation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      negotiationId,
      reason,
    }: {
      negotiationId: string;
      reason?: string;
    }) => negotiationsApi.cancel(negotiationId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['negotiation', variables.negotiationId],
      });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      toast({
        title: 'Negotiation cancelled',
        description: 'The negotiation has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel negotiation.',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkNegotiationAsRead(negotiationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => negotiationsApi.markAsRead(negotiationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    },
  });
}
