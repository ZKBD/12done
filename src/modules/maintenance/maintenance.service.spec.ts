import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import {
  MaintenanceRequestStatus,
  MaintenanceRequestType,
  MaintenancePriority,
  LeaseStatus,
  ServiceProviderStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('MaintenanceService', () => {
  let service: MaintenanceService;

  const mockPrismaService = {
    lease: {
      findUnique: jest.fn(),
    },
    maintenanceRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    serviceProvider: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockMailService = {
    sendMaintenanceSubmittedEmail: jest.fn(),
    sendMaintenanceApprovedEmail: jest.fn(),
    sendMaintenanceRejectedEmail: jest.fn(),
    sendMaintenanceAssignedEmail: jest.fn(),
    sendMaintenanceScheduledEmail: jest.fn(),
    sendMaintenanceCompletedEmail: jest.fn(),
  };

  const landlordId = 'landlord-123';
  const tenantId = 'tenant-456';
  const propertyId = 'property-789';
  const leaseId = 'lease-abc';
  const requestId = 'request-def';
  const providerId = 'provider-xyz';

  const mockProperty = {
    id: propertyId,
    ownerId: landlordId,
    title: 'Test Apartment',
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

  const mockProvider = {
    id: providerId,
    businessName: 'Fix It Fast',
    status: ServiceProviderStatus.APPROVED,
    user: {
      email: 'provider@example.com',
      firstName: 'Mike',
      lastName: 'Provider',
    },
  };

  const mockLease = {
    id: leaseId,
    propertyId,
    tenantId,
    landlordId,
    status: LeaseStatus.ACTIVE,
    property: mockProperty,
    tenant: mockTenant,
    landlord: mockLandlord,
  };

  const mockRequest = {
    id: requestId,
    propertyId,
    leaseId,
    tenantId,
    landlordId,
    type: MaintenanceRequestType.PLUMBING,
    priority: MaintenancePriority.NORMAL,
    title: 'Leaking faucet',
    description: 'The kitchen faucet has been dripping for two days.',
    attachmentUrls: [],
    status: MaintenanceRequestStatus.SUBMITTED,
    rejectionReason: null,
    assignedProviderId: null,
    preferredDate: null,
    scheduledDate: null,
    scheduledTimeSlot: null,
    completionNotes: null,
    completionPhotos: [],
    estimatedCost: null,
    actualCost: null,
    completedAt: null,
    confirmedByTenant: false,
    confirmedByLandlord: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    lease: mockLease,
    tenant: mockTenant,
    landlord: mockLandlord,
    assignedProvider: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);

    jest.clearAllMocks();
  });

  // ============================================
  // CREATE TESTS
  // ============================================
  describe('create', () => {
    const createDto = {
      leaseId,
      type: MaintenanceRequestType.PLUMBING,
      title: 'Leaking faucet',
      description: 'The kitchen faucet has been dripping for two days.',
    };

    it('should create a maintenance request successfully', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.maintenanceRequest.create.mockResolvedValue(mockRequest);

      const result = await service.create(tenantId, createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(requestId);
      expect(mockPrismaService.maintenanceRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          landlordId,
          propertyId,
          leaseId,
          type: MaintenanceRequestType.PLUMBING,
          title: 'Leaking faucet',
        }),
        include: expect.any(Object),
      });
      expect(mockNotificationsService.create).toHaveBeenCalled();
      expect(mockMailService.sendMaintenanceSubmittedEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException if lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(service.create(tenantId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the tenant', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);

      await expect(service.create('other-user', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if lease is not active', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue({
        ...mockLease,
        status: LeaseStatus.DRAFT,
      });

      await expect(service.create(tenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // FIND ALL TESTS
  // ============================================
  describe('findAll', () => {
    it('should return paginated list for tenant', async () => {
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([mockRequest]);
      mockPrismaService.maintenanceRequest.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, { role: 'tenant', page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.maintenanceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should return paginated list for landlord', async () => {
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([mockRequest]);
      mockPrismaService.maintenanceRequest.count.mockResolvedValue(1);

      const result = await service.findAll(landlordId, { role: 'landlord', page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.maintenanceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ landlordId }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);
      mockPrismaService.maintenanceRequest.count.mockResolvedValue(0);

      await service.findAll(tenantId, {
        role: 'tenant',
        status: MaintenanceRequestStatus.APPROVED,
      });

      expect(mockPrismaService.maintenanceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MaintenanceRequestStatus.APPROVED,
          }),
        }),
      );
    });
  });

  // ============================================
  // FIND ONE TESTS
  // ============================================
  describe('findOne', () => {
    it('should return request for tenant', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      const result = await service.findOne(requestId, tenantId);

      expect(result.id).toBe(requestId);
    });

    it('should return request for landlord', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      const result = await service.findOne(requestId, landlordId);

      expect(result.id).toBe(requestId);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.findOne(requestId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================
  describe('update', () => {
    const updateDto = {
      title: 'Updated title',
    };

    it('should update request if tenant and status is SUBMITTED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        title: 'Updated title',
      });

      const result = await service.update(requestId, tenantId, updateDto);

      expect(result.title).toBe('Updated title');
    });

    it('should throw ForbiddenException if not tenant', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.update(requestId, landlordId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if status is not SUBMITTED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });

      await expect(service.update(requestId, tenantId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // APPROVE TESTS
  // ============================================
  describe('approve', () => {
    it('should approve request if landlord and status is SUBMITTED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });

      const result = await service.approve(requestId, landlordId);

      expect(result.status).toBe(MaintenanceRequestStatus.APPROVED);
      expect(mockNotificationsService.create).toHaveBeenCalled();
      expect(mockMailService.sendMaintenanceApprovedEmail).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not landlord', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.approve(requestId, tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if status is not SUBMITTED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });

      await expect(service.approve(requestId, landlordId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // REJECT TESTS
  // ============================================
  describe('reject', () => {
    const rejectDto = { rejectionReason: 'Tenant caused the damage' };

    it('should reject request if landlord and status is SUBMITTED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.REJECTED,
        rejectionReason: rejectDto.rejectionReason,
      });

      const result = await service.reject(requestId, landlordId, rejectDto);

      expect(result.status).toBe(MaintenanceRequestStatus.REJECTED);
      expect(mockNotificationsService.create).toHaveBeenCalled();
      expect(mockMailService.sendMaintenanceRejectedEmail).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not landlord', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.reject(requestId, tenantId, rejectDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================
  // ASSIGN PROVIDER TESTS
  // ============================================
  describe('assignProvider', () => {
    const assignDto = {
      providerId,
      scheduledDate: '2025-02-01',
      scheduledTimeSlot: '09:00-12:00',
    };

    it('should assign provider if landlord and status is APPROVED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.ASSIGNED,
        assignedProviderId: providerId,
        assignedProvider: mockProvider,
      });

      const result = await service.assignProvider(requestId, landlordId, assignDto);

      expect(result.status).toBe(MaintenanceRequestStatus.ASSIGNED);
      expect(mockNotificationsService.create).toHaveBeenCalled();
      expect(mockMailService.sendMaintenanceAssignedEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });
      mockPrismaService.serviceProvider.findUnique.mockResolvedValue(null);

      await expect(
        service.assignProvider(requestId, landlordId, assignDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not landlord', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });

      await expect(
        service.assignProvider(requestId, tenantId, assignDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // SCHEDULE TESTS
  // ============================================
  describe('schedule', () => {
    const scheduleDto = {
      scheduledDate: '2025-02-01',
      scheduledTimeSlot: '09:00-12:00',
    };

    it('should schedule if landlord and status is ASSIGNED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.ASSIGNED,
        assignedProviderId: providerId,
        assignedProvider: mockProvider,
      });
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.SCHEDULED,
        scheduledDate: new Date('2025-02-01'),
        scheduledTimeSlot: '09:00-12:00',
        assignedProvider: mockProvider,
      });

      const result = await service.schedule(requestId, landlordId, scheduleDto);

      expect(result.status).toBe(MaintenanceRequestStatus.SCHEDULED);
      expect(mockNotificationsService.create).toHaveBeenCalled();
      expect(mockMailService.sendMaintenanceScheduledEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status is not ASSIGNED', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.schedule(requestId, landlordId, scheduleDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // START WORK TESTS
  // ============================================
  describe('startWork', () => {
    it('should start work if provider and status is SCHEDULED', async () => {
      const requestWithProvider = {
        ...mockRequest,
        status: MaintenanceRequestStatus.SCHEDULED,
        assignedProviderId: providerId,
        assignedProvider: { ...mockProvider, userId: providerId },
      };
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(requestWithProvider);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...requestWithProvider,
        status: MaintenanceRequestStatus.IN_PROGRESS,
      });

      const result = await service.startWork(requestId, providerId);

      expect(result.status).toBe(MaintenanceRequestStatus.IN_PROGRESS);
    });

    it('should throw ForbiddenException if not assigned provider', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.SCHEDULED,
        assignedProviderId: providerId,
        assignedProvider: { ...mockProvider, userId: providerId },
      });

      await expect(service.startWork(requestId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================
  // COMPLETE TESTS
  // ============================================
  describe('complete', () => {
    const completeDto = {
      completionNotes: 'Fixed the leak',
      actualCost: 150,
    };

    it('should complete work if provider and status is IN_PROGRESS', async () => {
      const requestWithProvider = {
        ...mockRequest,
        status: MaintenanceRequestStatus.IN_PROGRESS,
        assignedProviderId: providerId,
        assignedProvider: { ...mockProvider, userId: providerId },
      };
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(requestWithProvider);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...requestWithProvider,
        status: MaintenanceRequestStatus.COMPLETED,
        completionNotes: 'Fixed the leak',
        actualCost: new Decimal(150),
      });

      const result = await service.complete(requestId, providerId, completeDto);

      expect(result.status).toBe(MaintenanceRequestStatus.COMPLETED);
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2); // tenant and landlord
      expect(mockMailService.sendMaintenanceCompletedEmail).toHaveBeenCalledTimes(2);
    });

    it('should throw ForbiddenException if not assigned provider', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.IN_PROGRESS,
        assignedProviderId: providerId,
        assignedProvider: { ...mockProvider, userId: providerId },
      });

      await expect(
        service.complete(requestId, 'other-user', completeDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // CONFIRM COMPLETION TESTS
  // ============================================
  describe('confirmCompletion', () => {
    it('should allow tenant to confirm completion', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
      });
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
        confirmedByTenant: true,
      });

      const result = await service.confirmCompletion(requestId, tenantId);

      expect(result.confirmedByTenant).toBe(true);
    });

    it('should allow landlord to confirm completion', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
      });
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
        confirmedByLandlord: true,
      });

      const result = await service.confirmCompletion(requestId, landlordId);

      expect(result.confirmedByLandlord).toBe(true);
    });

    it('should set status to CONFIRMED when both parties confirm', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
        confirmedByTenant: true, // Already confirmed by tenant
      });
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.CONFIRMED,
        confirmedByTenant: true,
        confirmedByLandlord: true,
      });

      const result = await service.confirmCompletion(requestId, landlordId);

      expect(result.status).toBe(MaintenanceRequestStatus.CONFIRMED);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
      });

      await expect(
        service.confirmCompletion(requestId, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // CANCEL TESTS
  // ============================================
  describe('cancel', () => {
    it('should allow tenant to cancel SUBMITTED request', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.CANCELLED,
      });

      const result = await service.cancel(requestId, tenantId);

      expect(result.status).toBe(MaintenanceRequestStatus.CANCELLED);
    });

    it('should allow landlord to cancel any cancellable request', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });
      mockPrismaService.maintenanceRequest.update.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.CANCELLED,
      });

      const result = await service.cancel(requestId, landlordId);

      expect(result.status).toBe(MaintenanceRequestStatus.CANCELLED);
    });

    it('should throw BadRequestException for tenant cancelling non-SUBMITTED request', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      });

      await expect(service.cancel(requestId, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already completed request', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
      });

      await expect(service.cancel(requestId, landlordId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.cancel(requestId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
