import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ExpenseCategory } from '@prisma/client';
import { PrismaService } from '@/database';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
  ExpenseResponseDto,
  ExpenseListResponseDto,
} from './dto';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new expense (PROD-100.4)
   */
  async create(
    landlordId: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    // If propertyId provided, verify ownership
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      if (property.ownerId !== landlordId) {
        throw new ForbiddenException('You do not own this property');
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        landlordId,
        propertyId: dto.propertyId,
        category: dto.category as ExpenseCategory,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency || 'EUR',
        expenseDate: new Date(dto.expenseDate),
        receiptUrl: dto.receiptUrl,
        notes: dto.notes,
        isRecurring: dto.isRecurring || false,
        recurringPeriod: dto.recurringPeriod,
      },
      include: {
        property: { select: { id: true, title: true, address: true } },
      },
    });

    return this.mapToResponseDto(expense);
  }

  /**
   * Get all expenses for a landlord with filtering (PROD-100.4)
   */
  async findAll(
    landlordId: string,
    query: ExpenseQueryDto,
  ): Promise<ExpenseListResponseDto> {
    const { page = 1, limit = 20, propertyId, category, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = { landlordId };

    if (propertyId) where.propertyId = propertyId;
    if (category) where.category = category as ExpenseCategory;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          property: { select: { id: true, title: true, address: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses.map((e) => this.mapToResponseDto(e)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single expense by ID
   */
  async findOne(
    expenseId: string,
    landlordId: string,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        property: { select: { id: true, title: true, address: true } },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.landlordId !== landlordId) {
      throw new ForbiddenException('Not authorized to view this expense');
    }

    return this.mapToResponseDto(expense);
  }

  /**
   * Update an expense
   */
  async update(
    expenseId: string,
    landlordId: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.landlordId !== landlordId) {
      throw new ForbiddenException('Not authorized to update this expense');
    }

    // If changing propertyId, verify ownership
    if (dto.propertyId && dto.propertyId !== expense.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property || property.ownerId !== landlordId) {
        throw new ForbiddenException('Invalid property');
      }
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        propertyId: dto.propertyId,
        category: dto.category as ExpenseCategory | undefined,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        receiptUrl: dto.receiptUrl,
        notes: dto.notes,
        isRecurring: dto.isRecurring,
        recurringPeriod: dto.recurringPeriod,
      },
      include: {
        property: { select: { id: true, title: true, address: true } },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete an expense
   */
  async delete(
    expenseId: string,
    landlordId: string,
  ): Promise<{ message: string }> {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.landlordId !== landlordId) {
      throw new ForbiddenException('Not authorized to delete this expense');
    }

    await this.prisma.expense.delete({ where: { id: expenseId } });
    return { message: 'Expense deleted successfully' };
  }

  /**
   * Get total expenses for a landlord (for dashboard)
   */
  async getTotalExpenses(
    landlordId: string,
    startDate?: Date,
    endDate?: Date,
    propertyId?: string,
  ): Promise<number> {
    const where: Prisma.ExpenseWhereInput = { landlordId };
    if (propertyId) where.propertyId = propertyId;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = startDate;
      if (endDate) where.expenseDate.lte = endDate;
    }

    const result = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    });

    return Number(result._sum.amount || 0);
  }

  /**
   * Get expenses grouped by category (for dashboard)
   */
  async getExpensesByCategory(
    landlordId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ category: string; total: number; count: number }[]> {
    const where: Prisma.ExpenseWhereInput = { landlordId };
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = startDate;
      if (endDate) where.expenseDate.lte = endDate;
    }

    const result = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    return result.map((r) => ({
      category: r.category,
      total: Number(r._sum.amount || 0),
      count: r._count,
    }));
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(expense: {
    id: string;
    landlordId: string;
    propertyId: string | null;
    category: ExpenseCategory;
    description: string;
    amount: unknown;
    currency: string;
    expenseDate: Date;
    receiptUrl: string | null;
    notes: string | null;
    isRecurring: boolean;
    recurringPeriod: string | null;
    createdAt: Date;
    updatedAt: Date;
    property?: { id: string; title: string; address: string } | null;
  }): ExpenseResponseDto {
    return {
      id: expense.id,
      landlordId: expense.landlordId,
      propertyId: expense.propertyId || undefined,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount),
      currency: expense.currency,
      expenseDate: expense.expenseDate,
      receiptUrl: expense.receiptUrl || undefined,
      notes: expense.notes || undefined,
      isRecurring: expense.isRecurring,
      recurringPeriod: expense.recurringPeriod || undefined,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      property: expense.property || undefined,
    };
  }
}
