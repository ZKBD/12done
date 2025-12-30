import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AiMaintenanceService } from './ai-maintenance.service';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import {
  MaintenanceRequestStatus,
  MaintenanceRequestType,
  MaintenancePriority,
} from '@prisma/client';

describe('MaintenanceController', () => {
  let controller: MaintenanceController;

  const mockMaintenanceService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    assignProvider: jest.fn(),
    schedule: jest.fn(),
    startWork: jest.fn(),
    complete: jest.fn(),
    confirmCompletion: jest.fn(),
    cancel: jest.fn(),
  };

  const mockAiMaintenanceService = {
    analyzeRequest: jest.fn(),
    getRequestSuggestions: jest.fn(),
    suggestAppointments: jest.fn(),
  };

  const mockPredictiveMaintenanceService = {
    getPropertyHistory: jest.fn(),
    getPropertyPredictions: jest.fn(),
    getPortfolioPredictions: jest.fn(),
    getAlerts: jest.fn(),
    getHvacPrediction: jest.fn(),
  };

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockRequest = {
    id: 'request-123',
    propertyId: 'property-123',
    leaseId: 'lease-123',
    tenantId: mockUser.id,
    landlordId: 'landlord-123',
    type: MaintenanceRequestType.PLUMBING,
    priority: MaintenancePriority.NORMAL,
    title: 'Leaking faucet',
    description: 'The kitchen faucet has been dripping.',
    status: MaintenanceRequestStatus.SUBMITTED,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        {
          provide: MaintenanceService,
          useValue: mockMaintenanceService,
        },
        {
          provide: AiMaintenanceService,
          useValue: mockAiMaintenanceService,
        },
        {
          provide: PredictiveMaintenanceService,
          useValue: mockPredictiveMaintenanceService,
        },
      ],
    }).compile();

    controller = module.get<MaintenanceController>(MaintenanceController);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with correct parameters', async () => {
      const dto = {
        leaseId: 'lease-123',
        type: MaintenanceRequestType.PLUMBING,
        title: 'Leaking faucet',
        description: 'The kitchen faucet has been dripping.',
      };

      mockMaintenanceService.create.mockResolvedValue(mockRequest);

      const result = await controller.create(mockUser as any, dto);

      expect(result).toEqual(mockRequest);
      expect(mockMaintenanceService.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of requests', async () => {
      const query = { page: 1, limit: 10, role: 'tenant' as const };
      const expectedResult = {
        data: [mockRequest],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockMaintenanceService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser as any, query);

      expect(result).toEqual(expectedResult);
      expect(mockMaintenanceService.findAll).toHaveBeenCalledWith(mockUser.id, query);
    });
  });

  describe('findOne', () => {
    it('should return request details', async () => {
      mockMaintenanceService.findOne.mockResolvedValue(mockRequest);

      const result = await controller.findOne('request-123', mockUser as any);

      expect(result).toEqual(mockRequest);
      expect(mockMaintenanceService.findOne).toHaveBeenCalledWith('request-123', mockUser.id);
    });
  });

  describe('update', () => {
    it('should update request', async () => {
      const dto = { title: 'Updated title' };
      const updatedRequest = { ...mockRequest, title: 'Updated title' };

      mockMaintenanceService.update.mockResolvedValue(updatedRequest);

      const result = await controller.update('request-123', mockUser as any, dto);

      expect(result).toEqual(updatedRequest);
      expect(mockMaintenanceService.update).toHaveBeenCalledWith('request-123', mockUser.id, dto);
    });
  });

  describe('approve', () => {
    it('should approve request', async () => {
      const approvedRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.APPROVED,
      };

      mockMaintenanceService.approve.mockResolvedValue(approvedRequest);

      const result = await controller.approve('request-123', mockUser as any);

      expect(result.status).toBe(MaintenanceRequestStatus.APPROVED);
      expect(mockMaintenanceService.approve).toHaveBeenCalledWith('request-123', mockUser.id);
    });
  });

  describe('reject', () => {
    it('should reject request', async () => {
      const dto = { rejectionReason: 'Tenant caused the damage' };
      const rejectedRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      };

      mockMaintenanceService.reject.mockResolvedValue(rejectedRequest);

      const result = await controller.reject('request-123', mockUser as any, dto);

      expect(result.status).toBe(MaintenanceRequestStatus.REJECTED);
      expect(mockMaintenanceService.reject).toHaveBeenCalledWith('request-123', mockUser.id, dto);
    });
  });

  describe('assignProvider', () => {
    it('should assign provider to request', async () => {
      const dto = { providerId: 'provider-123' };
      const assignedRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.ASSIGNED,
        assignedProviderId: dto.providerId,
      };

      mockMaintenanceService.assignProvider.mockResolvedValue(assignedRequest);

      const result = await controller.assignProvider('request-123', mockUser as any, dto);

      expect(result.status).toBe(MaintenanceRequestStatus.ASSIGNED);
      expect(mockMaintenanceService.assignProvider).toHaveBeenCalledWith('request-123', mockUser.id, dto);
    });
  });

  describe('schedule', () => {
    it('should schedule maintenance work', async () => {
      const dto = { scheduledDate: '2025-02-01', scheduledTimeSlot: '09:00-12:00' };
      const scheduledRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.SCHEDULED,
        scheduledDate: new Date('2025-02-01'),
        scheduledTimeSlot: dto.scheduledTimeSlot,
      };

      mockMaintenanceService.schedule.mockResolvedValue(scheduledRequest);

      const result = await controller.schedule('request-123', mockUser as any, dto);

      expect(result.status).toBe(MaintenanceRequestStatus.SCHEDULED);
      expect(mockMaintenanceService.schedule).toHaveBeenCalledWith('request-123', mockUser.id, dto);
    });
  });

  describe('startWork', () => {
    it('should start work on request', async () => {
      const inProgressRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.IN_PROGRESS,
      };

      mockMaintenanceService.startWork.mockResolvedValue(inProgressRequest);

      const result = await controller.startWork('request-123', mockUser as any);

      expect(result.status).toBe(MaintenanceRequestStatus.IN_PROGRESS);
      expect(mockMaintenanceService.startWork).toHaveBeenCalledWith('request-123', mockUser.id);
    });
  });

  describe('complete', () => {
    it('should complete work', async () => {
      const dto = { completionNotes: 'Fixed the leak', actualCost: 150 };
      const completedRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
        completionNotes: dto.completionNotes,
        actualCost: dto.actualCost,
      };

      mockMaintenanceService.complete.mockResolvedValue(completedRequest);

      const result = await controller.complete('request-123', mockUser as any, dto);

      expect(result.status).toBe(MaintenanceRequestStatus.COMPLETED);
      expect(mockMaintenanceService.complete).toHaveBeenCalledWith('request-123', mockUser.id, dto);
    });
  });

  describe('confirmCompletion', () => {
    it('should confirm completion', async () => {
      const confirmedRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.COMPLETED,
        confirmedByTenant: true,
      };

      mockMaintenanceService.confirmCompletion.mockResolvedValue(confirmedRequest);

      const result = await controller.confirmCompletion('request-123', mockUser as any);

      expect(result.confirmedByTenant).toBe(true);
      expect(mockMaintenanceService.confirmCompletion).toHaveBeenCalledWith('request-123', mockUser.id);
    });
  });

  describe('cancel', () => {
    it('should cancel request', async () => {
      const cancelledRequest = {
        ...mockRequest,
        status: MaintenanceRequestStatus.CANCELLED,
      };

      mockMaintenanceService.cancel.mockResolvedValue(cancelledRequest);

      const result = await controller.cancel('request-123', mockUser as any);

      expect(result.status).toBe(MaintenanceRequestStatus.CANCELLED);
      expect(mockMaintenanceService.cancel).toHaveBeenCalledWith('request-123', mockUser.id);
    });
  });
});
