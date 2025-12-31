import { Test, TestingModule } from '@nestjs/testing';
import { AiDescriptionService } from './ai-description.service';
import { PrismaService } from '@/database/prisma.service';
import {
  DescriptionTone,
  UserRole,
  ListingType,
  EnergyEfficiencyRating,
} from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AiDescriptionService', () => {
  let service: AiDescriptionService;

  const mockPrismaService = {
    property: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockProperty = {
    id: 'property-123',
    ownerId: 'user-123',
    title: 'Beautiful Apartment',
    address: '123 Main St',
    city: 'Budapest',
    country: 'HU',
    listingTypes: [ListingType.FOR_SALE],
    basePrice: 250000,
    currency: 'EUR',
    squareMeters: 85,
    bedrooms: 2,
    bathrooms: 1,
    floors: 1,
    yearBuilt: 2020,
    petFriendly: true,
    newlyBuilt: true,
    accessible: false,
    energyEfficiency: EnergyEfficiencyRating.A,
    lotSize: null,
    aiGeneratedDescription: null,
    descriptionTone: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiDescriptionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AiDescriptionService>(AiDescriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDescription', () => {
    it('should generate description with default tone', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);

      const result = await service.generateDescription(
        'property-123',
        'user-123',
        UserRole.USER,
        {},
      );

      expect(result).toBeDefined();
      expect(result.propertyId).toBe('property-123');
      expect(result.tone).toBe(DescriptionTone.MODERN_PROFESSIONAL);
      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
    });

    it('should generate description with specified tone', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);

      const result = await service.generateDescription(
        'property-123',
        'user-123',
        UserRole.USER,
        { tone: DescriptionTone.LUXURY },
      );

      expect(result.tone).toBe(DescriptionTone.LUXURY);
      expect(result.description).toContain('exceptional');
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDescription('non-existent', 'user-123', UserRole.USER, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);

      await expect(
        service.generateDescription('property-123', 'other-user', UserRole.USER, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to generate description', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);

      const result = await service.generateDescription(
        'property-123',
        'admin-user',
        UserRole.ADMIN,
        {},
      );

      expect(result).toBeDefined();
    });
  });

  describe('saveDescription', () => {
    it('should save description to property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.property.update.mockResolvedValue({
        ...mockProperty,
        aiGeneratedDescription: 'Test description',
        descriptionTone: DescriptionTone.LUXURY,
      });

      const result = await service.saveDescription(
        'property-123',
        'user-123',
        UserRole.USER,
        'Test description',
        DescriptionTone.LUXURY,
      );

      expect(result.message).toBe('Description saved successfully');
      expect(mockPrismaService.property.update).toHaveBeenCalledWith({
        where: { id: 'property-123' },
        data: {
          aiGeneratedDescription: 'Test description',
          descriptionTone: DescriptionTone.LUXURY,
        },
      });
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.saveDescription(
          'non-existent',
          'user-123',
          UserRole.USER,
          'Test',
          DescriptionTone.LUXURY,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);

      await expect(
        service.saveDescription(
          'property-123',
          'other-user',
          UserRole.USER,
          'Test',
          DescriptionTone.LUXURY,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('applyDescription', () => {
    it('should apply AI description to main description', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        aiGeneratedDescription: 'AI generated content',
      });
      mockPrismaService.property.update.mockResolvedValue(mockProperty);

      const result = await service.applyDescription(
        'property-123',
        'user-123',
        UserRole.USER,
      );

      expect(result.message).toBe('Description applied successfully');
      expect(mockPrismaService.property.update).toHaveBeenCalledWith({
        where: { id: 'property-123' },
        data: { description: 'AI generated content' },
      });
    });

    it('should throw NotFoundException if no AI description exists', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        aiGeneratedDescription: null,
      });

      await expect(
        service.applyDescription('property-123', 'user-123', UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);

      await expect(
        service.applyDescription('property-123', 'other-user', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('buildDescription', () => {
    const propertyData = {
      title: 'Modern Apartment',
      address: '123 Main St',
      city: 'Budapest',
      country: 'Hungary',
      listingTypes: [ListingType.FOR_SALE],
      basePrice: 250000,
      currency: 'EUR',
      squareMeters: 85,
      bedrooms: 2,
      bathrooms: 1,
      floors: 1,
      yearBuilt: 2020,
      petFriendly: true,
      newlyBuilt: true,
      accessible: false,
      energyEfficiency: 'A',
      lotSize: null,
    };

    it('should generate LUXURY tone description', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.LUXURY,
      );

      expect(description).toContain('exceptional');
      expect(description).toContain('prestigious');
      expect(description).toContain('Budapest');
    });

    it('should generate FAMILY_FRIENDLY tone description', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.FAMILY_FRIENDLY,
      );

      expect(description).toContain('family');
      expect(description.toLowerCase()).toContain('home');
    });

    it('should generate INVESTMENT_FOCUSED tone description', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.INVESTMENT_FOCUSED,
      );

      expect(description).toContain('investment');
      expect(description).toContain('ROI');
    });

    it('should generate MODERN_PROFESSIONAL tone description', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.MODERN_PROFESSIONAL,
      );

      expect(description).toContain('contemporary');
      expect(description).toContain('functionality');
    });

    it('should generate COZY_WELCOMING tone description', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.COZY_WELCOMING,
      );

      expect(description).toContain('charming');
      expect(description).toContain('comfort');
    });

    it('should include bedroom count', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.MODERN_PROFESSIONAL,
      );

      expect(description).toContain('2');
      expect(description.toLowerCase()).toContain('bedroom');
    });

    it('should include square meters', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.MODERN_PROFESSIONAL,
      );

      expect(description).toContain('85');
      expect(description).toContain('m²');
    });

    it('should include pet-friendly feature', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.MODERN_PROFESSIONAL,
      );

      expect(description.toLowerCase()).toContain('pet');
    });

    it('should include price in closing', () => {
      const description = service.buildDescription(
        propertyData,
        DescriptionTone.MODERN_PROFESSIONAL,
      );

      expect(description).toContain('€250,000');
    });

    it('should handle property with minimal data', () => {
      const minimalProperty = {
        title: 'Basic Property',
        address: '1 Test St',
        city: 'Test City',
        country: 'TC',
        listingTypes: [],
        basePrice: 100000,
        currency: 'EUR',
        squareMeters: null,
        bedrooms: null,
        bathrooms: null,
        floors: null,
        yearBuilt: null,
        petFriendly: false,
        newlyBuilt: false,
        accessible: false,
        energyEfficiency: 'NOT_RATED',
        lotSize: null,
      };

      const description = service.buildDescription(
        minimalProperty,
        DescriptionTone.MODERN_PROFESSIONAL,
      );

      expect(description).toBeDefined();
      expect(description.length).toBeGreaterThan(0);
      expect(description).toContain('Test City');
    });

    it('should format historic buildings with character', () => {
      const historicProperty = {
        ...propertyData,
        yearBuilt: 1920,
      };

      const description = service.buildDescription(
        historicProperty,
        DescriptionTone.LUXURY,
      );

      expect(description).toContain('historic');
      expect(description).toContain('character');
    });
  });
});
