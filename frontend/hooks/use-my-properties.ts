'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  myPropertiesApi,
  CreatePropertyDto,
  UpdatePropertyDto,
  MyPropertiesParams,
  UpdateMediaDto,
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  UpdateAvailabilityDto,
} from '@/lib/api/my-properties';
import type { Property, PropertyMedia, PropertyStatus } from '@/lib/types';
import type { AvailabilitySlot, PricingRule } from '@/lib/api/properties';

// =============== MY PROPERTIES ===============

export function useMyProperties(params: MyPropertiesParams = {}) {
  return useInfiniteQuery({
    queryKey: ['my-properties', params],
    queryFn: async ({ pageParam = 1 }) => {
      return myPropertiesApi.getMyProperties({
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

export function usePropertyForEdit(id: string) {
  return useQuery({
    queryKey: ['property', id, 'edit'],
    queryFn: () => myPropertiesApi.getPropertyForEdit(id),
    enabled: !!id,
  });
}

export function usePropertyStats(id: string) {
  return useQuery({
    queryKey: ['property', id, 'stats'],
    queryFn: () => myPropertiesApi.getStats(id),
    enabled: !!id,
  });
}

// =============== PROPERTY CRUD ===============

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePropertyDto) => myPropertiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      toast({
        title: 'Property created',
        description: 'Your property listing has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create property.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProperty(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdatePropertyDto) => myPropertiesApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.setQueryData(['property', id, 'edit'], data);
      toast({
        title: 'Property updated',
        description: 'Your changes have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update property.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => myPropertiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      toast({
        title: 'Property deleted',
        description: 'Your property listing has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete property.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePropertyStatus(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (status: PropertyStatus) =>
      myPropertiesApi.updateStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      toast({
        title: 'Status updated',
        description: `Property is now ${data.status.toLowerCase()}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update property status.',
        variant: 'destructive',
      });
    },
  });
}

export function usePublishProperty(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => myPropertiesApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      toast({
        title: 'Property published',
        description: 'Your property is now live and visible to buyers.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish property.',
        variant: 'destructive',
      });
    },
  });
}

// =============== MEDIA MANAGEMENT ===============

export function useUploadMedia(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      files,
      type = 'photo',
    }: {
      files: File[];
      type?: PropertyMedia['type'];
    }) => myPropertiesApi.uploadMedia(propertyId, files, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast({
        title: 'Upload complete',
        description: 'Media files have been uploaded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload media files.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMedia(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mediaId, data }: { mediaId: string; data: UpdateMediaDto }) =>
      myPropertiesApi.updateMedia(propertyId, mediaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
    },
  });
}

export function useDeleteMedia(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (mediaId: string) =>
      myPropertiesApi.deleteMedia(propertyId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast({
        title: 'Media deleted',
        description: 'The media file has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete media.',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderMedia(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaIds: string[]) =>
      myPropertiesApi.reorderMedia(propertyId, mediaIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
    },
  });
}

export function useSetPrimaryMedia(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (mediaId: string) =>
      myPropertiesApi.setPrimaryMedia(propertyId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      toast({
        title: 'Primary image set',
        description: 'This image will be shown first in listings.',
      });
    },
  });
}

// =============== AVAILABILITY ===============

export function usePropertyAvailability(
  propertyId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['property', propertyId, 'availability', startDate, endDate],
    queryFn: () =>
      myPropertiesApi.getAvailability(propertyId, startDate, endDate),
    enabled: !!propertyId && !!startDate && !!endDate,
  });
}

export function useUpdateAvailability(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateAvailabilityDto) =>
      myPropertiesApi.updateAvailability(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'availability'],
      });
      toast({
        title: 'Availability updated',
        description: 'Your calendar has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update availability.',
        variant: 'destructive',
      });
    },
  });
}

export function useBlockDates(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
      reason,
    }: {
      startDate: string;
      endDate: string;
      reason?: string;
    }) => myPropertiesApi.blockDates(propertyId, startDate, endDate, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'availability'],
      });
      toast({
        title: 'Dates blocked',
        description: 'The selected dates are now unavailable.',
      });
    },
  });
}

export function useUnblockDates(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
    }: {
      startDate: string;
      endDate: string;
    }) => myPropertiesApi.unblockDates(propertyId, startDate, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'availability'],
      });
      toast({
        title: 'Dates unblocked',
        description: 'The selected dates are now available.',
      });
    },
  });
}

// =============== PRICING RULES ===============

export function usePricingRules(propertyId: string) {
  return useQuery({
    queryKey: ['property', propertyId, 'pricing-rules'],
    queryFn: () => myPropertiesApi.getPricingRules(propertyId),
    enabled: !!propertyId,
  });
}

export function useCreatePricingRule(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePricingRuleDto) =>
      myPropertiesApi.createPricingRule(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'pricing-rules'],
      });
      toast({
        title: 'Pricing rule created',
        description: 'Your pricing rule is now active.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create pricing rule.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePricingRule(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: UpdatePricingRuleDto;
    }) => myPropertiesApi.updatePricingRule(propertyId, ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'pricing-rules'],
      });
      toast({
        title: 'Pricing rule updated',
        description: 'Your changes have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pricing rule.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePricingRule(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ruleId: string) =>
      myPropertiesApi.deletePricingRule(propertyId, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'pricing-rules'],
      });
      toast({
        title: 'Pricing rule deleted',
        description: 'The pricing rule has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete pricing rule.',
        variant: 'destructive',
      });
    },
  });
}

// =============== INSPECTION SLOTS ===============

export function useInspectionSlots(
  propertyId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['property', propertyId, 'inspections', startDate, endDate],
    queryFn: () =>
      myPropertiesApi.getInspectionSlots(propertyId, startDate, endDate),
    enabled: !!propertyId,
  });
}

export function useCreateInspectionSlots(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (slots: { startTime: string; endTime: string }[]) =>
      myPropertiesApi.createInspectionSlots(propertyId, slots),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'inspections'],
      });
      toast({
        title: 'Inspection slots created',
        description: 'Your inspection times are now available for booking.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create inspection slots.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInspectionSlot(propertyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (slotId: string) =>
      myPropertiesApi.deleteInspectionSlot(propertyId, slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property', propertyId, 'inspections'],
      });
      toast({
        title: 'Slot removed',
        description: 'The inspection slot has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inspection slot.',
        variant: 'destructive',
      });
    },
  });
}
