import { Test, TestingModule } from '@nestjs/testing';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';
import { LeaseStatus, RentPaymentStatus } from '@prisma/client';

describe('LeasesController', () => {
  let controller: LeasesController;

  const mockLeasesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    terminate: jest.fn(),
    getPayments: jest.fn(),
    recordPayment: jest.fn(),
    waivePayment: jest.fn(),
  };

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockLease = {
    id: 'lease-123',
    propertyId: 'property-123',
    tenantId: 'tenant-123',
    landlordId: mockUser.id,
    startDate: new Date('2025-02-01'),
    endDate: new Date('2026-01-31'),
    rentAmount: 1500,
    currency: 'EUR',
    dueDay: 1,
    status: LeaseStatus.DRAFT,
  };

  const mockPayment = {
    id: 'payment-123',
    leaseId: 'lease-123',
    dueDate: new Date('2025-02-01'),
    amount: 1500,
    currency: 'EUR',
    status: RentPaymentStatus.PENDING,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeasesController],
      providers: [
        {
          provide: LeasesService,
          useValue: mockLeasesService,
        },
      ],
    }).compile();

    controller = module.get<LeasesController>(LeasesController);

    jest.clearAllMocks();
  });

  describe('createLease', () => {
    it('should call service.create with correct parameters', async () => {
      const dto = {
        propertyId: 'property-123',
        tenantId: 'tenant-123',
        startDate: '2025-02-01',
        endDate: '2026-01-31',
        rentAmount: 1500,
        dueDay: 1,
      };

      mockLeasesService.create.mockResolvedValue(mockLease);

      const result = await controller.createLease(mockUser as any, dto);

      expect(result).toEqual(mockLease);
      expect(mockLeasesService.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('getMyLeases', () => {
    it('should return user leases', async () => {
      const query = { page: 1, limit: 20 };
      const expectedResult = {
        data: [mockLease],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockLeasesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.getMyLeases(mockUser as any, query);

      expect(result).toEqual(expectedResult);
      expect(mockLeasesService.findAll).toHaveBeenCalledWith(mockUser.id, query);
    });
  });

  describe('getLease', () => {
    it('should return lease details', async () => {
      mockLeasesService.findOne.mockResolvedValue(mockLease);

      const result = await controller.getLease('lease-123', mockUser as any);

      expect(result).toEqual(mockLease);
      expect(mockLeasesService.findOne).toHaveBeenCalledWith(
        'lease-123',
        mockUser.id,
      );
    });
  });

  describe('updateLease', () => {
    it('should update draft lease', async () => {
      const dto = { rentAmount: 1600 };
      const updatedLease = { ...mockLease, rentAmount: 1600 };

      mockLeasesService.update.mockResolvedValue(updatedLease);

      const result = await controller.updateLease(
        'lease-123',
        mockUser as any,
        dto,
      );

      expect(result).toEqual(updatedLease);
      expect(mockLeasesService.update).toHaveBeenCalledWith(
        'lease-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('activateLease', () => {
    it('should activate lease', async () => {
      const activatedLease = { ...mockLease, status: LeaseStatus.ACTIVE };

      mockLeasesService.activate.mockResolvedValue(activatedLease);

      const result = await controller.activateLease('lease-123', mockUser as any);

      expect(result.status).toBe(LeaseStatus.ACTIVE);
      expect(mockLeasesService.activate).toHaveBeenCalledWith(
        'lease-123',
        mockUser.id,
      );
    });
  });

  describe('terminateLease', () => {
    it('should terminate lease', async () => {
      const terminatedLease = { ...mockLease, status: LeaseStatus.TERMINATED };
      const dto = { reason: 'Test termination' };

      mockLeasesService.terminate.mockResolvedValue(terminatedLease);

      const result = await controller.terminateLease(
        'lease-123',
        mockUser as any,
        dto,
      );

      expect(result.status).toBe(LeaseStatus.TERMINATED);
      expect(mockLeasesService.terminate).toHaveBeenCalledWith(
        'lease-123',
        mockUser.id,
        dto.reason,
      );
    });
  });

  describe('getPayments', () => {
    it('should return payment history', async () => {
      const query = {};
      const expectedResult = {
        data: [mockPayment],
        meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
      };

      mockLeasesService.getPayments.mockResolvedValue(expectedResult);

      const result = await controller.getPayments(
        'lease-123',
        mockUser as any,
        query,
      );

      expect(result).toEqual(expectedResult);
      expect(mockLeasesService.getPayments).toHaveBeenCalledWith(
        'lease-123',
        mockUser.id,
        query,
      );
    });
  });

  describe('recordPayment', () => {
    it('should record payment', async () => {
      const dto = {
        paidAmount: 1500,
        paymentMethod: 'bank_transfer',
      };
      const paidPayment = {
        ...mockPayment,
        status: RentPaymentStatus.PAID,
        paidAmount: 1500,
      };

      mockLeasesService.recordPayment.mockResolvedValue(paidPayment);

      const result = await controller.recordPayment(
        'lease-123',
        'payment-123',
        mockUser as any,
        dto,
      );

      expect(result.status).toBe(RentPaymentStatus.PAID);
      expect(mockLeasesService.recordPayment).toHaveBeenCalledWith(
        'lease-123',
        'payment-123',
        mockUser.id,
        dto,
      );
    });
  });

  describe('waivePayment', () => {
    it('should waive payment', async () => {
      const dto = { reason: 'First month free' };
      const waivedPayment = {
        ...mockPayment,
        status: RentPaymentStatus.WAIVED,
        notes: dto.reason,
      };

      mockLeasesService.waivePayment.mockResolvedValue(waivedPayment);

      const result = await controller.waivePayment(
        'lease-123',
        'payment-123',
        mockUser as any,
        dto,
      );

      expect(result.status).toBe(RentPaymentStatus.WAIVED);
      expect(mockLeasesService.waivePayment).toHaveBeenCalledWith(
        'lease-123',
        'payment-123',
        mockUser.id,
        dto,
      );
    });
  });
});
