import { Test, TestingModule } from '@nestjs/testing';
import { MortgageProviderService } from './mortgage-provider.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PlatformProviderStatus, MortgageProductType } from '@prisma/client';

describe('MortgageProviderService', () => {
  let service: MortgageProviderService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockProviderId = 'provider-123';
  const mockAdminId = 'admin-123';

  // Use any to avoid Decimal type issues in tests
  const mockProvider: any = {
    id: mockProviderId,
    userId: mockUserId,
    companyName: 'Test Mortgage Co',
    companyLogo: 'https://example.com/logo.png',
    nmlsId: 'NMLS-12345',
    licenseNumber: 'LIC-12345',
    licenseState: 'CA',
    licenseExpiry: new Date('2025-12-31'),
    taxId: '12-3456789',
    email: 'contact@testmortgage.com',
    phone: '+1-555-123-4567',
    website: 'https://testmortgage.com',
    address: '123 Mortgage St',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'US',
    description: 'A trusted mortgage provider',
    yearFounded: 2010,
    employeeCount: 50,
    productTypes: [MortgageProductType.FIXED_30, MortgageProductType.FIXED_15],
    minLoanAmount: 10000000, // $100,000
    maxLoanAmount: 100000000, // $1,000,000
    minCreditScore: 620,
    lendingAreas: ['CA', 'NV', 'AZ'],
    rates: { FIXED_30: 6.5, FIXED_15: 5.75 },
    status: PlatformProviderStatus.PENDING,
    statusReason: null,
    approvedAt: null,
    approvedBy: null,
    applicationNotes: 'Application notes',
    documents: [],
    isPlatformPartner: false,
    averageRating: 0,
    totalReviews: 0,
    responseRate: 0,
    avgResponseTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MortgageProviderService,
        {
          provide: PrismaService,
          useValue: {
            mortgageProvider: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MortgageProviderService>(MortgageProviderService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('applyAsProvider', () => {
    it('should create a new mortgage provider application (PROD-081.2)', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.mortgageProvider, 'create').mockResolvedValue(mockProvider);

      const dto = {
        companyName: 'Test Mortgage Co',
        nmlsId: 'NMLS-12345',
        email: 'contact@testmortgage.com',
        phone: '+1-555-123-4567',
        productTypes: [MortgageProductType.FIXED_30, MortgageProductType.FIXED_15],
      };

      const result = await service.applyAsProvider(mockUserId, dto);

      expect(result.id).toBe(mockProviderId);
      expect(result.companyName).toBe('Test Mortgage Co');
      expect(result.nmlsId).toBe('NMLS-12345');
      expect(result.status).toBe(PlatformProviderStatus.PENDING);
    });

    it('should throw ConflictException if user already has a provider profile', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);

      await expect(
        service.applyAsProvider(mockUserId, {
          companyName: 'Test Mortgage Co',
          nmlsId: 'NMLS-12345',
          email: 'contact@testmortgage.com',
          phone: '+1-555-123-4567',
          productTypes: [MortgageProductType.FIXED_30],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProviderById', () => {
    it('should return provider by ID (PROD-082.2)', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);

      const result = await service.getProviderById(mockProviderId);

      expect(result.id).toBe(mockProviderId);
      expect(result.companyName).toBe('Test Mortgage Co');
      expect(result.nmlsId).toBe('NMLS-12345');
    });

    it('should throw NotFoundException if provider not found', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(null);

      await expect(service.getProviderById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProvider', () => {
    it('should update provider profile (PROD-082.2)', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.mortgageProvider, 'update').mockResolvedValue({
        ...mockProvider,
        description: 'Updated description',
      });

      const result = await service.updateProvider(mockProviderId, mockUserId, {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
    });

    it('should throw ForbiddenException if user is not the provider owner', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);

      await expect(
        service.updateProvider(mockProviderId, 'other-user', {
          description: 'Updated description',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateProviderStatus', () => {
    it('should update provider status (PROD-081.5)', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.mortgageProvider, 'update').mockResolvedValue({
        ...mockProvider,
        status: PlatformProviderStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: mockAdminId,
      });

      const result = await service.updateProviderStatus(mockProviderId, mockAdminId, {
        status: PlatformProviderStatus.APPROVED,
      });

      expect(result.status).toBe(PlatformProviderStatus.APPROVED);
    });
  });

  describe('listProviders', () => {
    it('should list approved providers (PROD-080.3)', async () => {
      const approvedProvider = { ...mockProvider, status: PlatformProviderStatus.APPROVED };
      jest.spyOn(prismaService.mortgageProvider, 'findMany').mockResolvedValue([approvedProvider]);
      jest.spyOn(prismaService.mortgageProvider, 'count').mockResolvedValue(1);

      const result = await service.listProviders({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaService.mortgageProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PlatformProviderStatus.APPROVED,
          }),
        }),
      );
    });

    it('should filter by product type', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.mortgageProvider, 'count').mockResolvedValue(0);

      await service.listProviders({ productType: MortgageProductType.FIXED_30 });

      expect(prismaService.mortgageProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productTypes: { has: MortgageProductType.FIXED_30 },
          }),
        }),
      );
    });

    it('should filter by lending area', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.mortgageProvider, 'count').mockResolvedValue(0);

      await service.listProviders({ lendingArea: 'CA' });

      expect(prismaService.mortgageProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lendingAreas: { has: 'CA' },
          }),
        }),
      );
    });

    it('should filter by platform partners only', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.mortgageProvider, 'count').mockResolvedValue(0);

      await service.listProviders({ platformPartnersOnly: true });

      expect(prismaService.mortgageProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPlatformPartner: true,
          }),
        }),
      );
    });
  });

  describe('updateRates', () => {
    it('should update mortgage rates (PROD-082.2)', async () => {
      const newRates = { FIXED_30: 6.75, FIXED_15: 5.95 };
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.mortgageProvider, 'update').mockResolvedValue({
        ...mockProvider,
        rates: newRates,
      });

      const result = await service.updateRates(mockProviderId, mockUserId, newRates);

      expect(result.rates).toEqual(newRates);
    });

    it('should throw ForbiddenException if user is not the provider owner', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);

      await expect(
        service.updateRates(mockProviderId, 'other-user', { FIXED_30: 6.75 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listPendingApplications', () => {
    it('should list pending applications (PROD-081.5)', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findMany').mockResolvedValue([mockProvider]);
      jest.spyOn(prismaService.mortgageProvider, 'count').mockResolvedValue(1);

      const result = await service.listPendingApplications(1, 20);

      expect(result.items).toHaveLength(1);
      expect(prismaService.mortgageProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: PlatformProviderStatus.PENDING },
        }),
      );
    });
  });

  describe('togglePlatformPartner', () => {
    it('should toggle platform partner status (PROD-080.4)', async () => {
      jest.spyOn(prismaService.mortgageProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.mortgageProvider, 'update').mockResolvedValue({
        ...mockProvider,
        isPlatformPartner: true,
      });

      const result = await service.togglePlatformPartner(mockProviderId, true);

      expect(result.isPlatformPartner).toBe(true);
    });
  });
});
