import { Test, TestingModule } from '@nestjs/testing';
import { CateringService } from './catering.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CateringQuoteStatus } from '../dto';

describe('CateringService', () => {
  let service: CateringService;

  const mockUserId = 'user-123';
  const mockProviderId = 'provider-123';
  const mockMenuId = 'menu-123';
  const mockQuoteId = 'quote-123';

  // Mock data matches Prisma schema field names
  const mockProvider = {
    id: mockProviderId,
    name: 'Barcelona Catering Co',
    description: 'Premium catering services',
    cuisineTypes: ['Mediterranean', 'Spanish'],
    city: 'Barcelona',
    country: 'ES',
    address: 'Carrer Example 123',
    // No latitude/longitude in schema
    email: 'info@barcelonacatering.com',
    phone: '+34 123 456 789',
    website: 'https://barcelonacatering.com',
    minGuests: 20,
    maxGuests: 200,
    pricePerPerson: 35, // Prisma field (not pricePerPersonMin/Max)
    currency: 'EUR',
    eventTypes: ['Wedding', 'Corporate', 'Birthday'],
    // No dietaryOptions array - on menus as boolean flags
    serviceRadius: 50, // Prisma field (not serviceRadiusKm)
    // No leadTimeDays in schema
    // No imageUrls in schema
    rating: 4.8,
    reviewCount: 120,
    isActive: true,
    isVerified: true,
    menus: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMenu = {
    id: mockMenuId,
    providerId: mockProviderId,
    name: 'Premium Package',
    description: 'Full course meal',
    menuType: 'plated',
    pricePerPerson: 85,
    currency: 'EUR',
    minimumGuests: 30, // Prisma field (not minGuests)
    // No maxGuests in schema
    items: [
      { type: 'starter', items: ['Salad', 'Soup'] },
      { type: 'main', items: ['Fish', 'Meat'] },
    ],
    // Dietary options as boolean flags
    vegetarianOptions: true,
    veganOptions: false,
    glutenFreeOptions: false,
    halalOptions: false,
    kosherOptions: false,
    // No imageUrls in schema
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Future date for testing (30 days from now)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDateString = futureDate.toISOString().split('T')[0];

  const mockQuote = {
    id: mockQuoteId,
    userId: mockUserId,
    providerId: mockProviderId,
    eventDate: futureDate,
    eventType: 'Wedding',
    numberOfGuests: 100,
    venue: 'Beach Resort',
    venueAddress: 'Beach Road 1',
    propertyId: null,
    cuisinePreferences: ['Mediterranean'],
    dietaryRequirements: ['Vegetarian', 'Gluten-free'],
    budgetMin: 5000,
    budgetMax: 10000,
    currency: 'EUR',
    additionalNotes: 'Sunset ceremony',
    status: CateringQuoteStatus.REQUESTED,
    quotedAmount: null,
    quotedDetails: null,
    quotedMenuId: null,
    quotedAt: null,
    expiresAt: null,
    respondedAt: null,
    responseNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    cateringProvider: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cateringMenu: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cateringQuote: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CateringService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CateringService>(CateringService);

    jest.clearAllMocks();
  });

  describe('searchProviders', () => {
    it('should search providers', async () => {
      mockPrismaService.cateringProvider.findMany.mockResolvedValue([
        { ...mockProvider, menus: [mockMenu] },
      ]);
      mockPrismaService.cateringProvider.count.mockResolvedValue(1);

      const result = await service.searchProviders({});

      expect(result.providers).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by city', async () => {
      mockPrismaService.cateringProvider.findMany.mockResolvedValue([]);
      mockPrismaService.cateringProvider.count.mockResolvedValue(0);

      await service.searchProviders({ city: 'Barcelona' });

      expect(mockPrismaService.cateringProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Barcelona', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by cuisine types', async () => {
      mockPrismaService.cateringProvider.findMany.mockResolvedValue([]);
      mockPrismaService.cateringProvider.count.mockResolvedValue(0);

      await service.searchProviders({ cuisineTypes: ['Mediterranean'] });

      expect(mockPrismaService.cateringProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cuisineTypes: { hasSome: ['Mediterranean'] },
          }),
        }),
      );
    });

    it('should filter by minimum rating', async () => {
      mockPrismaService.cateringProvider.findMany.mockResolvedValue([]);
      mockPrismaService.cateringProvider.count.mockResolvedValue(0);

      await service.searchProviders({ minRating: 4.5 });

      expect(mockPrismaService.cateringProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: { gte: 4.5 },
          }),
        }),
      );
    });

    it('should paginate results', async () => {
      mockPrismaService.cateringProvider.findMany.mockResolvedValue([
        { ...mockProvider, menus: [] },
      ]);
      mockPrismaService.cateringProvider.count.mockResolvedValue(25);

      const result = await service.searchProviders({
        page: 2,
        limit: 10,
      });

      expect(result.total).toBe(25);
      expect(mockPrismaService.cateringProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('getProvider', () => {
    it('should return provider by ID', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        menus: [mockMenu],
      });

      const result = await service.getProvider(mockProviderId);

      expect(result.name).toBe('Barcelona Catering Co');
      expect(result.menus).toHaveLength(1);
    });

    it('should throw NotFoundException for invalid provider', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.getProvider('invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProvider', () => {
    it('should create provider', async () => {
      mockPrismaService.cateringProvider.create.mockResolvedValue({
        ...mockProvider,
        menus: [],
      });

      const result = await service.createProvider({
        name: 'Barcelona Catering Co',
        cuisineTypes: ['Mediterranean'],
        city: 'Barcelona',
        country: 'ES',
      });

      expect(result.name).toBe('Barcelona Catering Co');
    });
  });

  describe('updateProvider', () => {
    it('should update provider', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.cateringProvider.update.mockResolvedValue({
        ...mockProvider,
        name: 'Updated Name',
        menus: [],
      });

      const result = await service.updateProvider(mockProviderId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for invalid provider', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProvider('invalid', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMenu', () => {
    it('should create menu', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.cateringMenu.create.mockResolvedValue(mockMenu);

      const result = await service.createMenu(mockProviderId, {
        name: 'Premium Package',
        menuType: 'plated',
        pricePerPerson: 85,
      });

      expect(result.name).toBe('Premium Package');
    });

    it('should throw NotFoundException for invalid provider', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.createMenu('invalid', {
          name: 'Test',
          menuType: 'buffet',
          pricePerPerson: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProviderMenus', () => {
    it('should return provider menus', async () => {
      mockPrismaService.cateringMenu.findMany.mockResolvedValue([mockMenu]);

      const result = await service.getProviderMenus(mockProviderId);

      expect(result).toHaveLength(1);
    });
  });

  describe('updateMenu', () => {
    it('should update menu', async () => {
      mockPrismaService.cateringMenu.findUnique.mockResolvedValue(mockMenu);
      mockPrismaService.cateringMenu.update.mockResolvedValue({
        ...mockMenu,
        pricePerPerson: 95,
      });

      const result = await service.updateMenu(mockMenuId, {
        pricePerPerson: 95,
      });

      expect(result.pricePerPerson).toBe(95);
    });

    it('should throw NotFoundException for invalid menu', async () => {
      mockPrismaService.cateringMenu.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMenu('invalid', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMenu', () => {
    it('should soft delete menu', async () => {
      mockPrismaService.cateringMenu.findUnique.mockResolvedValue(mockMenu);
      mockPrismaService.cateringMenu.update.mockResolvedValue({
        ...mockMenu,
        isActive: false,
      });

      await expect(
        service.deleteMenu(mockMenuId),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException for invalid menu', async () => {
      mockPrismaService.cateringMenu.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteMenu('invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestQuote', () => {
    it('should request a quote', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.cateringQuote.create.mockResolvedValue({
        ...mockQuote,
        provider: { ...mockProvider, menus: [mockMenu] },
      });

      const result = await service.requestQuote(mockUserId, {
        providerId: mockProviderId,
        eventDate: futureDateString, // Use future date
        eventType: 'Wedding',
        numberOfGuests: 100,
      });

      expect(result.status).toBe(CateringQuoteStatus.REQUESTED);
    });

    it('should throw NotFoundException for invalid provider', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.requestQuote(mockUserId, {
          providerId: 'invalid',
          eventDate: futureDateString,
          eventType: 'Wedding',
          numberOfGuests: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive provider', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue({
        ...mockProvider,
        isActive: false,
      });

      await expect(
        service.requestQuote(mockUserId, {
          providerId: mockProviderId,
          eventDate: futureDateString,
          eventType: 'Wedding',
          numberOfGuests: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for insufficient lead time', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(mockProvider);

      // Event date too soon (service requires at least 3 days advance)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(
        service.requestQuote(mockUserId, {
          providerId: mockProviderId,
          eventDate: tomorrow.toISOString().split('T')[0],
          eventType: 'Wedding',
          numberOfGuests: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for too few guests', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(mockProvider);

      await expect(
        service.requestQuote(mockUserId, {
          providerId: mockProviderId,
          eventDate: futureDateString,
          eventType: 'Wedding',
          numberOfGuests: 5, // Below minimum of 20
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for too many guests', async () => {
      mockPrismaService.cateringProvider.findUnique.mockResolvedValue(mockProvider);

      await expect(
        service.requestQuote(mockUserId, {
          providerId: mockProviderId,
          eventDate: futureDateString,
          eventType: 'Wedding',
          numberOfGuests: 500, // Above maximum of 200
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getQuote', () => {
    it('should return quote by ID', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue({
        ...mockQuote,
        provider: { ...mockProvider, menus: [] },
      });

      const result = await service.getQuote(mockUserId, mockQuoteId);

      expect(result.id).toBe(mockQuoteId);
    });

    it('should throw NotFoundException for invalid quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue(null);

      await expect(
        service.getQuote(mockUserId, 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserQuotes', () => {
    it('should return user quotes', async () => {
      mockPrismaService.cateringQuote.findMany.mockResolvedValue([
        { ...mockQuote, provider: { ...mockProvider, menus: [] } },
      ]);

      const result = await service.getUserQuotes(mockUserId);

      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.cateringQuote.findMany.mockResolvedValue([]);

      await service.getUserQuotes(mockUserId, {
        status: CateringQuoteStatus.QUOTED,
      });

      expect(mockPrismaService.cateringQuote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CateringQuoteStatus.QUOTED,
          }),
        }),
      );
    });
  });

  describe('getProviderQuotes', () => {
    it('should return provider quotes', async () => {
      mockPrismaService.cateringQuote.findMany.mockResolvedValue([
        { ...mockQuote, provider: { ...mockProvider, menus: [] } },
      ]);

      const result = await service.getProviderQuotes(mockProviderId);

      expect(result).toHaveLength(1);
    });
  });

  describe('respondToQuote', () => {
    it('should respond to quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue(mockQuote);
      mockPrismaService.cateringQuote.update.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.QUOTED,
        quotedAmount: 8500,
        quotedDetails: 'Full package',
        provider: { ...mockProvider, menus: [] },
      });

      const result = await service.respondToQuote(mockProviderId, mockQuoteId, {
        quotedAmount: 8500,
        quotedDetails: 'Full package',
      });

      expect(result.status).toBe(CateringQuoteStatus.QUOTED);
      expect(result.quotedAmount).toBe(8500);
    });

    it('should throw NotFoundException for invalid quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue(null);

      await expect(
        service.respondToQuote(mockProviderId, 'invalid', { quotedAmount: 8500 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already responded quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.QUOTED,
      });

      await expect(
        service.respondToQuote(mockProviderId, mockQuoteId, { quotedAmount: 8500 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptQuote', () => {
    it('should accept quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.QUOTED,
        quotedAmount: 8500,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      mockPrismaService.cateringQuote.update.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.ACCEPTED,
        provider: { ...mockProvider, menus: [] },
      });

      const result = await service.acceptQuote(mockUserId, mockQuoteId);

      expect(result.status).toBe(CateringQuoteStatus.ACCEPTED);
    });

    it('should throw BadRequestException for non-quoted status', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue(mockQuote);

      await expect(
        service.acceptQuote(mockUserId, mockQuoteId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.QUOTED,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      await expect(
        service.acceptQuote(mockUserId, mockQuoteId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectQuote', () => {
    it('should reject quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.QUOTED,
      });
      mockPrismaService.cateringQuote.update.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.DECLINED,
        responseNotes: 'Too expensive',
        provider: { ...mockProvider, menus: [] },
      });

      const result = await service.rejectQuote(
        mockUserId,
        mockQuoteId,
        'Too expensive',
      );

      expect(result.status).toBe(CateringQuoteStatus.DECLINED);
    });

    it('should throw BadRequestException for non-quoted status', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue(mockQuote);

      await expect(
        service.rejectQuote(mockUserId, mockQuoteId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelQuote', () => {
    it('should cancel requested quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue(mockQuote);
      mockPrismaService.cateringQuote.update.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.CANCELLED,
        provider: { ...mockProvider, menus: [] },
      });

      const result = await service.cancelQuote(mockUserId, mockQuoteId);

      expect(result.status).toBe(CateringQuoteStatus.CANCELLED);
    });

    it('should throw BadRequestException for accepted quote', async () => {
      mockPrismaService.cateringQuote.findFirst.mockResolvedValue({
        ...mockQuote,
        status: CateringQuoteStatus.ACCEPTED,
      });

      await expect(
        service.cancelQuote(mockUserId, mockQuoteId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
