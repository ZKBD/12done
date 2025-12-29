import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { PrismaService } from '@/database';
import { ExpenseCategoryEnum } from './dto';

describe('ExpenseService', () => {
  let service: ExpenseService;

  const mockLandlordId = 'landlord-123';
  const mockPropertyId = 'property-123';
  const mockExpenseId = 'expense-123';

  const mockProperty = {
    id: mockPropertyId,
    ownerId: mockLandlordId,
    title: 'Test Property',
    address: '123 Test St',
  };

  const mockExpense = {
    id: mockExpenseId,
    landlordId: mockLandlordId,
    propertyId: mockPropertyId,
    category: 'MAINTENANCE',
    description: 'Plumbing repair',
    amount: 500,
    currency: 'EUR',
    expenseDate: new Date('2025-01-15'),
    receiptUrl: 'https://example.com/receipt.pdf',
    notes: 'Emergency repair',
    isRecurring: false,
    recurringPeriod: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: {
      id: mockPropertyId,
      title: 'Test Property',
      address: '123 Test St',
    },
  };

  const mockPrismaService = {
    property: {
      findUnique: jest.fn(),
    },
    expense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      propertyId: mockPropertyId,
      category: ExpenseCategoryEnum.MAINTENANCE,
      description: 'Plumbing repair',
      amount: 500,
      currency: 'EUR',
      expenseDate: '2025-01-15',
    };

    it('should create an expense successfully (PROD-100.4)', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.expense.create.mockResolvedValue(mockExpense);

      const result = await service.create(mockLandlordId, createDto);

      expect(result.id).toBe(mockExpenseId);
      expect(result.category).toBe('MAINTENANCE');
      expect(result.amount).toBe(500);
      expect(mockPrismaService.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            landlordId: mockLandlordId,
            propertyId: mockPropertyId,
            category: 'MAINTENANCE',
          }),
        }),
      );
    });

    it('should create expense without property (general expense)', async () => {
      const dtoWithoutProperty = { ...createDto, propertyId: undefined };
      const expenseWithoutProperty = { ...mockExpense, propertyId: null, property: null };
      mockPrismaService.expense.create.mockResolvedValue(expenseWithoutProperty);

      const result = await service.create(mockLandlordId, dtoWithoutProperty);

      expect(result.propertyId).toBeUndefined();
      expect(mockPrismaService.property.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if property not found', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(service.create(mockLandlordId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not property owner', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        ...mockProperty,
        ownerId: 'other-user',
      });

      await expect(service.create(mockLandlordId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses (PROD-100.4)', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([mockExpense]);
      mockPrismaService.expense.count.mockResolvedValue(1);

      const result = await service.findAll(mockLandlordId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by category', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([mockExpense]);
      mockPrismaService.expense.count.mockResolvedValue(1);

      await service.findAll(mockLandlordId, {
        category: ExpenseCategoryEnum.MAINTENANCE,
      });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'MAINTENANCE',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([]);
      mockPrismaService.expense.count.mockResolvedValue(0);

      await service.findAll(mockLandlordId, {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expenseDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter by property', async () => {
      mockPrismaService.expense.findMany.mockResolvedValue([mockExpense]);
      mockPrismaService.expense.count.mockResolvedValue(1);

      await service.findAll(mockLandlordId, { propertyId: mockPropertyId });

      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            propertyId: mockPropertyId,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return expense for owner', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);

      const result = await service.findOne(mockExpenseId, mockLandlordId);

      expect(result.id).toBe(mockExpenseId);
    });

    it('should throw NotFoundException if expense not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(mockExpenseId, mockLandlordId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for other user', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        landlordId: 'other-user',
      });

      await expect(
        service.findOne(mockExpenseId, mockLandlordId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { description: 'Updated description', amount: 600 };

    it('should update expense successfully', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        ...updateDto,
      });

      const result = await service.update(mockExpenseId, mockLandlordId, updateDto);

      expect(result.description).toBe('Updated description');
      expect(result.amount).toBe(600);
    });

    it('should throw NotFoundException if expense not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockExpenseId, mockLandlordId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        landlordId: 'other-user',
      });

      await expect(
        service.update(mockExpenseId, mockLandlordId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should validate property ownership when changing propertyId', async () => {
      const newPropertyId = 'new-property';
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: newPropertyId,
        ownerId: 'other-owner',
      });

      await expect(
        service.update(mockExpenseId, mockLandlordId, { propertyId: newPropertyId }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete expense successfully', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrismaService.expense.delete.mockResolvedValue(mockExpense);

      const result = await service.delete(mockExpenseId, mockLandlordId);

      expect(result.message).toBe('Expense deleted successfully');
      expect(mockPrismaService.expense.delete).toHaveBeenCalledWith({
        where: { id: mockExpenseId },
      });
    });

    it('should throw NotFoundException if expense not found', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(mockExpenseId, mockLandlordId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrismaService.expense.findUnique.mockResolvedValue({
        ...mockExpense,
        landlordId: 'other-user',
      });

      await expect(
        service.delete(mockExpenseId, mockLandlordId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTotalExpenses', () => {
    it('should calculate total expenses correctly (PROD-100.5)', async () => {
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: 1500 },
      });

      const result = await service.getTotalExpenses(mockLandlordId);

      expect(result).toBe(1500);
    });

    it('should filter by date range', async () => {
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      await service.getTotalExpenses(mockLandlordId, startDate, endDate);

      expect(mockPrismaService.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expenseDate: expect.objectContaining({
              gte: startDate,
              lte: endDate,
            }),
          }),
        }),
      );
    });

    it('should return 0 when no expenses', async () => {
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getTotalExpenses(mockLandlordId);

      expect(result).toBe(0);
    });
  });

  describe('getExpensesByCategory', () => {
    it('should group expenses by category', async () => {
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { category: 'MAINTENANCE', _sum: { amount: 1000 }, _count: 5 },
        { category: 'INSURANCE', _sum: { amount: 500 }, _count: 2 },
      ]);

      const result = await service.getExpensesByCategory(mockLandlordId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        category: 'MAINTENANCE',
        total: 1000,
        count: 5,
      });
    });
  });
});
