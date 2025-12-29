import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LeasesService } from './leases.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { LeaseStatus, RentPaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('LeasesService', () => {
  let service: LeasesService;

  const mockPrismaService = {
    property: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    lease: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    rentPayment: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const landlordId = 'landlord-123';
  const tenantId = 'tenant-456';
  const propertyId = 'property-789';
  const leaseId = 'lease-abc';
  const paymentId = 'payment-def';

  const mockProperty = {
    id: propertyId,
    ownerId: landlordId,
    title: 'Test Apartment',
    address: '123 Test St',
    city: 'Budapest',
    country: 'HU',
  };

  const mockTenant = {
    id: tenantId,
    email: 'tenant@example.com',
    firstName: 'John',
    lastName: 'Tenant',
  };

  const mockLandlord = {
    id: landlordId,
    email: 'landlord@example.com',
    firstName: 'Jane',
    lastName: 'Landlord',
  };

  const mockLease = {
    id: leaseId,
    propertyId,
    tenantId,
    landlordId,
    startDate: new Date('2025-02-01'),
    endDate: new Date('2026-01-31'),
    rentAmount: new Decimal(1500),
    currency: 'EUR',
    dueDay: 1,
    securityDeposit: new Decimal(3000),
    securityDepositPaid: false,
    status: 'DRAFT' as LeaseStatus,
    documentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    tenant: mockTenant,
    landlord: mockLandlord,
  };

  const mockPayment = {
    id: paymentId,
    leaseId,
    dueDate: new Date('2025-02-01'),
    amount: new Decimal(1500),
    currency: 'EUR',
    status: 'PENDING' as RentPaymentStatus,
    paidAt: null,
    paidAmount: null,
    paymentMethod: null,
    transactionRef: null,
    reminderSentAt: null,
    overdueSentAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lease: {
      ...mockLease,
      property: mockProperty,
      tenant: mockTenant,
      landlordId,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeasesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<LeasesService>(LeasesService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createLeaseDto = {
      propertyId,
      tenantId,
      startDate: '2025-02-01',
      endDate: '2026-01-31',
      rentAmount: 1500,
      currency: 'EUR',
      dueDay: 1,
      securityDeposit: 3000,
    };

    it('should create a lease successfully', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.user.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.lease.findFirst.mockResolvedValue(null);
      mockPrismaService.lease.create.mockResolvedValue(mockLease);

      const result = await service.create(landlordId, createLeaseDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(leaseId);
      expect(result.status).toBe('DRAFT');
      expect(mockPrismaService.lease.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(service.create(landlordId, createLeaseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not property owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      });

      await expect(service.create(landlordId, createLeaseDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(landlordId, createLeaseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if tenant is landlord', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.user.findUnique.mockResolvedValue(mockLandlord);

      await expect(
        service.create(landlordId, { ...createLeaseDto, tenantId: landlordId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if property has active lease', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.user.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.lease.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(landlordId, createLeaseDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if end date before start date', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.user.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.lease.findFirst.mockResolvedValue(null);

      await expect(
        service.create(landlordId, {
          ...createLeaseDto,
          startDate: '2026-01-31',
          endDate: '2025-02-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return leases for a user', async () => {
      mockPrismaService.lease.findMany.mockResolvedValue([mockLease]);
      mockPrismaService.lease.count.mockResolvedValue(1);

      const result = await service.findAll(landlordId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.lease.findMany.mockResolvedValue([]);
      mockPrismaService.lease.count.mockResolvedValue(0);

      await service.findAll(landlordId, { status: 'ACTIVE' as LeaseStatus });

      expect(mockPrismaService.lease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by role (tenant)', async () => {
      mockPrismaService.lease.findMany.mockResolvedValue([]);
      mockPrismaService.lease.count.mockResolvedValue(0);

      await service.findAll(tenantId, { role: 'tenant' });

      expect(mockPrismaService.lease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
          }),
        }),
      );
    });

    it('should filter by role (landlord)', async () => {
      mockPrismaService.lease.findMany.mockResolvedValue([]);
      mockPrismaService.lease.count.mockResolvedValue(0);

      await service.findAll(landlordId, { role: 'landlord' });

      expect(mockPrismaService.lease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            landlordId,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return lease for tenant', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      const result = await service.findOne(leaseId, tenantId);

      expect(result).toBeDefined();
      expect(result.id).toBe(leaseId);
    });

    it('should return lease for landlord', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      const result = await service.findOne(leaseId, landlordId);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(service.findOne(leaseId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      await expect(service.findOne(leaseId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { rentAmount: 1600 };

    it('should update draft lease', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.lease.update.mockResolvedValue({
        ...mockLease,
        rentAmount: new Decimal(1600),
      });

      const result = await service.update(leaseId, landlordId, updateDto);

      expect(result.rentAmount).toBe(1600);
    });

    it('should throw NotFoundException if lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.update(leaseId, landlordId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not landlord', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      await expect(service.update(leaseId, tenantId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if lease not draft', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        status: 'ACTIVE',
      });

      await expect(
        service.update(leaseId, landlordId, updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate', () => {
    it('should activate a draft lease and generate payments', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        property: mockProperty,
        tenant: mockTenant,
      });
      mockPrismaService.lease.findFirst.mockResolvedValue(null);

      const activatedLease = { ...mockLease, status: 'ACTIVE' as LeaseStatus };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          rentPayment: { createMany: jest.fn() },
          lease: { update: jest.fn().mockResolvedValue(activatedLease) },
        });
      });

      const result = await service.activate(leaseId, landlordId);

      expect(result.status).toBe('ACTIVE');
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(service.activate(leaseId, landlordId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not landlord', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        property: mockProperty,
        tenant: mockTenant,
      });

      await expect(service.activate(leaseId, tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if lease not draft', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        status: 'ACTIVE',
        property: mockProperty,
        tenant: mockTenant,
      });

      await expect(service.activate(leaseId, landlordId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if property has active lease', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        property: mockProperty,
        tenant: mockTenant,
      });
      mockPrismaService.lease.findFirst.mockResolvedValue({ id: 'other-lease' });

      await expect(service.activate(leaseId, landlordId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('terminate', () => {
    it('should terminate an active lease', async () => {
      const activeLease = {
        ...mockLease,
        status: 'ACTIVE' as LeaseStatus,
        property: mockProperty,
        tenant: mockTenant,
      };
      mockPrismaService.lease.findUnique.mockResolvedValue(activeLease);
      mockPrismaService.lease.update.mockResolvedValue({
        ...activeLease,
        status: 'TERMINATED',
      });

      const result = await service.terminate(leaseId, landlordId, 'Test reason');

      expect(result.status).toBe('TERMINATED');
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if lease not active', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        status: 'DRAFT',
        property: mockProperty,
        tenant: mockTenant,
      });

      await expect(service.terminate(leaseId, landlordId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPayments', () => {
    it('should return payments for a lease', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.rentPayment.findMany.mockResolvedValue([mockPayment]);

      const result = await service.getPayments(leaseId, tenantId, {});

      expect(result.data).toHaveLength(1);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      await expect(
        service.getPayments(leaseId, 'other-user', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('recordPayment', () => {
    const recordDto = {
      paidAmount: 1500,
      paymentMethod: 'bank_transfer',
      transactionRef: 'TXN-123',
    };

    it('should record a payment', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.rentPayment.update.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: new Decimal(1500),
      });

      const result = await service.recordPayment(
        leaseId,
        paymentId,
        landlordId,
        recordDto,
      );

      expect(result.status).toBe('PAID');
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue(null);

      await expect(
        service.recordPayment(leaseId, paymentId, landlordId, recordDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment belongs to different lease', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue({
        ...mockPayment,
        leaseId: 'different-lease',
      });

      await expect(
        service.recordPayment(leaseId, paymentId, landlordId, recordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not landlord', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.recordPayment(leaseId, paymentId, tenantId, recordDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already paid', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
      });

      await expect(
        service.recordPayment(leaseId, paymentId, landlordId, recordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if waived', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'WAIVED',
      });

      await expect(
        service.recordPayment(leaseId, paymentId, landlordId, recordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('waivePayment', () => {
    const waiveDto = { reason: 'First month free' };

    it('should waive a payment', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue({
        ...mockPayment,
        lease: mockLease,
      });
      mockPrismaService.rentPayment.update.mockResolvedValue({
        ...mockPayment,
        status: 'WAIVED',
        notes: waiveDto.reason,
      });

      const result = await service.waivePayment(
        leaseId,
        paymentId,
        landlordId,
        waiveDto,
      );

      expect(result.status).toBe('WAIVED');
    });

    it('should throw BadRequestException if already paid', async () => {
      mockPrismaService.rentPayment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'PAID',
        lease: mockLease,
      });

      await expect(
        service.waivePayment(leaseId, paymentId, landlordId, waiveDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
