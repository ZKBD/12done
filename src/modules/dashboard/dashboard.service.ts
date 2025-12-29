import { Injectable } from '@nestjs/common';
import {
  PropertyStatus,
  LeaseStatus,
  MaintenanceRequestStatus,
  RentPaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/database';
import { ExpenseService } from './expense.service';
import {
  DashboardQueryDto,
  LandlordDashboardResponseDto,
  DashboardPropertySummaryDto,
  MonthlyIncomeDto,
  MaintenanceSummaryDto,
  ConversationSummaryDto,
} from './dto';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private expenseService: ExpenseService,
  ) {}

  /**
   * Get aggregated landlord dashboard data (PROD-100.1)
   */
  async getLandlordDashboard(
    landlordId: string,
    query: DashboardQueryDto,
  ): Promise<LandlordDashboardResponseDto> {
    // Default date range: last 12 months
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getFullYear() - 1, endDate.getMonth(), 1);

    // Fetch all data in parallel for performance
    const [
      properties,
      activeLeases,
      pendingMaintenance,
      unreadMessagesCount,
      monthlyIncomeData,
      expensesByCategory,
      maintenanceRequests,
      recentConversations,
      totalExpenses,
    ] = await Promise.all([
      this.getPropertiesWithStatus(landlordId, query.propertyId),
      this.getActiveLeases(landlordId, query.propertyId),
      this.getPendingMaintenanceCount(landlordId, query.propertyId),
      this.getUnreadMessagesCount(landlordId),
      this.getMonthlyIncomeData(landlordId, startDate, endDate, query.propertyId),
      this.expenseService.getExpensesByCategory(landlordId, startDate, endDate),
      this.getMaintenanceRequests(landlordId, query.propertyId),
      this.getRecentConversations(landlordId),
      this.expenseService.getTotalExpenses(landlordId, startDate, endDate, query.propertyId),
    ]);

    // Calculate income totals
    const totalExpectedIncome = monthlyIncomeData.reduce(
      (sum, m) => sum + m.expectedIncome,
      0,
    );
    const totalActualIncome = monthlyIncomeData.reduce(
      (sum, m) => sum + m.actualIncome,
      0,
    );

    return {
      // Overview stats
      totalProperties: properties.length,
      activeLeases: activeLeases,
      vacantProperties: properties.filter((p) => !p.activeLeaseId).length,
      pendingMaintenanceRequests: pendingMaintenance,
      unreadMessages: unreadMessagesCount,

      // Financial summary
      totalExpectedIncome,
      totalActualIncome,
      totalExpenses,
      netIncome: totalActualIncome - totalExpenses,
      currency: 'EUR',

      // Detail data
      properties,
      monthlyIncome: monthlyIncomeData,
      expensesByCategory: expensesByCategory.map((e) => ({
        category: e.category,
        totalAmount: e.total,
        count: e.count,
        currency: 'EUR',
      })),
      maintenanceRequests,
      recentConversations,
    };
  }

  /**
   * Get properties with status and active lease info (PROD-100.2)
   */
  private async getPropertiesWithStatus(
    landlordId: string,
    propertyId?: string,
  ): Promise<DashboardPropertySummaryDto[]> {
    const where: Prisma.PropertyWhereInput = {
      ownerId: landlordId,
      status: { not: PropertyStatus.DELETED },
    };
    if (propertyId) where.id = propertyId;

    const properties = await this.prisma.property.findMany({
      where,
      include: {
        media: { where: { isPrimary: true }, take: 1 },
        leases: {
          where: { status: LeaseStatus.ACTIVE },
          include: {
            tenant: { select: { id: true, firstName: true, lastName: true } },
          },
          take: 1,
        },
        maintenanceRequests: {
          where: {
            status: {
              in: [
                MaintenanceRequestStatus.SUBMITTED,
                MaintenanceRequestStatus.APPROVED,
                MaintenanceRequestStatus.ASSIGNED,
                MaintenanceRequestStatus.SCHEDULED,
                MaintenanceRequestStatus.IN_PROGRESS,
              ],
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return properties.map((p) => ({
      id: p.id,
      title: p.title,
      address: p.address,
      city: p.city,
      status: p.status,
      primaryImageUrl: p.media[0]?.url,
      currentTenant: p.leases[0]?.tenant,
      activeLeaseId: p.leases[0]?.id,
      pendingMaintenanceCount: p.maintenanceRequests.length,
    }));
  }

  /**
   * Get count of active leases
   */
  private async getActiveLeases(
    landlordId: string,
    propertyId?: string,
  ): Promise<number> {
    const where: Prisma.LeaseWhereInput = {
      landlordId,
      status: LeaseStatus.ACTIVE,
    };
    if (propertyId) where.propertyId = propertyId;

    return this.prisma.lease.count({ where });
  }

  /**
   * Get count of pending maintenance requests (PROD-100.6)
   */
  private async getPendingMaintenanceCount(
    landlordId: string,
    propertyId?: string,
  ): Promise<number> {
    const where: Prisma.MaintenanceRequestWhereInput = {
      landlordId,
      status: {
        in: [
          MaintenanceRequestStatus.SUBMITTED,
          MaintenanceRequestStatus.APPROVED,
          MaintenanceRequestStatus.ASSIGNED,
          MaintenanceRequestStatus.SCHEDULED,
          MaintenanceRequestStatus.IN_PROGRESS,
        ],
      },
    };
    if (propertyId) where.propertyId = propertyId;

    return this.prisma.maintenanceRequest.count({ where });
  }

  /**
   * Get unread messages count (PROD-100.7)
   */
  private async getUnreadMessagesCount(userId: string): Promise<number> {
    const result = await this.prisma.conversationParticipant.aggregate({
      where: { userId, isArchived: false },
      _sum: { unreadCount: true },
    });
    return result._sum.unreadCount || 0;
  }

  /**
   * Get monthly income data for chart (PROD-100.3)
   */
  private async getMonthlyIncomeData(
    landlordId: string,
    startDate: Date,
    endDate: Date,
    propertyId?: string,
  ): Promise<MonthlyIncomeDto[]> {
    // Get all leases for this landlord
    const leaseWhere: Prisma.LeaseWhereInput = { landlordId };
    if (propertyId) leaseWhere.propertyId = propertyId;

    const leases = await this.prisma.lease.findMany({
      where: leaseWhere,
      select: { id: true },
    });
    const leaseIds = leases.map((l) => l.id);

    if (leaseIds.length === 0) {
      return [];
    }

    // Get all rent payments for these leases in the date range
    const payments = await this.prisma.rentPayment.findMany({
      where: {
        leaseId: { in: leaseIds },
        dueDate: { gte: startDate, lte: endDate },
      },
      select: {
        dueDate: true,
        amount: true,
        status: true,
        paidAmount: true,
        currency: true,
      },
    });

    // Group by month
    const monthlyData: Map<string, { expected: number; actual: number }> =
      new Map();

    for (const payment of payments) {
      const monthKey = `${payment.dueDate.getFullYear()}-${String(payment.dueDate.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyData.get(monthKey) || { expected: 0, actual: 0 };
      current.expected += Number(payment.amount);
      if (payment.status === RentPaymentStatus.PAID && payment.paidAmount) {
        current.actual += Number(payment.paidAmount);
      }
      monthlyData.set(monthKey, current);
    }

    // Convert to array sorted by month
    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        expectedIncome: data.expected,
        actualIncome: data.actual,
        currency: 'EUR',
      }));
  }

  /**
   * Get recent maintenance requests (PROD-100.6)
   */
  private async getMaintenanceRequests(
    landlordId: string,
    propertyId?: string,
  ): Promise<MaintenanceSummaryDto[]> {
    const where: Prisma.MaintenanceRequestWhereInput = {
      landlordId,
      status: {
        in: [
          MaintenanceRequestStatus.SUBMITTED,
          MaintenanceRequestStatus.APPROVED,
          MaintenanceRequestStatus.ASSIGNED,
          MaintenanceRequestStatus.SCHEDULED,
          MaintenanceRequestStatus.IN_PROGRESS,
          MaintenanceRequestStatus.COMPLETED,
        ],
      },
    };
    if (propertyId) where.propertyId = propertyId;

    const requests = await this.prisma.maintenanceRequest.findMany({
      where,
      include: {
        property: { select: { title: true } },
        tenant: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });

    return requests.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      priority: r.priority,
      propertyTitle: r.property.title,
      tenantName: r.tenant
        ? `${r.tenant.firstName} ${r.tenant.lastName}`
        : undefined,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get recent conversations (PROD-100.7)
   */
  private async getRecentConversations(
    userId: string,
  ): Promise<ConversationSummaryDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId, isArchived: false } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        property: { select: { title: true } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: 5,
    });

    return conversations.map((c) => {
      const currentParticipant = c.participants.find((p) => p.userId === userId);
      const otherParticipant = c.participants.find((p) => p.userId !== userId);
      return {
        id: c.id,
        subject: c.subject || undefined,
        propertyTitle: c.property?.title,
        participantName: otherParticipant
          ? `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`
          : 'Unknown',
        lastMessageAt: c.lastMessageAt || c.createdAt,
        unreadCount: currentParticipant?.unreadCount || 0,
      };
    });
  }
}
