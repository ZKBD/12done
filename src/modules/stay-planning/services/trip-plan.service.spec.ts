import { Test, TestingModule } from '@nestjs/testing';
import { TripPlanService } from './trip-plan.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TripPlanStatus, AttractionCategory } from '../dto';

describe('TripPlanService', () => {
  let service: TripPlanService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';
  const mockTripPlanId = 'trip-123';
  const mockPropertyId = 'property-123';
  const mockDayId = 'day-123';
  const mockActivityId = 'activity-123';

  const mockTripPlan = {
    id: mockTripPlanId,
    userId: mockUserId,
    propertyId: mockPropertyId,
    sessionId: null,
    title: 'Barcelona Trip',
    description: 'Summer vacation in Barcelona',
    startDate: new Date('2024-12-15'),
    endDate: new Date('2024-12-20'),
    totalBudget: 2000,
    currency: 'EUR',
    status: TripPlanStatus.DRAFT,
    days: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDay = {
    id: mockDayId,
    tripPlanId: mockTripPlanId,
    date: new Date('2024-12-15'),
    dayNumber: 1,
    title: 'Arrival Day',
    notes: null,
    activities: [],
    createdAt: new Date(),
  };

  const mockActivity = {
    id: mockActivityId,
    dayId: mockDayId,
    title: 'Visit Sagrada Familia',
    description: 'Tour of the famous basilica',
    startTime: '10:00',
    endTime: '12:00',
    location: 'Sagrada Familia',
    address: 'Carrer de Mallorca, 401',
    latitude: 41.4036,
    longitude: 2.1744,
    estimatedCost: 26,
    category: AttractionCategory.MONUMENT,
    attractionId: null,
    bookingId: null,
    notes: null,
    order: 0,
    isCompleted: false,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    tripPlan: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tripDay: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tripActivity: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    stayPlanningSession: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripPlanService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TripPlanService>(TripPlanService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createTripPlan', () => {
    it('should create a new trip plan', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({ id: mockPropertyId });
      mockPrismaService.tripPlan.create.mockResolvedValue({
        ...mockTripPlan,
        days: [],
      });

      const result = await service.createTripPlan(mockUserId, {
        title: 'Barcelona Trip',
        propertyId: mockPropertyId,
        startDate: '2024-12-15',
        endDate: '2024-12-20',
      });

      expect(result.id).toBe(mockTripPlanId);
      expect(result.title).toBe('Barcelona Trip');
    });

    it('should throw NotFoundException for invalid property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.createTripPlan(mockUserId, {
          title: 'Test',
          propertyId: 'invalid',
          startDate: '2024-12-15',
          endDate: '2024-12-20',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate date range', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({ id: mockPropertyId });

      await expect(
        service.createTripPlan(mockUserId, {
          title: 'Test',
          propertyId: mockPropertyId,
          startDate: '2024-12-20',
          endDate: '2024-12-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create trip plan with days and activities', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({ id: mockPropertyId });
      mockPrismaService.tripPlan.create.mockResolvedValue({
        ...mockTripPlan,
        days: [{ ...mockDay, activities: [mockActivity] }],
      });

      const result = await service.createTripPlan(mockUserId, {
        title: 'Barcelona Trip',
        propertyId: mockPropertyId,
        startDate: '2024-12-15',
        endDate: '2024-12-20',
        days: [
          {
            date: '2024-12-15',
            activities: [{ title: 'Visit Sagrada Familia' }],
          },
        ],
      });

      expect(result.days).toHaveLength(1);
      expect(result.days[0].activities).toHaveLength(1);
    });
  });

  describe('getTripPlan', () => {
    it('should return trip plan by ID', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue({
        ...mockTripPlan,
        days: [],
      });

      const result = await service.getTripPlan(mockUserId, mockTripPlanId);

      expect(result.id).toBe(mockTripPlanId);
    });

    it('should throw NotFoundException for invalid trip plan', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.getTripPlan(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserTripPlans', () => {
    it('should return all user trip plans', async () => {
      mockPrismaService.tripPlan.findMany.mockResolvedValue([
        { ...mockTripPlan, days: [] },
      ]);

      const result = await service.getUserTripPlans(mockUserId);

      expect(result).toHaveLength(1);
    });

    it('should filter by property ID', async () => {
      mockPrismaService.tripPlan.findMany.mockResolvedValue([]);

      await service.getUserTripPlans(mockUserId, { propertyId: mockPropertyId });

      expect(mockPrismaService.tripPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ propertyId: mockPropertyId }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.tripPlan.findMany.mockResolvedValue([]);

      await service.getUserTripPlans(mockUserId, { status: TripPlanStatus.ACTIVE });

      expect(mockPrismaService.tripPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: TripPlanStatus.ACTIVE }),
        }),
      );
    });
  });

  describe('updateTripPlan', () => {
    it('should update trip plan', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue(mockTripPlan);
      mockPrismaService.tripPlan.update.mockResolvedValue({
        ...mockTripPlan,
        title: 'Updated Title',
        days: [],
      });

      const result = await service.updateTripPlan(mockUserId, mockTripPlanId, {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException for invalid trip plan', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTripPlan(mockUserId, 'invalid', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTripPlan', () => {
    it('should delete trip plan', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue(mockTripPlan);
      mockPrismaService.tripPlan.delete.mockResolvedValue(mockTripPlan);

      await expect(
        service.deleteTripPlan(mockUserId, mockTripPlanId),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException for invalid trip plan', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTripPlan(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addDay', () => {
    it('should add day to trip plan', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue({
        ...mockTripPlan,
        days: [],
      });
      mockPrismaService.tripDay.create.mockResolvedValue({
        ...mockDay,
        activities: [],
      });

      const result = await service.addDay(mockUserId, mockTripPlanId, {
        date: '2024-12-15',
      });

      expect(result.dayNumber).toBe(1);
    });

    it('should throw NotFoundException for invalid trip plan', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.addDay(mockUserId, 'invalid', { date: '2024-12-15' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDay', () => {
    it('should update day', async () => {
      mockPrismaService.tripDay.findUnique.mockResolvedValue({
        ...mockDay,
        tripPlan: { userId: mockUserId },
      });
      mockPrismaService.tripDay.update.mockResolvedValue({
        ...mockDay,
        title: 'Updated Day',
        activities: [],
      });

      const result = await service.updateDay(mockUserId, mockDayId, {
        title: 'Updated Day',
      });

      expect(result.title).toBe('Updated Day');
    });

    it('should throw NotFoundException for wrong user', async () => {
      mockPrismaService.tripDay.findUnique.mockResolvedValue({
        ...mockDay,
        tripPlan: { userId: 'other-user' },
      });

      await expect(
        service.updateDay(mockUserId, mockDayId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDay', () => {
    it('should delete day', async () => {
      mockPrismaService.tripDay.findUnique.mockResolvedValue({
        ...mockDay,
        tripPlan: { userId: mockUserId },
      });
      mockPrismaService.tripDay.delete.mockResolvedValue(mockDay);

      await expect(
        service.deleteDay(mockUserId, mockDayId),
      ).resolves.not.toThrow();
    });
  });

  describe('addActivity', () => {
    it('should add activity to day', async () => {
      mockPrismaService.tripDay.findUnique.mockResolvedValue({
        ...mockDay,
        tripPlan: { userId: mockUserId },
        activities: [],
      });
      mockPrismaService.tripActivity.create.mockResolvedValue(mockActivity);

      const result = await service.addActivity(mockUserId, mockDayId, {
        title: 'Visit Sagrada Familia',
      });

      expect(result.title).toBe('Visit Sagrada Familia');
    });

    it('should throw NotFoundException for wrong user', async () => {
      mockPrismaService.tripDay.findUnique.mockResolvedValue({
        ...mockDay,
        tripPlan: { userId: 'other-user' },
      });

      await expect(
        service.addActivity(mockUserId, mockDayId, { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateActivity', () => {
    it('should update activity', async () => {
      mockPrismaService.tripActivity.findUnique.mockResolvedValue({
        ...mockActivity,
        day: { tripPlan: { userId: mockUserId } },
      });
      mockPrismaService.tripActivity.update.mockResolvedValue({
        ...mockActivity,
        isCompleted: true,
      });

      const result = await service.updateActivity(mockUserId, mockActivityId, {
        isCompleted: true,
      });

      expect(result.isCompleted).toBe(true);
    });
  });

  describe('deleteActivity', () => {
    it('should delete activity', async () => {
      mockPrismaService.tripActivity.findUnique.mockResolvedValue({
        ...mockActivity,
        day: { tripPlan: { userId: mockUserId } },
      });
      mockPrismaService.tripActivity.delete.mockResolvedValue(mockActivity);

      await expect(
        service.deleteActivity(mockUserId, mockActivityId),
      ).resolves.not.toThrow();
    });
  });

  describe('reorderActivities', () => {
    it('should reorder activities', async () => {
      mockPrismaService.tripDay.findUnique.mockResolvedValueOnce({
        ...mockDay,
        tripPlan: { userId: mockUserId },
        activities: [mockActivity, { ...mockActivity, id: 'activity-2' }],
      });
      mockPrismaService.tripActivity.update.mockResolvedValue(mockActivity);
      mockPrismaService.tripDay.findUnique.mockResolvedValueOnce({
        ...mockDay,
        activities: [{ ...mockActivity, id: 'activity-2' }, mockActivity],
      });

      const result = await service.reorderActivities(mockUserId, mockDayId, [
        'activity-2',
        mockActivityId,
      ]);

      expect(result.activities).toHaveLength(2);
    });
  });

  describe('getTripPlanStats', () => {
    it('should return trip plan statistics', async () => {
      mockPrismaService.tripPlan.findFirst.mockResolvedValue({
        ...mockTripPlan,
        days: [
          {
            ...mockDay,
            activities: [
              { ...mockActivity, estimatedCost: 26 },
              { ...mockActivity, id: 'act-2', estimatedCost: 50, isCompleted: true },
            ],
          },
        ],
      });

      const result = await service.getTripPlanStats(mockUserId, mockTripPlanId);

      expect(result.totalDays).toBe(1);
      expect(result.totalActivities).toBe(2);
      expect(result.completedActivities).toBe(1);
      expect(result.estimatedTotalCost).toBe(76);
    });
  });
});
