import { Test, TestingModule } from '@nestjs/testing';
import { ServiceProvidersService } from './service-providers.service';
import { PrismaService } from '@/database';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ServiceType,
  ServiceProviderStatus,
  ServiceRequestStatus,
} from '@prisma/client';

describe('ServiceProvidersService', () => {
  let service: ServiceProvidersService;

  const mockPrismaService: any = {
    serviceProvider: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    providerAvailability: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    availabilityException: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    serviceRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    providerReview: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Set up $transaction to work properly with both array and callback patterns
  mockPrismaService.$transaction = jest.fn((arg: any) => {
    if (typeof arg === 'function') {
      return arg(mockPrismaService);
    }
    // For array of promises, just resolve all
    return Promise.all(arg);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceProvidersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ServiceProvidersService>(ServiceProvidersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('apply', () => {
    const userId = 'user-123';
    const dto = {
      serviceType: ServiceType.LAWYER,
      bio: 'Experienced lawyer',
      qualifications: 'JD from Harvard',
    };

    it('should create a new service provider application', async () => {
      mockPrismaService.serviceProvider.findFirst.mockResolvedValue(null);
      mockPrismaService.serviceProvider.create.mockResolvedValue({
        id: 'provider-123',
        userId,
        ...dto,
        status: ServiceProviderStatus.PENDING,
        profileCompleteness: 40,
        isVerified: false,
        averageRating: 0,
        totalReviews: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      });

      const result = await service.apply(userId, dto);

      expect(result.id).toBe('provider-123');
      expect(result.serviceType).toBe(ServiceType.LAWYER);
      expect(result.status).toBe(ServiceProviderStatus.PENDING);
      expect(mockPrismaService.serviceProvider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            serviceType: ServiceType.LAWYER,
            status: ServiceProviderStatus.PENDING,
          }),
        }),
      );
    });

    it('should throw ConflictException if already applied for this service type', async () => {
      mockPrismaService.serviceProvider.findFirst.mockResolvedValue({
        id: 'existing-provider',
        userId,
        serviceType: ServiceType.LAWYER,
      });

      await expect(service.apply(userId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getProfile', () => {
    it('should return provider profile by ID', async () => {
      const providerId = 'provider-123';
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        userId: 'user-123',
        serviceType: ServiceType.LAWYER,
        status: ServiceProviderStatus.APPROVED,
        bio: 'Test bio',
        profileCompleteness: 50,
        isVerified: true,
        averageRating: 4.5,
        totalReviews: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-123', firstName: 'John', lastName: 'Doe' },
        availability: [],
      });

      const result = await service.getProfile(providerId);

      expect(result.id).toBe(providerId);
      expect(result.serviceType).toBe(ServiceType.LAWYER);
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    const providerId = 'provider-123';
    const userId = 'user-123';
    const dto = { bio: 'Updated bio' };

    it('should update provider profile', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        userId,
        bio: 'Old bio',
      });
      mockPrismaService.serviceProvider.update.mockResolvedValue({
        id: providerId,
        userId,
        bio: 'Updated bio',
        serviceType: ServiceType.LAWYER,
        status: ServiceProviderStatus.APPROVED,
        profileCompleteness: 50,
        isVerified: true,
        averageRating: 4.5,
        totalReviews: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, firstName: 'John', lastName: 'Doe' },
        availability: [],
      });

      const result = await service.updateProfile(providerId, userId, dto);

      expect(result.bio).toBe('Updated bio');
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile(providerId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        userId: 'other-user',
      });

      await expect(service.updateProfile(providerId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('setWeeklyAvailability', () => {
    const providerId = 'provider-123';
    const userId = 'user-123';
    const dto = {
      slots: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
      ],
    };

    it('should set weekly availability', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        userId,
      });

      await service.setWeeklyAvailability(providerId, userId, dto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue(null);

      await expect(service.setWeeklyAvailability(providerId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        userId: 'other-user',
      });

      await expect(service.setWeeklyAvailability(providerId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('checkAvailability', () => {
    const providerId = 'provider-123';

    it('should return available when no exception and weekly slot is available', async () => {
      mockPrismaService.availabilityException.findUnique.mockResolvedValue(null);
      mockPrismaService.providerAvailability.findUnique.mockResolvedValue({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      });

      const result = await service.checkAvailability(providerId, '2024-01-15'); // Monday

      expect(result.available).toBe(true);
    });

    it('should return unavailable when exception marks date unavailable', async () => {
      mockPrismaService.availabilityException.findUnique.mockResolvedValue({
        isAvailable: false,
        reason: 'Holiday',
      });

      const result = await service.checkAvailability(providerId, '2024-12-25');

      expect(result.available).toBe(false);
      expect(result.reason).toBe('Holiday');
    });

    it('should return unavailable when no weekly slot for day', async () => {
      mockPrismaService.availabilityException.findUnique.mockResolvedValue(null);
      mockPrismaService.providerAvailability.findUnique.mockResolvedValue(null);

      const result = await service.checkAvailability(providerId, '2024-01-15');

      expect(result.available).toBe(false);
      expect(result.reason).toBe('Not available on this day of the week');
    });
  });

  describe('createRequest', () => {
    const requesterId = 'user-123';
    const dto = {
      serviceType: ServiceType.LAWYER,
      title: 'Legal help needed',
      description: 'I need help with a property contract review',
    };

    it('should create a service request', async () => {
      mockPrismaService.serviceRequest.create.mockResolvedValue({
        id: 'request-123',
        requesterId,
        ...dto,
        status: ServiceRequestStatus.PENDING,
        currency: 'EUR',
        createdAt: new Date(),
        updatedAt: new Date(),
        requester: { id: requesterId, firstName: 'John', lastName: 'Doe' },
        provider: null,
        property: null,
      });

      const result = await service.createRequest(requesterId, dto);

      expect(result.id).toBe('request-123');
      expect(result.status).toBe(ServiceRequestStatus.PENDING);
    });

    it('should throw NotFoundException if specific provider not found', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.createRequest(requesterId, { ...dto, providerId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if provider is not approved', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: 'provider-123',
        status: ServiceProviderStatus.PENDING,
        serviceType: ServiceType.LAWYER,
      });

      await expect(
        service.createRequest(requesterId, { ...dto, providerId: 'provider-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToRequest', () => {
    const requestId = 'request-123';
    const userId = 'user-123';

    it('should accept a service request', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.PENDING,
        provider: { id: 'provider-123', userId },
      });
      mockPrismaService.serviceRequest.update.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.ACCEPTED,
        respondedAt: new Date(),
        requester: { id: 'requester-123', firstName: 'Jane', lastName: 'Doe' },
        provider: {
          id: 'provider-123',
          userId,
          user: { id: userId, firstName: 'John', lastName: 'Doe' },
        },
        property: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.respondToRequest(requestId, userId, { action: 'accept' });

      expect(result.status).toBe(ServiceRequestStatus.ACCEPTED);
    });

    it('should reject a service request with reason', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.PENDING,
        provider: { id: 'provider-123', userId },
      });
      mockPrismaService.serviceRequest.update.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.REJECTED,
        rejectionReason: 'Too busy',
        respondedAt: new Date(),
        requester: { id: 'requester-123', firstName: 'Jane', lastName: 'Doe' },
        provider: {
          id: 'provider-123',
          userId,
          user: { id: userId, firstName: 'John', lastName: 'Doe' },
        },
        property: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.respondToRequest(requestId, userId, {
        action: 'reject',
        rejectionReason: 'Too busy',
      });

      expect(result.status).toBe(ServiceRequestStatus.REJECTED);
      expect(result.rejectionReason).toBe('Too busy');
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.respondToRequest(requestId, userId, { action: 'accept' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not the assigned provider', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.PENDING,
        provider: { id: 'provider-123', userId: 'other-user' },
      });

      await expect(
        service.respondToRequest(requestId, userId, { action: 'accept' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeRequest', () => {
    const requestId = 'request-123';
    const userId = 'user-123';

    it('should complete a service request', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.IN_PROGRESS,
        provider: { id: 'provider-123', userId },
      });
      mockPrismaService.serviceRequest.update.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.COMPLETED,
        completedAt: new Date(),
        completionNotes: 'All done',
        requester: { id: 'requester-123', firstName: 'Jane', lastName: 'Doe' },
        provider: {
          id: 'provider-123',
          userId,
          user: { id: userId, firstName: 'John', lastName: 'Doe' },
        },
        property: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.completeRequest(requestId, userId, {
        completionNotes: 'All done',
      });

      expect(result.status).toBe(ServiceRequestStatus.COMPLETED);
      expect(result.completionNotes).toBe('All done');
    });

    it('should throw BadRequestException if request not in progress', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: ServiceRequestStatus.ACCEPTED,
        provider: { id: 'provider-123', userId },
      });

      await expect(
        service.completeRequest(requestId, userId, { completionNotes: 'Done' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('search', () => {
    it('should return paginated list of approved providers', async () => {
      const providers = [
        {
          id: 'provider-1',
          serviceType: ServiceType.LAWYER,
          status: ServiceProviderStatus.APPROVED,
          averageRating: 4.5,
          totalReviews: 10,
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          availability: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.serviceProvider.findMany.mockResolvedValue(providers);
      mockPrismaService.serviceProvider.count.mockResolvedValue(1);

      const result = await service.search({
        serviceType: ServiceType.LAWYER,
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.serviceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ServiceProviderStatus.APPROVED,
            serviceType: ServiceType.LAWYER,
          }),
        }),
      );
    });
  });

  describe('adminReview', () => {
    const providerId = 'provider-123';
    const adminId = 'admin-123';

    it('should approve a provider', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        status: ServiceProviderStatus.PENDING,
      });
      mockPrismaService.serviceProvider.update.mockResolvedValue({
        id: providerId,
        status: ServiceProviderStatus.APPROVED,
        isVerified: true,
        verifiedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById: adminId,
        user: { id: 'user-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        availability: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.adminReview(providerId, adminId, { decision: 'approve' });

      expect(result.status).toBe(ServiceProviderStatus.APPROVED);
      expect(result.isVerified).toBe(true);
    });

    it('should reject a provider', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        status: ServiceProviderStatus.PENDING,
      });
      mockPrismaService.serviceProvider.update.mockResolvedValue({
        id: providerId,
        status: ServiceProviderStatus.REJECTED,
        isVerified: false,
        adminNotes: 'Missing documents',
        reviewedAt: new Date(),
        reviewedById: adminId,
        user: { id: 'user-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        availability: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.adminReview(providerId, adminId, {
        decision: 'reject',
        adminNotes: 'Missing documents',
      });

      expect(result.status).toBe(ServiceProviderStatus.REJECTED);
    });

    it('should throw BadRequestException if already reviewed', async () => {
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        id: providerId,
        status: ServiceProviderStatus.APPROVED,
      });

      await expect(
        service.adminReview(providerId, adminId, { decision: 'approve' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createReview', () => {
    const userId = 'user-123';
    const dto = {
      serviceRequestId: 'request-123',
      rating: 5,
      title: 'Excellent service',
      comment: 'Very professional',
    };

    it('should create a review for completed request', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        requesterId: userId,
        status: ServiceRequestStatus.COMPLETED,
        provider: { id: 'provider-123' },
        review: null,
      });
      mockPrismaService.providerReview.create.mockResolvedValue({
        id: 'review-123',
        providerId: 'provider-123',
        reviewerId: userId,
        serviceRequestId: 'request-123',
        rating: 5,
        title: 'Excellent service',
        comment: 'Very professional',
        helpfulCount: 0,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: userId, firstName: 'John', lastName: 'Doe' },
        serviceRequest: { id: 'request-123', title: 'Test', serviceType: ServiceType.LAWYER },
      });
      mockPrismaService.providerReview.aggregate.mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      });
      mockPrismaService.serviceProvider.update.mockResolvedValue({});

      const result = await service.createReview(userId, dto);

      expect(result.id).toBe('review-123');
      expect(result.rating).toBe(5);
    });

    it('should throw BadRequestException if request not completed', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        requesterId: userId,
        status: ServiceRequestStatus.IN_PROGRESS,
        provider: { id: 'provider-123' },
        review: null,
      });

      await expect(service.createReview(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if review already exists', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        requesterId: userId,
        status: ServiceRequestStatus.COMPLETED,
        provider: { id: 'provider-123' },
        review: { id: 'existing-review' },
      });

      await expect(service.createReview(userId, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if not the requester', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue({
        id: 'request-123',
        requesterId: 'other-user',
        status: ServiceRequestStatus.COMPLETED,
        provider: { id: 'provider-123' },
        review: null,
      });

      await expect(service.createReview(userId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getProviderReviews', () => {
    it('should return paginated reviews with stats', async () => {
      const providerId = 'provider-123';
      const reviews = [
        {
          id: 'review-1',
          rating: 5,
          title: 'Great',
          comment: 'Very good service',
          helpfulCount: 5,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          reviewer: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          serviceRequest: { id: 'request-1', title: 'Test', serviceType: ServiceType.LAWYER },
        },
      ];

      mockPrismaService.providerReview.findMany.mockResolvedValue(reviews);
      mockPrismaService.providerReview.count.mockResolvedValue(1);
      mockPrismaService.providerReview.groupBy.mockResolvedValue([{ rating: 5, _count: { rating: 1 } }]);
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue({
        averageRating: 5,
        totalReviews: 1,
      });

      const result = await service.getProviderReviews(providerId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.stats?.averageRating).toBe(5);
      expect(result.stats?.totalReviews).toBe(1);
    });
  });

  describe('markReviewHelpful', () => {
    it('should increment helpful count', async () => {
      const reviewId = 'review-123';
      mockPrismaService.providerReview.findUnique.mockResolvedValue({
        id: reviewId,
        helpfulCount: 5,
      });
      mockPrismaService.providerReview.update.mockResolvedValue({
        id: reviewId,
        helpfulCount: 6,
        rating: 5,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        serviceRequest: { id: 'request-1', title: 'Test', serviceType: ServiceType.LAWYER },
      });

      const result = await service.markReviewHelpful(reviewId);

      expect(result.helpfulCount).toBe(6);
      expect(mockPrismaService.providerReview.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrismaService.providerReview.findUnique.mockResolvedValue(null);

      await expect(service.markReviewHelpful('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
