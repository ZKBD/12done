import { Test, TestingModule } from '@nestjs/testing';
import { AiMaintenanceService } from './ai-maintenance.service';
import { PrismaService } from '@/database';
import {
  MaintenanceRequestType,
  MaintenancePriority,
  ServiceType,
  ServiceProviderStatus,
} from '@prisma/client';

describe('AiMaintenanceService', () => {
  let service: AiMaintenanceService;

  const mockPrismaService = {
    maintenanceRequest: {
      findUnique: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    serviceProvider: {
      findMany: jest.fn(),
    },
  };

  const propertyId = 'property-123';
  const requestId = 'request-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMaintenanceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AiMaintenanceService>(AiMaintenanceService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('analyzeRequest', () => {
    // PROD-107.1: Auto-categorization tests
    describe('category analysis (PROD-107.1)', () => {
      it('should categorize plumbing issues correctly', async () => {
        const result = await service.analyzeRequest(
          'Leaking faucet',
          'The kitchen faucet has been dripping constantly for the past two days.',
        );

        expect(result.category.suggestedType).toBe(MaintenanceRequestType.PLUMBING);
        expect(result.category.typeConfidence).toBeGreaterThan(0);
        expect(result.category.matchedKeywords).toContain('faucet');
        expect(result.category.matchedKeywords).toContain('dripping');
      });

      it('should categorize electrical issues correctly', async () => {
        const result = await service.analyzeRequest(
          'Light not working',
          'The living room light switch is sparking when I turn it on.',
        );

        expect(result.category.suggestedType).toBe(MaintenanceRequestType.ELECTRICAL);
        expect(result.category.matchedKeywords).toContain('light');
        expect(result.category.matchedKeywords).toContain('switch');
        expect(result.category.matchedKeywords).toContain('sparking');
      });

      it('should categorize HVAC issues correctly', async () => {
        const result = await service.analyzeRequest(
          'AC not cooling',
          'The air conditioning unit is not producing cold air. The thermostat shows no temperature change.',
        );

        expect(result.category.suggestedType).toBe(MaintenanceRequestType.HVAC);
        expect(result.category.matchedKeywords).toContain('air conditioning');
      });

      it('should categorize appliance issues correctly', async () => {
        const result = await service.analyzeRequest(
          'Dishwasher broken',
          'The dishwasher is not draining properly and makes strange noises.',
        );

        expect(result.category.suggestedType).toBe(MaintenanceRequestType.APPLIANCE);
        expect(result.category.matchedKeywords).toContain('dishwasher');
      });

      it('should categorize pest control issues correctly', async () => {
        const result = await service.analyzeRequest(
          'Pest problem',
          'I found cockroaches in the kitchen and there seems to be an infestation.',
        );

        expect(result.category.suggestedType).toBe(MaintenanceRequestType.PEST_CONTROL);
        expect(result.category.matchedKeywords).toContain('cockroach');
        expect(result.category.matchedKeywords).toContain('infestation');
      });

      it('should return OTHER for ambiguous requests', async () => {
        const result = await service.analyzeRequest(
          'General issue',
          'Something is wrong with my apartment but I am not sure what it is.',
        );

        expect(result.category.suggestedType).toBe(MaintenanceRequestType.OTHER);
        expect(result.category.typeConfidence).toBeLessThanOrEqual(0.2);
      });
    });

    // PROD-107.2: Priority scoring tests
    describe('priority analysis (PROD-107.2)', () => {
      it('should assign EMERGENCY priority for urgent safety issues', async () => {
        const result = await service.analyzeRequest(
          'Gas leak emergency',
          'I smell gas and this is an emergency. We need help immediately.',
        );

        expect(result.priority.suggestedPriority).toBe(MaintenancePriority.EMERGENCY);
        expect(result.priority.urgencyFactors).toContain('emergency');
        expect(result.priority.urgencyFactors).toContain('gas leak');
        expect(result.priority.priorityConfidence).toBeGreaterThan(0.5);
      });

      it('should assign URGENT priority for significant issues', async () => {
        const result = await service.analyzeRequest(
          'Leak causing damage',
          'The pipe is leaking and water damage is visible. Please fix soon.',
        );

        expect(result.priority.suggestedPriority).toBe(MaintenancePriority.URGENT);
        expect(result.priority.urgencyFactors.length).toBeGreaterThan(0);
      });

      it('should assign NORMAL priority for moderate issues', async () => {
        const result = await service.analyzeRequest(
          'Faucet dripping',
          'The bathroom faucet has a small drip. Not urgent but annoying.',
        );

        expect([MaintenancePriority.NORMAL, MaintenancePriority.LOW]).toContain(
          result.priority.suggestedPriority,
        );
      });

      it('should assign LOW priority for cosmetic issues', async () => {
        const result = await service.analyzeRequest(
          'Minor paint chip',
          'There is a small cosmetic issue with paint on the wall. Can be fixed when convenient.',
        );

        expect(result.priority.suggestedPriority).toBe(MaintenancePriority.LOW);
      });

      it('should boost priority for electrical and structural types', async () => {
        const result = await service.analyzeRequest(
          'Electrical issue',
          'Some electrical outlets in the bedroom are not working.',
        );

        expect(result.priority.urgencyFactors).toContain('safety-related type');
      });
    });

    // PROD-107.3: DIY solutions tests
    describe('DIY solutions (PROD-107.3)', () => {
      it('should provide DIY steps for simple plumbing issues', async () => {
        const result = await service.analyzeRequest(
          'Clogged drain',
          'The bathroom sink drain is clogged and water drains slowly.',
        );

        expect(result.solutions.isDiyPossible).toBe(true);
        expect(result.solutions.diyDifficulty).toBeGreaterThan(0);
        expect(result.solutions.diySteps).toBeDefined();
        expect(result.solutions.diySteps!.length).toBeGreaterThan(0);
        expect(result.solutions.toolsNeeded).toBeDefined();
        expect(result.solutions.toolsNeeded!.length).toBeGreaterThan(0);
      });

      it('should NOT provide DIY steps for electrical issues', async () => {
        const result = await service.analyzeRequest(
          'Electrical problem',
          'The circuit breaker keeps tripping in the kitchen.',
        );

        expect(result.solutions.isDiyPossible).toBe(false);
        expect(result.solutions.diyDifficulty).toBe(5);
        expect(result.solutions.whenToCallProfessional).toContain('licensed electrician');
      });

      it('should NOT provide DIY steps for structural issues', async () => {
        const result = await service.analyzeRequest(
          'Crack in wall',
          'There is a large crack in the ceiling that seems to be growing.',
        );

        expect(result.solutions.isDiyPossible).toBe(false);
        expect(result.solutions.whenToCallProfessional).toContain('professional');
      });

      it('should include estimated time for DIY fixes', async () => {
        const result = await service.analyzeRequest(
          'HVAC filter',
          'The air filter needs replacement and vents need cleaning.',
        );

        expect(result.solutions.estimatedTimeMinutes).toBeGreaterThan(0);
      });

      it('should include when to call professional advice', async () => {
        const result = await service.analyzeRequest(
          'Any issue',
          'Something is wrong with the heating system.',
        );

        expect(result.solutions.whenToCallProfessional).toBeDefined();
        expect(result.solutions.whenToCallProfessional.length).toBeGreaterThan(0);
      });
    });

    // Response structure tests
    describe('response structure', () => {
      it('should include analyzedAt timestamp', async () => {
        const result = await service.analyzeRequest(
          'Test issue',
          'This is a test description for a maintenance request.',
        );

        expect(result.analyzedAt).toBeDefined();
        expect(result.analyzedAt instanceof Date).toBe(true);
      });

      it('should include model version', async () => {
        const result = await service.analyzeRequest(
          'Test issue',
          'This is a test description for a maintenance request.',
        );

        expect(result.modelVersion).toBe('rule-based-v1');
      });
    });
  });

  describe('getRequestSuggestions', () => {
    const mockRequest = {
      id: requestId,
      title: 'Leaking faucet',
      description: 'The kitchen faucet is dripping.',
      type: MaintenanceRequestType.PLUMBING,
      propertyId: propertyId,
      property: { id: propertyId, city: 'Budapest', country: 'HU' },
    };

    it('should return suggestions for an existing request', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: propertyId,
        city: 'Budapest',
        country: 'HU',
      });
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([]);

      const result = await service.getRequestSuggestions(requestId);

      expect(result.requestId).toBe(requestId);
      expect(result.category).toBeDefined();
      expect(result.priority).toBeDefined();
      expect(result.solutions).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should throw error if request not found', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(null);

      await expect(service.getRequestSuggestions(requestId)).rejects.toThrow(
        'Maintenance request not found',
      );
    });

    it('should include appointment suggestions when property is available', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: propertyId,
        city: 'Budapest',
        country: 'HU',
      });
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([]);

      const result = await service.getRequestSuggestions(requestId);

      expect(result.appointments).toBeDefined();
    });
  });

  describe('suggestAppointments', () => {
    const mockProperty = {
      id: propertyId,
      city: 'Budapest',
      country: 'HU',
    };

    const mockProvider = {
      id: 'provider-1',
      status: ServiceProviderStatus.APPROVED,
      serviceType: ServiceType.HANDYMAN,
      serviceArea: { city: 'Budapest' },
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true },
      ],
      reviews: [{ rating: 4.5 }, { rating: 5.0 }],
      user: { name: 'Test Provider' },
    };

    it('should return default suggestions when property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      const result = await service.suggestAppointments(
        propertyId,
        MaintenanceRequestType.PLUMBING,
      );

      expect(result.suggestedSlots).toBeDefined();
      expect(result.suggestedSlots.length).toBeGreaterThan(0);
      expect(result.totalAvailableProviders).toBe(0);
    });

    it('should return default suggestions when no providers available', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([]);

      const result = await service.suggestAppointments(
        propertyId,
        MaintenanceRequestType.PLUMBING,
      );

      expect(result.totalAvailableProviders).toBe(0);
      expect(result.recommendation).toContain('No providers');
    });

    it('should generate slots based on provider availability', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([mockProvider]);

      const result = await service.suggestAppointments(
        propertyId,
        MaintenanceRequestType.PLUMBING,
      );

      expect(result.totalAvailableProviders).toBe(1);
      expect(result.suggestedSlots.length).toBeGreaterThan(0);
      expect(result.averageWaitDays).toBeGreaterThan(0);
    });

    it('should filter providers by service area', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([
        { ...mockProvider, serviceArea: { city: 'Other City' } },
      ]);

      const result = await service.suggestAppointments(
        propertyId,
        MaintenanceRequestType.PLUMBING,
      );

      expect(result.totalAvailableProviders).toBe(0);
    });

    it('should include provider info in appointment slots', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([mockProvider]);

      const result = await service.suggestAppointments(
        propertyId,
        MaintenanceRequestType.PLUMBING,
      );

      const slotsWithProviders = result.suggestedSlots.filter(
        (s) => s.availableProviders && s.availableProviders.length > 0,
      );

      if (slotsWithProviders.length > 0) {
        const slot = slotsWithProviders[0];
        expect(slot.availableProviders![0].providerId).toBe('provider-1');
        expect(slot.availableProviders![0].rating).toBeDefined();
      }
    });

    it('should map CLEANING requests to CLEANER service type', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([
        { ...mockProvider, serviceType: ServiceType.CLEANER },
      ]);

      await service.suggestAppointments(propertyId, MaintenanceRequestType.CLEANING);

      expect(mockPrismaService.serviceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceType: { in: [ServiceType.CLEANER] },
          }),
        }),
      );
    });

    it('should generate recommendation text', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.serviceProvider.findMany.mockResolvedValue([mockProvider]);

      const result = await service.suggestAppointments(
        propertyId,
        MaintenanceRequestType.PLUMBING,
      );

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });
});
