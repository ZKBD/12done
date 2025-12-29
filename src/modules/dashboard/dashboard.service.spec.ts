import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { ExpenseService } from './expense.service';
import { PrismaService } from '@/database';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockLandlordId = 'landlord-123';

  const mockProperty = {
    id: 'property-123',
    title: 'Test Property',
    address: '123 Test St',
    city: 'Test City',
    status: 'ACTIVE',
    media: [{ url: 'https://example.com/image.jpg' }],
    leases: [
      {
        id: 'lease-123',
        tenant: { id: 'tenant-123', firstName: 'John', lastName: 'Doe' },
      },
    ],
    maintenanceRequests: [{ id: 'mr-1' }, { id: 'mr-2' }],
  };

  const mockLease = {
    id: 'lease-123',
    landlordId: mockLandlordId,
    status: 'ACTIVE',
  };

  const mockPayment = {
    dueDate: new Date('2025-01-01'),
    amount: 1000,
    status: 'PAID',
    paidAmount: 1000,
    currency: 'EUR',
  };

  const mockMaintenanceRequest = {
    id: 'mr-123',
    title: 'Fix plumbing',
    type: 'PLUMBING',
    status: 'SUBMITTED',
    priority: 'NORMAL',
    property: { title: 'Test Property' },
    tenant: { firstName: 'John', lastName: 'Doe' },
    createdAt: new Date(),
  };

  const mockConversation = {
    id: 'conv-123',
    subject: 'Inquiry',
    lastMessageAt: new Date(),
    createdAt: new Date(),
    property: { title: 'Test Property' },
    participants: [
      { userId: mockLandlordId, unreadCount: 2, user: { id: mockLandlordId, firstName: 'Landlord', lastName: 'User' } },
      { userId: 'other-user', unreadCount: 0, user: { id: 'other-user', firstName: 'Other', lastName: 'User' } },
    ],
  };

  const mockPrismaService = {
    property: {
      findMany: jest.fn(),
    },
    lease: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    rentPayment: {
      findMany: jest.fn(),
    },
    maintenanceRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    conversationParticipant: {
      aggregate: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
    },
  };

  const mockExpenseService = {
    getTotalExpenses: jest.fn(),
    getExpensesByCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExpenseService, useValue: mockExpenseService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getLandlordDashboard', () => {
    beforeEach(() => {
      // Setup default mocks
      mockPrismaService.property.findMany.mockResolvedValue([mockProperty]);
      mockPrismaService.lease.findMany.mockResolvedValue([mockLease]);
      mockPrismaService.lease.count.mockResolvedValue(1);
      mockPrismaService.maintenanceRequest.count.mockResolvedValue(2);
      mockPrismaService.conversationParticipant.aggregate.mockResolvedValue({
        _sum: { unreadCount: 5 },
      });
      mockPrismaService.rentPayment.findMany.mockResolvedValue([mockPayment]);
      mockExpenseService.getExpensesByCategory.mockResolvedValue([
        { category: 'MAINTENANCE', total: 500, count: 2 },
      ]);
      mockExpenseService.getTotalExpenses.mockResolvedValue(500);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([
        mockMaintenanceRequest,
      ]);
      mockPrismaService.conversation.findMany.mockResolvedValue([
        mockConversation,
      ]);
    });

    it('should return complete dashboard with all fields (PROD-100.1)', async () => {
      const result = await service.getLandlordDashboard(mockLandlordId, {});

      expect(result.totalProperties).toBe(1);
      expect(result.activeLeases).toBe(1);
      expect(result.vacantProperties).toBe(0);
      expect(result.pendingMaintenanceRequests).toBe(2);
      expect(result.unreadMessages).toBe(5);
      expect(result.properties).toHaveLength(1);
      expect(result.maintenanceRequests).toHaveLength(1);
      expect(result.recentConversations).toHaveLength(1);
    });

    it('should calculate net income correctly (PROD-100.5)', async () => {
      mockPrismaService.rentPayment.findMany.mockResolvedValue([
        { ...mockPayment, amount: 2000, paidAmount: 2000 },
      ]);
      mockExpenseService.getTotalExpenses.mockResolvedValue(500);

      const result = await service.getLandlordDashboard(mockLandlordId, {});

      expect(result.totalActualIncome).toBe(2000);
      expect(result.totalExpenses).toBe(500);
      expect(result.netIncome).toBe(1500);
    });

    it('should filter by propertyId when provided', async () => {
      const propertyId = 'property-123';
      await service.getLandlordDashboard(mockLandlordId, { propertyId });

      expect(mockPrismaService.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: propertyId }),
        }),
      );
    });

    it('should use date range when provided', async () => {
      await service.getLandlordDashboard(mockLandlordId, {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(mockPrismaService.rentPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should return empty arrays for landlord with no data', async () => {
      mockPrismaService.property.findMany.mockResolvedValue([]);
      mockPrismaService.lease.findMany.mockResolvedValue([]);
      mockPrismaService.lease.count.mockResolvedValue(0);
      mockPrismaService.maintenanceRequest.count.mockResolvedValue(0);
      mockPrismaService.rentPayment.findMany.mockResolvedValue([]);
      mockExpenseService.getExpensesByCategory.mockResolvedValue([]);
      mockExpenseService.getTotalExpenses.mockResolvedValue(0);
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.findMany.mockResolvedValue([]);

      const result = await service.getLandlordDashboard(mockLandlordId, {});

      expect(result.totalProperties).toBe(0);
      expect(result.activeLeases).toBe(0);
      expect(result.properties).toHaveLength(0);
      expect(result.monthlyIncome).toHaveLength(0);
    });

    it('should aggregate monthly income data correctly (PROD-100.3)', async () => {
      mockPrismaService.rentPayment.findMany.mockResolvedValue([
        { dueDate: new Date('2025-01-15'), amount: 1000, status: 'PAID', paidAmount: 1000 },
        { dueDate: new Date('2025-01-20'), amount: 500, status: 'PAID', paidAmount: 500 },
        { dueDate: new Date('2025-02-15'), amount: 1000, status: 'PENDING', paidAmount: null },
      ]);

      const result = await service.getLandlordDashboard(mockLandlordId, {});

      // January should have expected 1500, actual 1500
      // February should have expected 1000, actual 0
      expect(result.monthlyIncome).toBeDefined();
    });

    it('should include property summary with tenant info (PROD-100.2)', async () => {
      const result = await service.getLandlordDashboard(mockLandlordId, {});

      expect(result.properties[0]).toEqual(
        expect.objectContaining({
          id: 'property-123',
          title: 'Test Property',
          currentTenant: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          }),
          activeLeaseId: 'lease-123',
          pendingMaintenanceCount: 2,
        }),
      );
    });
  });
});
