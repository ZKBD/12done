import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PropertyStatus, ListingType, Prisma } from '@prisma/client';
import { BrowsingHistoryService } from './browsing-history.service';
import { PrismaService } from '@/database';

describe('BrowsingHistoryService', () => {
  let service: BrowsingHistoryService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProperty = {
    id: 'property-123',
    title: 'Beautiful Apartment',
    city: 'Budapest',
    country: 'HU',
    listingTypes: [ListingType.FOR_SALE],
    basePrice: new Prisma.Decimal('200000'),
    currency: 'EUR',
    squareMeters: 75,
    bedrooms: 2,
    bathrooms: 1,
    status: PropertyStatus.ACTIVE,
    petFriendly: true,
    newlyBuilt: false,
    accessible: false,
    media: [{ url: 'https://example.com/image.jpg' }],
  };

  const mockHistory = {
    id: 'history-123',
    userId: 'user-123',
    propertyId: 'property-123',
    viewedAt: new Date(),
    duration: 60,
    property: mockProperty,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrowsingHistoryService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            browsingHistory: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BrowsingHistoryService>(BrowsingHistoryService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackView', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.trackView('user-123', 'property-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.trackView('user-123', 'property-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create history entry successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.browsingHistory.create as jest.Mock).mockResolvedValue(mockHistory);

      const result = await service.trackView('user-123', 'property-123', 60);

      expect(result.id).toBe(mockHistory.id);
      expect(result.propertyId).toBe('property-123');
      expect(result.userId).toBe('user-123');
      expect(prismaService.browsingHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-123',
            propertyId: 'property-123',
            duration: 60,
          },
        }),
      );
    });

    it('should include property details in response', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.browsingHistory.create as jest.Mock).mockResolvedValue(mockHistory);

      const result = await service.trackView('user-123', 'property-123');

      expect(result.property).toBeDefined();
      expect(result.property!.title).toBe(mockProperty.title);
      expect(result.property!.primaryImageUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle undefined duration', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.browsingHistory.create as jest.Mock).mockResolvedValue({
        ...mockHistory,
        duration: null,
      });

      const result = await service.trackView('user-123', 'property-123');

      expect(result.duration).toBeUndefined();
    });
  });

  describe('updateViewDuration', () => {
    it('should throw NotFoundException if history entry not found', async () => {
      (prismaService.browsingHistory.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateViewDuration('history-123', 'user-123', 120),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update duration successfully', async () => {
      (prismaService.browsingHistory.findFirst as jest.Mock).mockResolvedValue(mockHistory);
      (prismaService.browsingHistory.update as jest.Mock).mockResolvedValue({
        ...mockHistory,
        duration: 120,
      });

      const result = await service.updateViewDuration('history-123', 'user-123', 120);

      expect(result.duration).toBe(120);
      expect(prismaService.browsingHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'history-123' },
          data: { duration: 120 },
        }),
      );
    });
  });

  describe('getHistory', () => {
    it('should return all history for user', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([mockHistory]);

      const result = await service.getHistory('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe('property-123');
    });

    it('should filter out deleted properties', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([
        mockHistory,
        {
          ...mockHistory,
          id: 'history-456',
          propertyId: 'property-456',
          property: {
            ...mockProperty,
            id: 'property-456',
            status: PropertyStatus.DELETED,
          },
        },
      ]);

      const result = await service.getHistory('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe('property-123');
    });

    it('should order by viewedAt desc', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([]);

      await service.getHistory('user-123');

      expect(prismaService.browsingHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewedAt: 'desc' },
        }),
      );
    });

    it('should respect limit parameter', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([]);

      await service.getHistory('user-123', 10);

      expect(prismaService.browsingHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should use default limit of 50', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([]);

      await service.getHistory('user-123');

      expect(prismaService.browsingHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });
  });

  describe('getRecentViews', () => {
    it('should return views within specified days', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([mockHistory]);

      const result = await service.getRecentViews('user-123', 7);

      expect(result).toHaveLength(1);
      expect(prismaService.browsingHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            viewedAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter out deleted properties', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([
        mockHistory,
        {
          ...mockHistory,
          id: 'history-456',
          propertyId: 'property-456',
          property: {
            ...mockProperty,
            id: 'property-456',
            status: PropertyStatus.DELETED,
          },
        },
      ]);

      const result = await service.getRecentViews('user-123');

      expect(result).toHaveLength(1);
    });

    it('should use default of 30 days', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentViews('user-123');

      const callArg = (prismaService.browsingHistory.findMany as jest.Mock).mock.calls[0][0];
      const cutoffDate = callArg.where.viewedAt.gte as Date;
      const daysDiff = Math.round((Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(30);
    });
  });

  describe('getRecentPropertyIds', () => {
    it('should return unique property IDs', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([
        { propertyId: 'property-1' },
        { propertyId: 'property-2' },
        { propertyId: 'property-3' },
      ]);

      const result = await service.getRecentPropertyIds('user-123');

      expect(result).toHaveLength(3);
      expect(result).toContain('property-1');
      expect(result).toContain('property-2');
      expect(result).toContain('property-3');
    });

    it('should return empty array when no history', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentPropertyIds('user-123');

      expect(result).toHaveLength(0);
    });

    it('should use distinct propertyId', async () => {
      (prismaService.browsingHistory.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentPropertyIds('user-123');

      expect(prismaService.browsingHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['propertyId'],
        }),
      );
    });
  });

  describe('getViewedPropertiesWithStats', () => {
    it('should return aggregated stats', async () => {
      (prismaService.browsingHistory.groupBy as jest.Mock).mockResolvedValue([
        {
          propertyId: 'property-123',
          _count: { id: 3 },
          _sum: { duration: 180 },
          _max: { viewedAt: new Date() },
        },
      ]);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([mockProperty]);

      const result = await service.getViewedPropertiesWithStats('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe('property-123');
      expect(result[0].viewCount).toBe(3);
      expect(result[0].totalDuration).toBe(180);
    });

    it('should return empty array when no stats', async () => {
      (prismaService.browsingHistory.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getViewedPropertiesWithStats('user-123');

      expect(result).toHaveLength(0);
    });

    it('should handle null duration sum', async () => {
      (prismaService.browsingHistory.groupBy as jest.Mock).mockResolvedValue([
        {
          propertyId: 'property-123',
          _count: { id: 1 },
          _sum: { duration: null },
          _max: { viewedAt: new Date() },
        },
      ]);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([mockProperty]);

      const result = await service.getViewedPropertiesWithStats('user-123');

      expect(result[0].totalDuration).toBe(0);
    });

    it('should filter out deleted properties', async () => {
      (prismaService.browsingHistory.groupBy as jest.Mock).mockResolvedValue([
        {
          propertyId: 'property-123',
          _count: { id: 1 },
          _sum: { duration: 60 },
          _max: { viewedAt: new Date() },
        },
        {
          propertyId: 'property-456',
          _count: { id: 1 },
          _sum: { duration: 30 },
          _max: { viewedAt: new Date() },
        },
      ]);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([mockProperty]);

      const result = await service.getViewedPropertiesWithStats('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe('property-123');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history for user', async () => {
      (prismaService.browsingHistory.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.clearHistory('user-123');

      expect(result.count).toBe(5);
      expect(prismaService.browsingHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should return zero count when no history to clear', async () => {
      (prismaService.browsingHistory.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.clearHistory('user-123');

      expect(result.count).toBe(0);
    });
  });

  describe('deleteEntry', () => {
    it('should throw NotFoundException if entry not found', async () => {
      (prismaService.browsingHistory.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteEntry('history-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete entry successfully', async () => {
      (prismaService.browsingHistory.findFirst as jest.Mock).mockResolvedValue(mockHistory);
      (prismaService.browsingHistory.delete as jest.Mock).mockResolvedValue(mockHistory);

      const result = await service.deleteEntry('history-123', 'user-123');

      expect(result.message).toContain('deleted');
      expect(prismaService.browsingHistory.delete).toHaveBeenCalledWith({
        where: { id: 'history-123' },
      });
    });

    it('should not allow deleting another user\'s history', async () => {
      (prismaService.browsingHistory.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteEntry('history-123', 'other-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('response mapping', () => {
    it('should correctly map history to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.browsingHistory.create as jest.Mock).mockResolvedValue(mockHistory);

      const result = await service.trackView('user-123', 'property-123', 60);

      expect(result.id).toBe(mockHistory.id);
      expect(result.propertyId).toBe(mockHistory.propertyId);
      expect(result.userId).toBe(mockHistory.userId);
      expect(result.viewedAt).toEqual(mockHistory.viewedAt);
      expect(result.duration).toBe(60);
      expect(result.property!.basePrice).toBe('200000');
      expect(result.property!.primaryImageUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle null values correctly', async () => {
      const propertyWithNulls = {
        ...mockProperty,
        squareMeters: null,
        bedrooms: null,
        bathrooms: null,
        media: [],
      };
      const historyWithNulls = {
        ...mockHistory,
        duration: null,
        property: propertyWithNulls,
      };

      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(propertyWithNulls);
      (prismaService.browsingHistory.create as jest.Mock).mockResolvedValue(historyWithNulls);

      const result = await service.trackView('user-123', 'property-123');

      expect(result.duration).toBeUndefined();
      expect(result.property!.squareMeters).toBeUndefined();
      expect(result.property!.bedrooms).toBeUndefined();
      expect(result.property!.bathrooms).toBeUndefined();
      expect(result.property!.primaryImageUrl).toBeUndefined();
    });
  });
});
