import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PropertyStatus, ListingType, Prisma } from '@prisma/client';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '@/database';

describe('FavoritesService', () => {
  let service: FavoritesService;
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
    noAgents: true,
    media: [{ url: 'https://example.com/image.jpg' }],
  };

  const mockFavorite = {
    id: 'favorite-123',
    userId: 'user-123',
    propertyId: 'property-123',
    createdAt: new Date(),
    property: mockProperty,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            favoriteProperty: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addFavorite', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addFavorite('property-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.addFavorite('property-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already favorited', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(
        mockFavorite,
      );

      await expect(
        service.addFavorite('property-123', 'user-123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should add favorite successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.favoriteProperty.create as jest.Mock).mockResolvedValue(mockFavorite);

      const result = await service.addFavorite('property-123', 'user-123');

      expect(result.id).toBe(mockFavorite.id);
      expect(result.propertyId).toBe('property-123');
      expect(prismaService.favoriteProperty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-123',
            propertyId: 'property-123',
          },
        }),
      );
    });

    it('should include property details in response', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.favoriteProperty.create as jest.Mock).mockResolvedValue(mockFavorite);

      const result = await service.addFavorite('property-123', 'user-123');

      expect(result.property).toBeDefined();
      expect(result.property!.title).toBe(mockProperty.title);
      expect(result.property!.primaryImageUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('removeFavorite', () => {
    it('should throw NotFoundException if favorite not found', async () => {
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.removeFavorite('property-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove favorite successfully', async () => {
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(
        mockFavorite,
      );
      (prismaService.favoriteProperty.delete as jest.Mock).mockResolvedValue(
        mockFavorite,
      );

      const result = await service.removeFavorite('property-123', 'user-123');

      expect(result.message).toContain('removed');
      expect(prismaService.favoriteProperty.delete).toHaveBeenCalledWith({
        where: {
          userId_propertyId: {
            userId: 'user-123',
            propertyId: 'property-123',
          },
        },
      });
    });
  });

  describe('getFavorites', () => {
    it('should return all favorites for user', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([
        mockFavorite,
      ]);

      const result = await service.getFavorites('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe('property-123');
    });

    it('should filter out deleted properties', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([
        mockFavorite,
        {
          ...mockFavorite,
          id: 'favorite-456',
          propertyId: 'property-456',
          property: {
            ...mockProperty,
            id: 'property-456',
            status: PropertyStatus.DELETED,
          },
        },
      ]);

      const result = await service.getFavorites('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe('property-123');
    });

    it('should return empty array when no favorites', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getFavorites('user-123');

      expect(result).toHaveLength(0);
    });

    it('should order by createdAt desc', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);

      await service.getFavorites('user-123');

      expect(prismaService.favoriteProperty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('isFavorite', () => {
    it('should return true if property is favorited', async () => {
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(
        mockFavorite,
      );

      const result = await service.isFavorite('property-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false if property is not favorited', async () => {
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isFavorite('property-123', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('getFavoriteIds', () => {
    it('should return list of favorite property IDs', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([
        { propertyId: 'property-1' },
        { propertyId: 'property-2' },
        { propertyId: 'property-3' },
      ]);

      const result = await service.getFavoriteIds('user-123');

      expect(result).toHaveLength(3);
      expect(result).toContain('property-1');
      expect(result).toContain('property-2');
      expect(result).toContain('property-3');
    });

    it('should return empty array when no favorites', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getFavoriteIds('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return favorite statistics', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([
        {
          property: { listingTypes: [ListingType.FOR_SALE] },
        },
        {
          property: { listingTypes: [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT] },
        },
        {
          property: { listingTypes: [ListingType.SHORT_TERM_RENT] },
        },
      ]);

      const result = await service.getStats('user-123');

      expect(result.total).toBe(3);
      expect(result.byListingType[ListingType.FOR_SALE]).toBe(2);
      expect(result.byListingType[ListingType.LONG_TERM_RENT]).toBe(1);
      expect(result.byListingType[ListingType.SHORT_TERM_RENT]).toBe(1);
    });

    it('should return zero stats when no favorites', async () => {
      (prismaService.favoriteProperty.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats('user-123');

      expect(result.total).toBe(0);
      expect(result.byListingType).toEqual({});
    });
  });

  describe('toggleFavorite', () => {
    it('should add favorite if not exists', async () => {
      (prismaService.favoriteProperty.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // First call in toggleFavorite
        .mockResolvedValueOnce(null); // Second call in addFavorite check
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.favoriteProperty.create as jest.Mock).mockResolvedValue(mockFavorite);

      const result = await service.toggleFavorite('property-123', 'user-123');

      expect(result.isFavorite).toBe(true);
    });

    it('should remove favorite if exists', async () => {
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(
        mockFavorite,
      );
      (prismaService.favoriteProperty.delete as jest.Mock).mockResolvedValue(
        mockFavorite,
      );

      const result = await service.toggleFavorite('property-123', 'user-123');

      expect(result.isFavorite).toBe(false);
    });
  });

  describe('response mapping', () => {
    it('should correctly map favorite to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.favoriteProperty.create as jest.Mock).mockResolvedValue(mockFavorite);

      const result = await service.addFavorite('property-123', 'user-123');

      expect(result.id).toBe(mockFavorite.id);
      expect(result.propertyId).toBe(mockFavorite.propertyId);
      expect(result.userId).toBe(mockFavorite.userId);
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
      const favoriteWithNulls = {
        ...mockFavorite,
        property: propertyWithNulls,
      };

      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(propertyWithNulls);
      (prismaService.favoriteProperty.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.favoriteProperty.create as jest.Mock).mockResolvedValue(favoriteWithNulls);

      const result = await service.addFavorite('property-123', 'user-123');

      expect(result.property!.squareMeters).toBeUndefined();
      expect(result.property!.bedrooms).toBeUndefined();
      expect(result.property!.bathrooms).toBeUndefined();
      expect(result.property!.primaryImageUrl).toBeUndefined();
    });
  });
});
