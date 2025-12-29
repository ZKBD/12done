import { Test, TestingModule } from '@nestjs/testing';
import { ServiceProvidersController } from './service-providers.controller';
import { ServiceProvidersService } from './service-providers.service';
import {
  ServiceType,
  ServiceProviderStatus,
  ServiceRequestStatus,
} from '@prisma/client';

describe('ServiceProvidersController', () => {
  let controller: ServiceProvidersController;

  const mockServiceProvidersService = {
    apply: jest.fn(),
    getMyProfiles: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    deactivate: jest.fn(),
    setWeeklyAvailability: jest.fn(),
    getWeeklyAvailability: jest.fn(),
    addException: jest.fn(),
    getExceptions: jest.fn(),
    deleteException: jest.fn(),
    checkAvailability: jest.fn(),
    search: jest.fn(),
    findMatchingProviders: jest.fn(),
    createRequest: jest.fn(),
    getMyRequests: jest.fn(),
    getReceivedRequests: jest.fn(),
    getRequest: jest.fn(),
    respondToRequest: jest.fn(),
    startRequest: jest.fn(),
    completeRequest: jest.fn(),
    cancelRequest: jest.fn(),
    adminList: jest.fn(),
    adminReview: jest.fn(),
    adminSuspend: jest.fn(),
    createReview: jest.fn(),
    getMyReviews: jest.fn(),
    getProviderReviews: jest.fn(),
    getReview: jest.fn(),
    updateReview: jest.fn(),
    deleteReview: jest.fn(),
    markReviewHelpful: jest.fn(),
  };

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceProvidersController],
      providers: [
        {
          provide: ServiceProvidersService,
          useValue: mockServiceProvidersService,
        },
      ],
    }).compile();

    controller = module.get<ServiceProvidersController>(ServiceProvidersController);

    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('should call service.apply with correct parameters', async () => {
      const dto = {
        serviceType: ServiceType.LAWYER,
        bio: 'Experienced lawyer',
      };
      const expectedResult = {
        id: 'provider-123',
        ...dto,
        status: ServiceProviderStatus.PENDING,
      };

      mockServiceProvidersService.apply.mockResolvedValue(expectedResult);

      const result = await controller.apply(mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.apply).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('getMyProfiles', () => {
    it('should return user provider profiles', async () => {
      const profiles = [
        { id: 'provider-1', serviceType: ServiceType.LAWYER },
        { id: 'provider-2', serviceType: ServiceType.CLEANER },
      ];

      mockServiceProvidersService.getMyProfiles.mockResolvedValue(profiles);

      const result = await controller.getMyProfiles(mockUser as any);

      expect(result).toEqual(profiles);
      expect(mockServiceProvidersService.getMyProfiles).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getProfile', () => {
    it('should return provider profile by ID', async () => {
      const profile = { id: 'provider-123', serviceType: ServiceType.LAWYER };

      mockServiceProvidersService.getProfile.mockResolvedValue(profile);

      const result = await controller.getProfile('provider-123');

      expect(result).toEqual(profile);
      expect(mockServiceProvidersService.getProfile).toHaveBeenCalledWith('provider-123');
    });
  });

  describe('updateProfile', () => {
    it('should update provider profile', async () => {
      const dto = { bio: 'Updated bio' };
      const expectedResult = { id: 'provider-123', bio: 'Updated bio' };

      mockServiceProvidersService.updateProfile.mockResolvedValue(expectedResult);

      const result = await controller.updateProfile('provider-123', mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.updateProfile).toHaveBeenCalledWith(
        'provider-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('setWeeklyAvailability', () => {
    it('should set weekly availability', async () => {
      const dto = {
        slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      };

      mockServiceProvidersService.setWeeklyAvailability.mockResolvedValue(undefined);

      await controller.setWeeklyAvailability('provider-123', mockUser as any, dto);

      expect(mockServiceProvidersService.setWeeklyAvailability).toHaveBeenCalledWith(
        'provider-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('checkAvailability', () => {
    it('should check availability', async () => {
      const expectedResult = { available: true };

      mockServiceProvidersService.checkAvailability.mockResolvedValue(expectedResult);

      const result = await controller.checkAvailability('provider-123', '2024-01-15', '09:00-12:00');

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.checkAvailability).toHaveBeenCalledWith(
        'provider-123',
        '2024-01-15',
        '09:00-12:00',
      );
    });
  });

  describe('search', () => {
    it('should search for providers', async () => {
      const query = { serviceType: ServiceType.LAWYER, page: 1, limit: 20 };
      const expectedResult = {
        data: [{ id: 'provider-1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockServiceProvidersService.search.mockResolvedValue(expectedResult);

      const result = await controller.search(query);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.search).toHaveBeenCalledWith(query);
    });
  });

  describe('findMatchingProviders', () => {
    it('should find matching providers', async () => {
      const providers = [{ id: 'provider-1', serviceType: ServiceType.LAWYER }];

      mockServiceProvidersService.findMatchingProviders.mockResolvedValue(providers);

      const result = await controller.findMatchingProviders(
        ServiceType.LAWYER,
        'Budapest',
        'HU',
        '2024-01-15',
      );

      expect(result).toEqual(providers);
      expect(mockServiceProvidersService.findMatchingProviders).toHaveBeenCalledWith(
        ServiceType.LAWYER,
        'Budapest',
        'HU',
        '2024-01-15',
      );
    });
  });

  describe('createRequest', () => {
    it('should create a service request', async () => {
      const dto = {
        serviceType: ServiceType.LAWYER,
        title: 'Need legal help',
        description: 'Property contract review needed',
      };
      const expectedResult = {
        id: 'request-123',
        ...dto,
        status: ServiceRequestStatus.PENDING,
      };

      mockServiceProvidersService.createRequest.mockResolvedValue(expectedResult);

      const result = await controller.createRequest(mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.createRequest).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('respondToRequest', () => {
    it('should respond to a request', async () => {
      const dto = { action: 'accept' as const };
      const expectedResult = {
        id: 'request-123',
        status: ServiceRequestStatus.ACCEPTED,
      };

      mockServiceProvidersService.respondToRequest.mockResolvedValue(expectedResult);

      const result = await controller.respondToRequest('request-123', mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.respondToRequest).toHaveBeenCalledWith(
        'request-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('completeRequest', () => {
    it('should complete a request', async () => {
      const dto = { completionNotes: 'All done' };
      const expectedResult = {
        id: 'request-123',
        status: ServiceRequestStatus.COMPLETED,
        completionNotes: 'All done',
      };

      mockServiceProvidersService.completeRequest.mockResolvedValue(expectedResult);

      const result = await controller.completeRequest('request-123', mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.completeRequest).toHaveBeenCalledWith(
        'request-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('adminReview', () => {
    it('should review a provider', async () => {
      const dto = { decision: 'approve' as const };
      const expectedResult = {
        id: 'provider-123',
        status: ServiceProviderStatus.APPROVED,
      };

      mockServiceProvidersService.adminReview.mockResolvedValue(expectedResult);

      const result = await controller.adminReview('provider-123', mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.adminReview).toHaveBeenCalledWith(
        'provider-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('adminSuspend', () => {
    it('should suspend a provider', async () => {
      const body = { reason: 'Policy violation' };
      const expectedResult = {
        id: 'provider-123',
        status: ServiceProviderStatus.SUSPENDED,
      };

      mockServiceProvidersService.adminSuspend.mockResolvedValue(expectedResult);

      const result = await controller.adminSuspend('provider-123', mockUser as any, body);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.adminSuspend).toHaveBeenCalledWith(
        'provider-123',
        mockUser.id,
        'Policy violation',
      );
    });
  });

  describe('createReview', () => {
    it('should create a review', async () => {
      const dto = {
        serviceRequestId: 'request-123',
        rating: 5,
        title: 'Great service',
        comment: 'Very professional',
      };
      const expectedResult = {
        id: 'review-123',
        ...dto,
        helpfulCount: 0,
        isPublic: true,
      };

      mockServiceProvidersService.createReview.mockResolvedValue(expectedResult);

      const result = await controller.createReview(mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.createReview).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('getProviderReviews', () => {
    it('should get provider reviews', async () => {
      const query = { page: 1, limit: 20 };
      const expectedResult = {
        data: [{ id: 'review-1', rating: 5 }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        stats: { averageRating: 5, totalReviews: 1, ratingDistribution: {} },
      };

      mockServiceProvidersService.getProviderReviews.mockResolvedValue(expectedResult);

      const result = await controller.getProviderReviews('provider-123', query);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.getProviderReviews).toHaveBeenCalledWith(
        'provider-123',
        query,
      );
    });
  });

  describe('updateReview', () => {
    it('should update a review', async () => {
      const dto = { rating: 4, comment: 'Updated comment' };
      const expectedResult = { id: 'review-123', ...dto };

      mockServiceProvidersService.updateReview.mockResolvedValue(expectedResult);

      const result = await controller.updateReview('review-123', mockUser as any, dto);

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.updateReview).toHaveBeenCalledWith(
        'review-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('deleteReview', () => {
    it('should delete a review', async () => {
      mockServiceProvidersService.deleteReview.mockResolvedValue(undefined);

      await controller.deleteReview('review-123', mockUser as any);

      expect(mockServiceProvidersService.deleteReview).toHaveBeenCalledWith(
        'review-123',
        mockUser.id,
      );
    });
  });

  describe('markReviewHelpful', () => {
    it('should mark review as helpful', async () => {
      const expectedResult = { id: 'review-123', helpfulCount: 6 };

      mockServiceProvidersService.markReviewHelpful.mockResolvedValue(expectedResult);

      const result = await controller.markReviewHelpful('review-123');

      expect(result).toEqual(expectedResult);
      expect(mockServiceProvidersService.markReviewHelpful).toHaveBeenCalledWith('review-123');
    });
  });
});
