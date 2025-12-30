import { Test, TestingModule } from '@nestjs/testing';
import { InsuranceProviderService } from './insurance-provider.service';
import { PrismaService } from '@/database/prisma.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PlatformProviderStatus, InsuranceType } from '@prisma/client';

describe('InsuranceProviderService', () => {
  let service: InsuranceProviderService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockProviderId = 'provider-123';
  const mockAdminId = 'admin-123';

  const mockProvider = {
    id: mockProviderId,
    userId: mockUserId,
    companyName: 'Test Insurance Co',
    companyLogo: 'https://example.com/logo.png',
    licenseNumber: 'LIC-12345',
    licenseState: 'CA',
    licenseExpiry: new Date('2025-12-31'),
    taxId: '12-3456789',
    email: 'contact@testinsurance.com',
    phone: '+1-555-123-4567',
    website: 'https://testinsurance.com',
    address: '123 Insurance St',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'US',
    description: 'A trusted insurance provider',
    yearFounded: 2010,
    employeeCount: 50,
    insuranceTypes: [InsuranceType.HOME, InsuranceType.RENTERS],
    coverageAreas: ['CA', 'NV', 'AZ'],
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
        InsuranceProviderService,
        {
          provide: PrismaService,
          useValue: {
            insuranceProvider: {
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

    service = module.get<InsuranceProviderService>(InsuranceProviderService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('applyAsProvider', () => {
    it('should create a new insurance provider application (PROD-081.1)', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.insuranceProvider, 'create').mockResolvedValue(mockProvider);

      const dto = {
        companyName: 'Test Insurance Co',
        licenseNumber: 'LIC-12345',
        licenseState: 'CA',
        email: 'contact@testinsurance.com',
        phone: '+1-555-123-4567',
        insuranceTypes: [InsuranceType.HOME, InsuranceType.RENTERS],
      };

      const result = await service.applyAsProvider(mockUserId, dto);

      expect(result.id).toBe(mockProviderId);
      expect(result.companyName).toBe('Test Insurance Co');
      expect(result.status).toBe(PlatformProviderStatus.PENDING);
      expect(prismaService.insuranceProvider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            companyName: 'Test Insurance Co',
            status: PlatformProviderStatus.PENDING,
          }),
        }),
      );
    });

    it('should throw ConflictException if user already has a provider profile', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockProvider);

      await expect(
        service.applyAsProvider(mockUserId, {
          companyName: 'Test Insurance Co',
          licenseNumber: 'LIC-12345',
          licenseState: 'CA',
          email: 'contact@testinsurance.com',
          phone: '+1-555-123-4567',
          insuranceTypes: [InsuranceType.HOME],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProviderById', () => {
    it('should return provider by ID (PROD-082.1)', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockProvider);

      const result = await service.getProviderById(mockProviderId);

      expect(result.id).toBe(mockProviderId);
      expect(result.companyName).toBe('Test Insurance Co');
    });

    it('should throw NotFoundException if provider not found', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(null);

      await expect(service.getProviderById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProvider', () => {
    it('should update provider profile (PROD-082.1)', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.insuranceProvider, 'update').mockResolvedValue({
        ...mockProvider,
        description: 'Updated description',
      });

      const result = await service.updateProvider(mockProviderId, mockUserId, {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
    });

    it('should throw ForbiddenException if user is not the provider owner', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockProvider);

      await expect(
        service.updateProvider(mockProviderId, 'other-user', {
          description: 'Updated description',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateProviderStatus', () => {
    it('should update provider status (PROD-081.5)', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.insuranceProvider, 'update').mockResolvedValue({
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

    it('should set approvedAt and approvedBy when approving', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.insuranceProvider, 'update').mockResolvedValue({
        ...mockProvider,
        status: PlatformProviderStatus.APPROVED,
      });

      await service.updateProviderStatus(mockProviderId, mockAdminId, {
        status: PlatformProviderStatus.APPROVED,
      });

      expect(prismaService.insuranceProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PlatformProviderStatus.APPROVED,
            approvedAt: expect.any(Date),
            approvedBy: mockAdminId,
          }),
        }),
      );
    });
  });

  describe('listProviders', () => {
    it('should list approved providers (PROD-080.2)', async () => {
      const approvedProvider = { ...mockProvider, status: PlatformProviderStatus.APPROVED };
      jest.spyOn(prismaService.insuranceProvider, 'findMany').mockResolvedValue([approvedProvider]);
      jest.spyOn(prismaService.insuranceProvider, 'count').mockResolvedValue(1);

      const result = await service.listProviders({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaService.insuranceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PlatformProviderStatus.APPROVED,
          }),
        }),
      );
    });

    it('should filter by insurance type', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.insuranceProvider, 'count').mockResolvedValue(0);

      await service.listProviders({ insuranceType: InsuranceType.HOME });

      expect(prismaService.insuranceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            insuranceTypes: { has: InsuranceType.HOME },
          }),
        }),
      );
    });

    it('should filter by coverage area', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.insuranceProvider, 'count').mockResolvedValue(0);

      await service.listProviders({ coverageArea: 'CA' });

      expect(prismaService.insuranceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            coverageAreas: { has: 'CA' },
          }),
        }),
      );
    });

    it('should filter by platform partners only', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.insuranceProvider, 'count').mockResolvedValue(0);

      await service.listProviders({ platformPartnersOnly: true });

      expect(prismaService.insuranceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPlatformPartner: true,
          }),
        }),
      );
    });
  });

  describe('listPendingApplications', () => {
    it('should list pending applications (PROD-081.5)', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findMany').mockResolvedValue([mockProvider]);
      jest.spyOn(prismaService.insuranceProvider, 'count').mockResolvedValue(1);

      const result = await service.listPendingApplications(1, 20);

      expect(result.items).toHaveLength(1);
      expect(prismaService.insuranceProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: PlatformProviderStatus.PENDING },
        }),
      );
    });
  });

  describe('togglePlatformPartner', () => {
    it('should toggle platform partner status (PROD-080.4)', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'findUnique').mockResolvedValue(mockProvider);
      jest.spyOn(prismaService.insuranceProvider, 'update').mockResolvedValue({
        ...mockProvider,
        isPlatformPartner: true,
      });

      const result = await service.togglePlatformPartner(mockProviderId, true);

      expect(result.isPlatformPartner).toBe(true);
    });
  });

  describe('updateProviderMetrics', () => {
    it('should update provider metrics', async () => {
      jest.spyOn(prismaService.insuranceProvider, 'update').mockResolvedValue(mockProvider);

      await service.updateProviderMetrics(mockProviderId, {
        averageRating: 4.5,
        totalReviews: 10,
        responseRate: 95,
        avgResponseTime: 24,
      });

      expect(prismaService.insuranceProvider.update).toHaveBeenCalledWith({
        where: { id: mockProviderId },
        data: {
          averageRating: 4.5,
          totalReviews: 10,
          responseRate: 95,
          avgResponseTime: 24,
        },
      });
    });
  });
});
