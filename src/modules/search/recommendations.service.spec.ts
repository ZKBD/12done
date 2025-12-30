import { Test, TestingModule } from '@nestjs/testing';
import { PropertyStatus, ListingType, Prisma } from '@prisma/client';
import { RecommendationsService } from './recommendations.service';
import { BrowsingHistoryService } from './browsing-history.service';
import { PrismaService } from '@/database';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let browsingHistoryService: jest.Mocked<BrowsingHistoryService>;

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
    _count: { favoritedBy: 5 },
  };

  const mockFavorite = {
    property: {
      city: 'Budapest',
      country: 'HU',
      listingTypes: [ListingType.FOR_SALE],
      basePrice: new Prisma.Decimal('180000'),
      currency: 'EUR',
      squareMeters: 70,
      bedrooms: 2,
      petFriendly: true,
      newlyBuilt: false,
      accessible: false,
    },
  };

  const mockSearchAgent = {
    id: 'agent-123',
    criteria: {
      city: 'Budapest',
      minPrice: 150000,
      maxPrice: 250000,
      minBedrooms: 2,
      petFriendly: true,
    },
    isActive: true,
  };

  const mockViewedProperty = {
    property: {
      id: 'viewed-123',
      city: 'Budapest',
      country: 'HU',
      listingTypes: [ListingType.FOR_SALE],
      basePrice: '190000',
      currency: 'EUR',
      squareMeters: 72,
      bedrooms: 2,
      bathrooms: 1,
      petFriendly: true,
      newlyBuilt: false,
      accessible: false,
    },
    viewCount: 2,
    totalDuration: 120,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            favoriteProperty: {
              findMany: jest.fn(),
            },
            searchAgent: {
              findMany: jest.fn(),
            },
            recommendationFeedback: {
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
        {
          provide: BrowsingHistoryService,
          useValue: {
            getRecentPropertyIds: jest.fn(),
            getViewedPropertiesWithStats: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    prismaService = module.get(PrismaService);
    browsingHistoryService = module.get(BrowsingHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    beforeEach(() => {
      // Setup default mocks
      (browsingHistoryService.getRecentPropertyIds as jest.Mock).mockResolvedValue([]);
      (browsingHistoryService.getViewedPropertiesWithStats as jest.Mock).mockResolvedValue([]);
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.recommendationFeedback.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([mockProperty]);
    });

    it('should return recommendations for user', async () => {
      const result = await service.getRecommendations('user-123', {});

      expect(result).toHaveLength(1);
      expect(result[0].property.id).toBe('property-123');
      expect(result[0].score).toBeDefined();
      expect(result[0].explanation).toBeDefined();
      expect(result[0].matchedCriteria).toBeDefined();
      expect(result[0].confidence).toBeDefined();
    });

    it('should exclude recently viewed properties', async () => {
      (browsingHistoryService.getRecentPropertyIds as jest.Mock).mockResolvedValue([
        'property-123',
      ]);

      const result = await service.getRecommendations('user-123', {});

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['property-123'] },
          }),
        }),
      );
    });

    it('should exclude favorite properties', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock)
        .mockResolvedValueOnce([mockFavorite]) // For extractPreferences
        .mockResolvedValueOnce([{ propertyId: 'property-123' }]); // For getFavoriteIds

      const result = await service.getRecommendations('user-123', {});

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: expect.arrayContaining(['property-123']) },
          }),
        }),
      );
    });

    it('should filter by listing type when specified', async () => {
      await service.getRecommendations('user-123', {
        listingType: ListingType.FOR_SALE,
      });

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingTypes: { has: ListingType.FOR_SALE },
          }),
        }),
      );
    });

    it('should respect limit parameter', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        mockProperty,
        { ...mockProperty, id: 'property-456' },
        { ...mockProperty, id: 'property-789' },
      ]);

      const result = await service.getRecommendations('user-123', { limit: 2 });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minimum confidence', async () => {
      // With no data, confidence is 0
      const result = await service.getRecommendations('user-123', {
        minConfidence: 0.5,
      });

      expect(result).toHaveLength(0);
    });

    it('should exclude properties with negative feedback', async () => {
      (prismaService.recommendationFeedback.findMany as jest.Mock).mockResolvedValue([
        { propertyId: 'property-123' },
      ]);

      const result = await service.getRecommendations('user-123', {});

      expect(result.every((r) => r.property.id !== 'property-123')).toBe(true);
    });
  });

  describe('getSimilarProperties', () => {
    it('should return empty array if source property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getSimilarProperties('property-123', {});

      expect(result).toHaveLength(0);
    });

    it('should return empty array for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      const result = await service.getSimilarProperties('property-123', {});

      expect(result).toHaveLength(0);
    });

    it('should return similar properties', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProperty,
          id: 'similar-123',
          title: 'Similar Property',
        },
      ]);

      const result = await service.getSimilarProperties('property-123', {});

      expect(result).toHaveLength(1);
      expect(result[0].property.id).toBe('similar-123');
      expect(result[0].similarity).toBeDefined();
      expect(result[0].sharedAttributes).toBeDefined();
    });

    it('should include shared attributes in response', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProperty,
          id: 'similar-123',
          city: 'Budapest', // Same city
          bedrooms: 2, // Same bedrooms
        },
      ]);

      const result = await service.getSimilarProperties('property-123', {});

      expect(result[0].sharedAttributes).toContain('Same city: Budapest');
      expect(result[0].sharedAttributes).toContain('2 bedrooms');
    });

    it('should respect limit parameter', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        { ...mockProperty, id: 'similar-1' },
        { ...mockProperty, id: 'similar-2' },
        { ...mockProperty, id: 'similar-3' },
      ]);

      const result = await service.getSimilarProperties('property-123', { limit: 2 });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should sort by similarity score', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProperty,
          id: 'less-similar',
          city: 'Vienna', // Different city
          basePrice: new Prisma.Decimal('500000'), // Different price
        },
        {
          ...mockProperty,
          id: 'more-similar',
          city: 'Budapest', // Same city
          basePrice: new Prisma.Decimal('195000'), // Similar price
        },
      ]);

      const result = await service.getSimilarProperties('property-123', {});

      expect(result[0].property.id).toBe('more-similar');
    });
  });

  describe('submitFeedback', () => {
    it('should create positive feedback', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        userId: 'user-123',
        propertyId: 'property-123',
        isPositive: true,
        createdAt: new Date(),
      };

      (prismaService.recommendationFeedback.upsert as jest.Mock).mockResolvedValue(
        mockFeedback,
      );

      const result = await service.submitFeedback('user-123', 'property-123', true);

      expect(result.id).toBe('feedback-123');
      expect(result.isPositive).toBe(true);
      expect(prismaService.recommendationFeedback.upsert).toHaveBeenCalledWith({
        where: {
          userId_propertyId: {
            userId: 'user-123',
            propertyId: 'property-123',
          },
        },
        update: { isPositive: true },
        create: {
          userId: 'user-123',
          propertyId: 'property-123',
          isPositive: true,
        },
      });
    });

    it('should create negative feedback', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        userId: 'user-123',
        propertyId: 'property-123',
        isPositive: false,
        createdAt: new Date(),
      };

      (prismaService.recommendationFeedback.upsert as jest.Mock).mockResolvedValue(
        mockFeedback,
      );

      const result = await service.submitFeedback('user-123', 'property-123', false);

      expect(result.isPositive).toBe(false);
    });

    it('should update existing feedback', async () => {
      const mockFeedback = {
        id: 'feedback-123',
        userId: 'user-123',
        propertyId: 'property-123',
        isPositive: true,
        createdAt: new Date(),
      };

      (prismaService.recommendationFeedback.upsert as jest.Mock).mockResolvedValue(
        mockFeedback,
      );

      await service.submitFeedback('user-123', 'property-123', true);

      expect(prismaService.recommendationFeedback.upsert).toHaveBeenCalled();
    });
  });

  describe('getUserPreferences', () => {
    it('should extract preferences from favorites', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([
        mockFavorite,
      ]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserPreferences('user-123');

      expect(result.locations?.cities).toContain('Budapest');
      expect(result.locations?.countries).toContain('HU');
      expect(result.priceRange?.min).toBe(180000);
      expect(result.priceRange?.max).toBe(180000);
      expect(result.features).toContain('petFriendly');
      expect(result.dataPoints).toBe(1);
    });

    it('should extract preferences from search agents', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        mockSearchAgent,
      ]);

      const result = await service.getUserPreferences('user-123');

      expect(result.locations?.cities).toContain('Budapest');
      expect(result.priceRange?.min).toBe(150000);
      expect(result.priceRange?.max).toBe(250000);
      expect(result.bedrooms?.min).toBe(2);
      expect(result.features).toContain('petFriendly');
    });

    it('should combine favorites and search agents', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([
        mockFavorite,
      ]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([
        mockSearchAgent,
      ]);

      const result = await service.getUserPreferences('user-123');

      expect(result.dataPoints).toBe(2);
      expect(result.locations?.cities).toContain('Budapest');
    });

    it('should return empty preferences when no data', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserPreferences('user-123');

      expect(result.dataPoints).toBe(0);
      expect(result.priceRange).toBeUndefined();
      expect(result.locations).toBeUndefined();
    });

    it('should extract listing types from favorites', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([
        mockFavorite,
      ]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserPreferences('user-123');

      expect(result.listingTypes).toContain(ListingType.FOR_SALE);
    });
  });

  describe('preference scoring', () => {
    beforeEach(() => {
      (browsingHistoryService.getRecentPropertyIds as jest.Mock).mockResolvedValue([]);
      (browsingHistoryService.getViewedPropertiesWithStats as jest.Mock).mockResolvedValue([]);
      (prismaService.recommendationFeedback.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.favoriteProperty.findMany as jest.Mock)
        .mockResolvedValueOnce([mockFavorite]) // For extractPreferences
        .mockResolvedValueOnce([]); // For getFavoriteIds
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([mockSearchAgent]);
    });

    it('should give higher score to matching location', async () => {
      const matchingProperty = {
        ...mockProperty,
        id: 'matching',
        city: 'Budapest',
      };
      const nonMatchingProperty = {
        ...mockProperty,
        id: 'non-matching',
        city: 'Vienna',
      };

      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        matchingProperty,
        nonMatchingProperty,
      ]);

      const result = await service.getRecommendations('user-123', {});

      const matchingScore = result.find((r) => r.property.id === 'matching')?.score || 0;
      const nonMatchingScore =
        result.find((r) => r.property.id === 'non-matching')?.score || 0;

      expect(matchingScore).toBeGreaterThan(nonMatchingScore);
    });

    it('should give higher score to matching price range', async () => {
      const inRangeProperty = {
        ...mockProperty,
        id: 'in-range',
        basePrice: new Prisma.Decimal('200000'),
      };
      const outOfRangeProperty = {
        ...mockProperty,
        id: 'out-of-range',
        basePrice: new Prisma.Decimal('500000'),
      };

      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        inRangeProperty,
        outOfRangeProperty,
      ]);

      const result = await service.getRecommendations('user-123', {});

      const inRangeScore = result.find((r) => r.property.id === 'in-range')?.score || 0;
      const outOfRangeScore =
        result.find((r) => r.property.id === 'out-of-range')?.score || 0;

      expect(inRangeScore).toBeGreaterThan(outOfRangeScore);
    });
  });

  describe('similarity scoring', () => {
    beforeEach(() => {
      (browsingHistoryService.getRecentPropertyIds as jest.Mock).mockResolvedValue([]);
      (browsingHistoryService.getViewedPropertiesWithStats as jest.Mock).mockResolvedValue([
        mockViewedProperty,
      ]);
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.recommendationFeedback.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should give higher score to properties similar to viewed', async () => {
      const similarProperty = {
        ...mockProperty,
        id: 'similar',
        city: 'Budapest',
        basePrice: new Prisma.Decimal('190000'),
        bedrooms: 2,
      };
      const differentProperty = {
        ...mockProperty,
        id: 'different',
        city: 'Vienna',
        basePrice: new Prisma.Decimal('500000'),
        bedrooms: 5,
      };

      (prismaService.property.findMany as jest.Mock).mockResolvedValue([
        similarProperty,
        differentProperty,
      ]);

      const result = await service.getRecommendations('user-123', {});

      const similarScore = result.find((r) => r.property.id === 'similar')?.score || 0;
      const differentScore = result.find((r) => r.property.id === 'different')?.score || 0;

      expect(similarScore).toBeGreaterThan(differentScore);
    });

    it('should weight by engagement (view count and duration)', async () => {
      (browsingHistoryService.getViewedPropertiesWithStats as jest.Mock).mockResolvedValue([
        {
          ...mockViewedProperty,
          viewCount: 5,
          totalDuration: 300,
        },
      ]);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([mockProperty]);

      const result = await service.getRecommendations('user-123', {});

      // Should have higher confidence with more engagement data
      expect(result[0].confidence).toBeGreaterThan(0);
    });
  });

  describe('explanation generation', () => {
    beforeEach(() => {
      (browsingHistoryService.getRecentPropertyIds as jest.Mock).mockResolvedValue([]);
      (browsingHistoryService.getViewedPropertiesWithStats as jest.Mock).mockResolvedValue([
        mockViewedProperty,
      ]);
      (prismaService.favoriteProperty.findMany as jest.Mock)
        .mockResolvedValueOnce([mockFavorite])
        .mockResolvedValueOnce([]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([mockSearchAgent]);
      (prismaService.recommendationFeedback.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([mockProperty]);
    });

    it('should generate explanation based on location match', async () => {
      const result = await service.getRecommendations('user-123', {});

      expect(result[0].explanation).toBeDefined();
      expect(result[0].matchedCriteria).toContain('Budapest');
    });

    it('should include matched criteria', async () => {
      const result = await service.getRecommendations('user-123', {});

      expect(result[0].matchedCriteria.length).toBeGreaterThan(0);
    });

    it('should include feature matches', async () => {
      const result = await service.getRecommendations('user-123', {});

      expect(result[0].matchedCriteria).toContain('Pet-friendly');
    });
  });

  describe('response mapping', () => {
    beforeEach(() => {
      (browsingHistoryService.getRecentPropertyIds as jest.Mock).mockResolvedValue([]);
      (browsingHistoryService.getViewedPropertiesWithStats as jest.Mock).mockResolvedValue([]);
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.searchAgent.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.recommendationFeedback.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([mockProperty]);
    });

    it('should map property to summary DTO', async () => {
      const result = await service.getRecommendations('user-123', {});

      expect(result[0].property.id).toBe('property-123');
      expect(result[0].property.title).toBe('Beautiful Apartment');
      expect(result[0].property.city).toBe('Budapest');
      expect(result[0].property.country).toBe('HU');
      expect(result[0].property.basePrice).toBe('200000');
      expect(result[0].property.primaryImageUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle null values correctly', async () => {
      const propertyWithNulls = {
        ...mockProperty,
        squareMeters: null,
        bedrooms: null,
        bathrooms: null,
        media: [],
      };
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([propertyWithNulls]);

      const result = await service.getRecommendations('user-123', {});

      expect(result[0].property.squareMeters).toBeUndefined();
      expect(result[0].property.bedrooms).toBeUndefined();
      expect(result[0].property.bathrooms).toBeUndefined();
      expect(result[0].property.primaryImageUrl).toBeUndefined();
    });
  });
});
