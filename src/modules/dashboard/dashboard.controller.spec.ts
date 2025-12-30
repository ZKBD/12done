import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ExpenseService } from './expense.service';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantDocumentService } from './tenant-document.service';
import { ExpenseCategoryEnum } from './dto';

describe('DashboardController', () => {
  let controller: DashboardController;

  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockExpenseId = 'expense-123';

  const mockDashboardResponse = {
    totalProperties: 5,
    activeLeases: 3,
    vacantProperties: 2,
    pendingMaintenanceRequests: 1,
    unreadMessages: 4,
    totalExpectedIncome: 5000,
    totalActualIncome: 4500,
    totalExpenses: 1000,
    netIncome: 3500,
    currency: 'EUR',
    properties: [],
    monthlyIncome: [],
    expensesByCategory: [],
    maintenanceRequests: [],
    recentConversations: [],
  };

  const mockExpense = {
    id: mockExpenseId,
    landlordId: mockUser.id,
    propertyId: 'property-123',
    category: 'MAINTENANCE',
    description: 'Plumbing repair',
    amount: 500,
    currency: 'EUR',
    expenseDate: new Date(),
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDashboardService = {
    getLandlordDashboard: jest.fn(),
  };

  const mockExpenseService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockTenantDashboardService = {
    getTenantDashboard: jest.fn(),
  };

  const mockTenantDocumentService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: ExpenseService, useValue: mockExpenseService },
        { provide: TenantDashboardService, useValue: mockTenantDashboardService },
        { provide: TenantDocumentService, useValue: mockTenantDocumentService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    jest.clearAllMocks();
  });

  describe('getLandlordDashboard', () => {
    it('should call dashboardService.getLandlordDashboard with correct parameters (PROD-100.1)', async () => {
      mockDashboardService.getLandlordDashboard.mockResolvedValue(
        mockDashboardResponse,
      );
      const query = { startDate: '2025-01-01', endDate: '2025-12-31' };

      const result = await controller.getLandlordDashboard(
        mockUser as any,
        query,
      );

      expect(result).toEqual(mockDashboardResponse);
      expect(mockDashboardService.getLandlordDashboard).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
    });
  });

  describe('createExpense', () => {
    it('should call expenseService.create with correct parameters (PROD-100.4)', async () => {
      mockExpenseService.create.mockResolvedValue(mockExpense);
      const dto = {
        category: ExpenseCategoryEnum.MAINTENANCE,
        description: 'Plumbing repair',
        amount: 500,
        expenseDate: '2025-01-15',
      };

      const result = await controller.createExpense(mockUser as any, dto);

      expect(result).toEqual(mockExpense);
      expect(mockExpenseService.create).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('getExpenses', () => {
    it('should call expenseService.findAll with correct parameters', async () => {
      const mockResponse = {
        data: [mockExpense],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockExpenseService.findAll.mockResolvedValue(mockResponse);
      const query = { page: 1, limit: 20 };

      const result = await controller.getExpenses(mockUser as any, query);

      expect(result).toEqual(mockResponse);
      expect(mockExpenseService.findAll).toHaveBeenCalledWith(mockUser.id, query);
    });
  });

  describe('getExpense', () => {
    it('should call expenseService.findOne with correct parameters', async () => {
      mockExpenseService.findOne.mockResolvedValue(mockExpense);

      const result = await controller.getExpense(mockExpenseId, mockUser as any);

      expect(result).toEqual(mockExpense);
      expect(mockExpenseService.findOne).toHaveBeenCalledWith(
        mockExpenseId,
        mockUser.id,
      );
    });
  });

  describe('updateExpense', () => {
    it('should call expenseService.update with correct parameters', async () => {
      const updatedExpense = { ...mockExpense, description: 'Updated' };
      mockExpenseService.update.mockResolvedValue(updatedExpense);
      const dto = { description: 'Updated' };

      const result = await controller.updateExpense(
        mockExpenseId,
        mockUser as any,
        dto,
      );

      expect(result).toEqual(updatedExpense);
      expect(mockExpenseService.update).toHaveBeenCalledWith(
        mockExpenseId,
        mockUser.id,
        dto,
      );
    });
  });

  describe('deleteExpense', () => {
    it('should call expenseService.delete with correct parameters', async () => {
      const deleteResponse = { message: 'Expense deleted successfully' };
      mockExpenseService.delete.mockResolvedValue(deleteResponse);

      const result = await controller.deleteExpense(mockExpenseId, mockUser as any);

      expect(result).toEqual(deleteResponse);
      expect(mockExpenseService.delete).toHaveBeenCalledWith(
        mockExpenseId,
        mockUser.id,
      );
    });
  });
});
