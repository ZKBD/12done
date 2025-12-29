import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LeaseRenewalService } from './lease-renewal.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import { LeaseRenewalStatus, LeaseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('LeaseRenewalService', () => {
  let service: LeaseRenewalService;

  const mockPrismaService = {
    lease: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    leaseRenewal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockMailService = {
    sendLeaseRenewalReminderEmail: jest.fn(),
    sendLeaseRenewalOfferEmail: jest.fn(),
    sendLeaseRenewalAcceptedEmail: jest.fn(),
    sendLeaseRenewalDeclinedEmail: jest.fn(),
    sendLeaseRenewalExpiredEmail: jest.fn(),
  };

  const landlordId = 'landlord-123';
  const tenantId = 'tenant-456';
  const propertyId = 'property-789';
  const leaseId = 'lease-abc';
  const renewalId = 'renewal-xyz';

  const mockProperty = {
    id: propertyId,
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
    securityDepositPaid: true,
    status: 'ACTIVE' as LeaseStatus,
    documentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    tenant: mockTenant,
    landlord: mockLandlord,
  };

  const mockRenewal = {
    id: renewalId,
    leaseId,
    landlordId,
    tenantId,
    status: 'PENDING' as LeaseRenewalStatus,
    proposedStartDate: null,
    proposedEndDate: null,
    proposedRentAmount: null,
    proposedTerms: null,
    offerExpiresAt: null,
    reminderSentAt: new Date(),
    offerSentAt: null,
    respondedAt: null,
    declineReason: null,
    newLeaseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lease: mockLease,
    landlord: mockLandlord,
    tenant: mockTenant,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaseRenewalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<LeaseRenewalService>(LeaseRenewalService);

    jest.clearAllMocks();
  });

  describe('findPendingRenewals', () => {
    it('should return paginated list of pending renewals', async () => {
      const renewals = [mockRenewal];
      mockPrismaService.leaseRenewal.findMany.mockResolvedValue(renewals);
      mockPrismaService.leaseRenewal.count.mockResolvedValue(1);

      const result = await service.findPendingRenewals(landlordId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.leaseRenewal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            landlordId,
            status: { in: ['PENDING', 'OFFERED'] },
          },
        }),
      );
    });

    it('should filter by specific status when provided', async () => {
      mockPrismaService.leaseRenewal.findMany.mockResolvedValue([]);
      mockPrismaService.leaseRenewal.count.mockResolvedValue(0);

      await service.findPendingRenewals(landlordId, {
        page: 1,
        limit: 20,
        status: 'OFFERED' as LeaseRenewalStatus,
      });

      expect(mockPrismaService.leaseRenewal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            landlordId,
            status: 'OFFERED',
          },
        }),
      );
    });
  });

  describe('findRenewalForLease', () => {
    it('should return renewal for lease when found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(mockRenewal);

      const result = await service.findRenewalForLease(leaseId, landlordId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(renewalId);
    });

    it('should return null when no active renewal exists', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(null);

      const result = await service.findRenewalForLease(leaseId, landlordId);

      expect(result).toBeNull();
    });

    it('should throw NotFoundException when lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.findRenewalForLease(leaseId, landlordId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not tenant or landlord', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      await expect(
        service.findRenewalForLease(leaseId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createOffer', () => {
    const createOfferDto = {
      proposedStartDate: '2026-02-01',
      proposedEndDate: '2027-01-31',
      proposedRentAmount: 1600,
      proposedTerms: 'Standard renewal terms',
    };

    it('should create renewal offer successfully', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue({
        ...mockRenewal,
        status: 'PENDING',
      });
      mockPrismaService.leaseRenewal.update.mockResolvedValue({
        ...mockRenewal,
        status: 'OFFERED',
        proposedStartDate: new Date('2026-02-01'),
        proposedEndDate: new Date('2027-01-31'),
        proposedRentAmount: new Decimal(1600),
      });

      const result = await service.createOffer(
        leaseId,
        landlordId,
        createOfferDto,
      );

      expect(result.status).toBe('OFFERED');
      expect(mockMailService.sendLeaseRenewalOfferEmail).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.createOffer(leaseId, landlordId, createOfferDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when not landlord', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      await expect(
        service.createOffer(leaseId, tenantId, createOfferDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when lease is not active', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        status: 'EXPIRED',
      });

      await expect(
        service.createOffer(leaseId, landlordId, createOfferDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      await expect(
        service.createOffer(leaseId, landlordId, {
          ...createOfferDto,
          proposedStartDate: '2027-02-01',
          proposedEndDate: '2026-01-31',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when offer already exists', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue({
        ...mockRenewal,
        status: 'OFFERED',
      });

      await expect(
        service.createOffer(leaseId, landlordId, createOfferDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptOffer', () => {
    const offeredRenewal = {
      ...mockRenewal,
      status: 'OFFERED' as LeaseRenewalStatus,
      proposedStartDate: new Date('2026-02-01'),
      proposedEndDate: new Date('2027-01-31'),
      proposedRentAmount: new Decimal(1600),
      offerExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    it('should accept offer and create new lease', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(offeredRenewal);
      const newLeaseId = 'new-lease-123';
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          lease: {
            create: jest.fn().mockResolvedValue({ id: newLeaseId }),
          },
          leaseRenewal: {
            update: jest.fn().mockResolvedValue({
              ...offeredRenewal,
              status: 'ACCEPTED',
              newLeaseId,
              respondedAt: new Date(),
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.acceptOffer(leaseId, tenantId);

      expect(result.status).toBe('ACCEPTED');
      expect(mockMailService.sendLeaseRenewalAcceptedEmail).toHaveBeenCalledTimes(
        2,
      ); // Both parties
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when no active offer exists', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(null);

      await expect(service.acceptOffer(leaseId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not tenant', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(offeredRenewal);

      await expect(service.acceptOffer(leaseId, landlordId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when offer has expired', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue({
        ...offeredRenewal,
        offerExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      });

      await expect(service.acceptOffer(leaseId, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('declineOffer', () => {
    const offeredRenewal = {
      ...mockRenewal,
      status: 'OFFERED' as LeaseRenewalStatus,
      proposedStartDate: new Date('2026-02-01'),
      proposedEndDate: new Date('2027-01-31'),
      proposedRentAmount: new Decimal(1600),
    };

    it('should decline offer successfully', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(offeredRenewal);
      mockPrismaService.leaseRenewal.update.mockResolvedValue({
        ...offeredRenewal,
        status: 'DECLINED',
        respondedAt: new Date(),
        declineReason: 'Found cheaper place',
      });

      const result = await service.declineOffer(leaseId, tenantId, {
        declineReason: 'Found cheaper place',
      });

      expect(result.status).toBe('DECLINED');
      expect(mockMailService.sendLeaseRenewalDeclinedEmail).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when no active offer exists', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(null);

      await expect(
        service.declineOffer(leaseId, tenantId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when not tenant', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(offeredRenewal);

      await expect(
        service.declineOffer(leaseId, landlordId, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelOffer', () => {
    it('should cancel pending renewal', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(mockRenewal);
      mockPrismaService.leaseRenewal.update.mockResolvedValue({
        ...mockRenewal,
        status: 'CANCELLED',
      });

      const result = await service.cancelOffer(leaseId, landlordId);

      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel offered renewal and notify tenant', async () => {
      const offeredRenewal = {
        ...mockRenewal,
        status: 'OFFERED' as LeaseRenewalStatus,
      };
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(offeredRenewal);
      mockPrismaService.leaseRenewal.update.mockResolvedValue({
        ...offeredRenewal,
        status: 'CANCELLED',
      });

      const result = await service.cancelOffer(leaseId, landlordId);

      expect(result.status).toBe('CANCELLED');
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        tenantId,
        'LEASE_RENEWAL_EXPIRED',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when no active renewal exists', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(null);

      await expect(service.cancelOffer(leaseId, landlordId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when not landlord', async () => {
      mockPrismaService.leaseRenewal.findFirst.mockResolvedValue(mockRenewal);

      await expect(service.cancelOffer(leaseId, tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('checkUpcomingRenewals (cron job)', () => {
    it('should create pending renewals for expiring leases', async () => {
      const expiringLease = {
        ...mockLease,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };
      mockPrismaService.lease.findMany.mockResolvedValue([expiringLease]);
      mockPrismaService.leaseRenewal.create.mockResolvedValue(mockRenewal);

      await service.checkUpcomingRenewals();

      expect(mockPrismaService.leaseRenewal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leaseId: expiringLease.id,
            landlordId: expiringLease.landlordId,
            tenantId: expiringLease.tenantId,
            status: 'PENDING',
          }),
        }),
      );
      expect(mockMailService.sendLeaseRenewalReminderEmail).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should not create renewals when no leases are expiring', async () => {
      mockPrismaService.lease.findMany.mockResolvedValue([]);

      await service.checkUpcomingRenewals();

      expect(mockPrismaService.leaseRenewal.create).not.toHaveBeenCalled();
    });
  });

  describe('expireOffers (cron job)', () => {
    it('should expire offers past their deadline', async () => {
      const expiredOffer = {
        ...mockRenewal,
        status: 'OFFERED' as LeaseRenewalStatus,
        offerExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      };
      mockPrismaService.leaseRenewal.findMany.mockResolvedValue([expiredOffer]);
      mockPrismaService.leaseRenewal.update.mockResolvedValue({
        ...expiredOffer,
        status: 'EXPIRED',
      });

      await service.expireOffers();

      expect(mockPrismaService.leaseRenewal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: expiredOffer.id },
          data: { status: 'EXPIRED' },
        }),
      );
      expect(mockMailService.sendLeaseRenewalExpiredEmail).toHaveBeenCalledTimes(
        2,
      ); // Both parties
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    });

    it('should not expire any offers when none are past deadline', async () => {
      mockPrismaService.leaseRenewal.findMany.mockResolvedValue([]);

      await service.expireOffers();

      expect(mockPrismaService.leaseRenewal.update).not.toHaveBeenCalled();
    });
  });
});
