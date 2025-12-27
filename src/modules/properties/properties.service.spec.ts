import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PropertyStatus, UserRole, ListingType, EnergyEfficiencyRating, Prisma } from '@prisma/client';
import { PropertiesService } from './properties.service';
import { PrismaService } from '@/database';
import { SearchAgentsService } from '../search/search-agents.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prismaService: jest.Mocked<PrismaService>;
  let searchAgentsService: jest.Mocked<SearchAgentsService>;

  const mockOwner = {
    id: 'owner-123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+36201234567',
    emailVerified: true,
    idVerificationStatus: 'VERIFIED',
  };

  const mockProperty = {
    id: 'property-123',
    ownerId: 'owner-123',
    owner: mockOwner,
    address: '123 Test Street',
    postalCode: '1051',
    city: 'Budapest',
    country: 'HU',
    latitude: 47.4979,
    longitude: 19.0402,
    title: 'Beautiful Apartment',
    description: 'A lovely apartment in the city center',
    aiGeneratedDescription: null,
    descriptionTone: null,
    listingTypes: [ListingType.FOR_SALE],
    basePrice: new Prisma.Decimal('200000'),
    currency: 'EUR',
    priceNegotiable: true,
    negotiabilityRange: new Prisma.Decimal('10'),
    dynamicPricingEnabled: false,
    squareMeters: 75,
    lotSize: null,
    bedrooms: 2,
    bathrooms: 1,
    floors: 1,
    yearBuilt: 2010,
    energyEfficiency: EnergyEfficiencyRating.B,
    energyCertificateUrl: null,
    hoaFees: new Prisma.Decimal('150'),
    hoaInfo: null,
    petFriendly: true,
    newlyBuilt: false,
    accessible: false,
    noAgents: true,
    status: PropertyStatus.ACTIVE,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    media: [],
    floorPlans: [],
    _count: { favoritedBy: 5 },
  };

  const createQueryDto = (overrides = {}) => {
    const dto = {
      page: 1,
      limit: 20,
      get skip() {
        return (this.page - 1) * this.limit;
      },
      get take() {
        return this.limit;
      },
      ...overrides,
    };
    return dto;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: SearchAgentsService,
          useValue: {
            checkAgainstNewProperty: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prismaService = module.get(PrismaService);
    searchAgentsService = module.get(SearchAgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      address: '123 Test Street',
      postalCode: '1051',
      city: 'Budapest',
      country: 'hu',
      title: 'Beautiful Apartment',
      listingTypes: [ListingType.FOR_SALE],
      basePrice: '200000',
    };

    it('should create a property successfully', async () => {
      (prismaService.property.create as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
      });

      const result = await service.create(createDto, 'owner-123');

      expect(result.id).toBe(mockProperty.id);
      expect(result.status).toBe(PropertyStatus.DRAFT);
      expect(prismaService.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'owner-123',
            country: 'HU', // Should be uppercased
            status: PropertyStatus.DRAFT,
          }),
        }),
      );
    });

    it('should normalize country to uppercase', async () => {
      (prismaService.property.create as jest.Mock).mockResolvedValue(mockProperty);

      await service.create(createDto, 'owner-123');

      expect(prismaService.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'HU',
          }),
        }),
      );
    });

    it('should use default values for optional fields', async () => {
      (prismaService.property.create as jest.Mock).mockResolvedValue(mockProperty);

      await service.create(createDto, 'owner-123');

      expect(prismaService.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'EUR',
            priceNegotiable: false,
            dynamicPricingEnabled: false,
            petFriendly: false,
            newlyBuilt: false,
            accessible: false,
            noAgents: false,
          }),
        }),
      );
    });

    it('should include owner and media in response', async () => {
      (prismaService.property.create as jest.Mock).mockResolvedValue(mockProperty);

      const result = await service.create(createDto, 'owner-123');

      expect(result.owner).toBeDefined();
      expect(result.owner?.firstName).toBe('John');
      expect(prismaService.property.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            owner: expect.any(Object),
            media: expect.any(Object),
            floorPlans: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated properties', async () => {
      const properties = [mockProperty];
      (prismaService.property.findMany as jest.Mock).mockResolvedValue(properties);
      (prismaService.property.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(createQueryDto());

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by search term', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ search: 'apartment' }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'apartment', mode: 'insensitive' } },
              { description: { contains: 'apartment', mode: 'insensitive' } },
              { city: { contains: 'apartment', mode: 'insensitive' } },
              { address: { contains: 'apartment', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter by country', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ country: 'HU' }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: 'HU',
          }),
        }),
      );
    });

    it('should filter by city', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ city: 'Budapest' }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Budapest', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by listing types', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ listingTypes: [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT] }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingTypes: { hasSome: [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT] },
          }),
        }),
      );
    });

    it('should filter by price range', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ minPrice: 100000, maxPrice: 300000 }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            basePrice: {
              gte: expect.any(Prisma.Decimal),
              lte: expect.any(Prisma.Decimal),
            },
          }),
        }),
      );
    });

    it('should filter by square meters range', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ minSquareMeters: 50, maxSquareMeters: 100 }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            squareMeters: { gte: 50, lte: 100 },
          }),
        }),
      );
    });

    it('should filter by bedrooms range', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ minBedrooms: 2, maxBedrooms: 4 }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bedrooms: { gte: 2, lte: 4 },
          }),
        }),
      );
    });

    it('should filter by feature flags', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ petFriendly: true, noAgents: true }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            petFriendly: true,
            noAgents: true,
          }),
        }),
      );
    });

    it('should filter by geo bounding box', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({
        swLat: 47.0,
        swLng: 19.0,
        neLat: 48.0,
        neLng: 20.0,
      }));

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              { latitude: { gte: 47.0, lte: 48.0 } },
              { longitude: { gte: 19.0, lte: 20.0 } },
            ],
          }),
        }),
      );
    });

    it('should default to ACTIVE status for public queries', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto());

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PropertyStatus.ACTIVE,
          }),
        }),
      );
    });

    // PROD-026.3: No Agents Tag filtering for AGENT users
    it('should exclude noAgents properties for AGENT users', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto(), 'agent-123', UserRole.AGENT);

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                OR: [
                  { noAgents: false },
                  { ownerId: 'agent-123' },
                ],
              },
            ]),
          }),
        }),
      );
    });

    it('should not apply noAgents filter for regular USER', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto(), 'user-123', UserRole.USER);

      const call = (prismaService.property.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.AND).toBeUndefined();
    });

    it('should not apply noAgents filter for ADMIN', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto(), 'admin-123', UserRole.ADMIN);

      const call = (prismaService.property.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.AND).toBeUndefined();
    });

    // PROD-048: hasUpcomingOpenHouse filter
    it('should filter properties with upcoming open house events when hasUpcomingOpenHouse is true', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto({ hasUpcomingOpenHouse: true }), 'user-123', UserRole.USER);

      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                openHouseEvents: expect.objectContaining({
                  some: expect.objectContaining({
                    date: expect.objectContaining({ gte: expect.any(Date) }),
                    isPublic: true,
                  }),
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should not filter by open house when hasUpcomingOpenHouse is not set', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(createQueryDto(), 'user-123', UserRole.USER);

      const call = (prismaService.property.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.AND).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('property-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(service.findById('property-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for draft property accessed by non-owner', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
      });

      await expect(
        service.findById('property-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to view draft property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
      });

      const result = await service.findById('property-123', 'owner-123', UserRole.USER);

      expect(result.id).toBe(mockProperty.id);
    });

    it('should allow admin to view draft property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
      });

      const result = await service.findById('property-123', 'admin-123', UserRole.ADMIN);

      expect(result.id).toBe(mockProperty.id);
    });

    it('should return property with favorite count', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const result = await service.findById('property-123');

      expect(result.favoriteCount).toBe(5);
    });

    // PROD-026.3: No Agents Tag - block agents from viewing noAgents properties
    it('should throw ForbiddenException for AGENT viewing noAgents property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        noAgents: true,
        ownerId: 'other-owner',
      });

      await expect(
        service.findById('property-123', 'agent-123', UserRole.AGENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow AGENT to view their own noAgents property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        noAgents: true,
        ownerId: 'agent-123',
      });

      const result = await service.findById('property-123', 'agent-123', UserRole.AGENT);

      expect(result.id).toBe(mockProperty.id);
    });

    it('should allow regular USER to view noAgents property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        noAgents: true,
      });

      const result = await service.findById('property-123', 'user-123', UserRole.USER);

      expect(result.id).toBe(mockProperty.id);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Title' };

    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('property-123', updateDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.update('property-123', updateDto, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.update('property-123', updateDto, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update property successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        title: 'Updated Title',
      });

      const result = await service.update(
        'property-123',
        updateDto,
        'owner-123',
        UserRole.USER,
      );

      expect(result.title).toBe('Updated Title');
      expect(prismaService.property.update).toHaveBeenCalled();
    });

    it('should allow admin to update any property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        title: 'Updated Title',
      });

      const result = await service.update(
        'property-123',
        updateDto,
        'admin-123',
        UserRole.ADMIN,
      );

      expect(result.title).toBe('Updated Title');
    });

    it('should normalize country to uppercase on update', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        country: 'AT',
      });

      await service.update(
        'property-123',
        { country: 'at' },
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'AT',
          }),
        }),
      );
    });
  });

  describe('updateListingTypes', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateListingTypes(
          'property-123',
          [ListingType.FOR_SALE],
          'owner-123',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.updateListingTypes(
          'property-123',
          [ListingType.FOR_SALE],
          'other-user',
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for empty listing types', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.updateListingTypes('property-123', [], 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update listing types successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        listingTypes: [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT],
      });

      const result = await service.updateListingTypes(
        'property-123',
        [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT],
        'owner-123',
        UserRole.USER,
      );

      expect(result.listingTypes).toContain(ListingType.FOR_SALE);
      expect(result.listingTypes).toContain(ListingType.LONG_TERM_RENT);
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('property-123', PropertyStatus.ACTIVE, 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.updateStatus('property-123', PropertyStatus.PAUSED, 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for deleted property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.updateStatus('property-123', PropertyStatus.ACTIVE, 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
        publishedAt: null,
      });
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.ACTIVE,
      });

      const result = await service.updateStatus(
        'property-123',
        PropertyStatus.ACTIVE,
        'owner-123',
        UserRole.USER,
      );

      expect(result.status).toBe(PropertyStatus.ACTIVE);
    });

    it('should set publishedAt when first published', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
        publishedAt: null,
      });
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.ACTIVE,
        publishedAt: new Date(),
      });

      await service.updateStatus(
        'property-123',
        PropertyStatus.ACTIVE,
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PropertyStatus.ACTIVE,
            publishedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should not update publishedAt if already published', async () => {
      const existingPublishedAt = new Date('2024-01-01');
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.PAUSED,
        publishedAt: existingPublishedAt,
      });
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.ACTIVE,
        publishedAt: existingPublishedAt,
      });

      await service.updateStatus(
        'property-123',
        PropertyStatus.ACTIVE,
        'owner-123',
        UserRole.USER,
      );

      expect(prismaService.property.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: PropertyStatus.ACTIVE },
        }),
      );
    });

    it('should trigger search agent check when status changes to ACTIVE', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
        publishedAt: null,
      });
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.ACTIVE,
      });

      await service.updateStatus(
        'property-123',
        PropertyStatus.ACTIVE,
        'owner-123',
        UserRole.USER,
      );

      // Allow async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(searchAgentsService.checkAgainstNewProperty).toHaveBeenCalledWith('property-123');
    });

    it('should not trigger search agent check for non-ACTIVE status changes', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.ACTIVE,
      });
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.PAUSED,
      });

      await service.updateStatus(
        'property-123',
        PropertyStatus.PAUSED,
        'owner-123',
        UserRole.USER,
      );

      expect(searchAgentsService.checkAgainstNewProperty).not.toHaveBeenCalled();
    });

    it('should not fail if search agent check throws error', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DRAFT,
        publishedAt: null,
      });
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.ACTIVE,
      });
      (searchAgentsService.checkAgainstNewProperty as jest.Mock).mockRejectedValue(
        new Error('Search agent check failed'),
      );

      // Should not throw - error is caught and logged
      const result = await service.updateStatus(
        'property-123',
        PropertyStatus.ACTIVE,
        'owner-123',
        UserRole.USER,
      );

      expect(result.status).toBe(PropertyStatus.ACTIVE);
    });
  });

  describe('softDelete', () => {
    it('should throw NotFoundException if property not found', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.softDelete('property-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      await expect(
        service.softDelete('property-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already deleted', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      await expect(
        service.softDelete('property-123', 'owner-123', UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should soft delete property successfully', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      const result = await service.softDelete('property-123', 'owner-123', UserRole.USER);

      expect(result.message).toContain('deleted');
      expect(prismaService.property.update).toHaveBeenCalledWith({
        where: { id: 'property-123' },
        data: { status: PropertyStatus.DELETED },
      });
    });

    it('should allow admin to delete any property', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);
      (prismaService.property.update as jest.Mock).mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.DELETED,
      });

      const result = await service.softDelete('property-123', 'admin-123', UserRole.ADMIN);

      expect(result.message).toContain('deleted');
    });
  });

  describe('getMyProperties', () => {
    it('should return owner properties', async () => {
      const properties = [mockProperty];
      (prismaService.property.findMany as jest.Mock).mockResolvedValue(properties);
      (prismaService.property.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getMyProperties('owner-123', createQueryDto());

      expect(result.data).toHaveLength(1);
      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'owner-123',
          }),
        }),
      );
    });

    it('should include all statuses for owner', async () => {
      (prismaService.property.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.property.count as jest.Mock).mockResolvedValue(0);

      await service.getMyProperties('owner-123', createQueryDto());

      // Owner should not have ACTIVE-only filter applied
      expect(prismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'owner-123',
          }),
        }),
      );
    });
  });

  describe('response mapping', () => {
    it('should correctly map property to response DTO', async () => {
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(mockProperty);

      const result = await service.findById('property-123');

      expect(result.id).toBe(mockProperty.id);
      expect(result.basePrice).toBe('200000');
      expect(result.negotiabilityRange).toBe('10');
      expect(result.hoaFees).toBe('150');
      expect(result.owner?.firstName).toBe('John');
      expect(result.favoriteCount).toBe(5);
    });

    it('should handle null values correctly', async () => {
      const propertyWithNulls = {
        ...mockProperty,
        latitude: null,
        longitude: null,
        description: null,
        squareMeters: null,
        negotiabilityRange: null,
        hoaFees: null,
      };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(propertyWithNulls);

      const result = await service.findById('property-123');

      expect(result.latitude).toBeUndefined();
      expect(result.longitude).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.squareMeters).toBeUndefined();
      expect(result.negotiabilityRange).toBeUndefined();
      expect(result.hoaFees).toBeUndefined();
    });

    it('should map media correctly', async () => {
      const propertyWithMedia = {
        ...mockProperty,
        media: [
          {
            id: 'media-1',
            type: 'IMAGE',
            url: 'https://example.com/image.jpg',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            caption: 'Living room',
            sortOrder: 0,
            isPrimary: true,
            createdAt: new Date(),
          },
        ],
      };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(propertyWithMedia);

      const result = await service.findById('property-123');

      expect(result.media).toHaveLength(1);
      expect(result.media?.[0].url).toBe('https://example.com/image.jpg');
      expect(result.media?.[0].isPrimary).toBe(true);
    });

    it('should map floor plans correctly', async () => {
      const propertyWithFloorPlans = {
        ...mockProperty,
        floorPlans: [
          {
            id: 'floor-1',
            name: 'Ground Floor',
            imageUrl: 'https://example.com/floor.jpg',
            sortOrder: 0,
            createdAt: new Date(),
          },
        ],
      };
      (prismaService.property.findUnique as jest.Mock).mockResolvedValue(propertyWithFloorPlans);

      const result = await service.findById('property-123');

      expect(result.floorPlans).toHaveLength(1);
      expect(result.floorPlans?.[0].name).toBe('Ground Floor');
    });
  });
});
