import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database';
import {
  TenantDashboardQueryDto,
  TenantDashboardResponseDto,
  TenantLeaseSummaryDto,
  TenantPaymentSummaryDto,
  TenantMaintenanceSummaryDto,
  TenantRenewalSummaryDto,
} from './dto';

@Injectable()
export class TenantDashboardService {
  constructor(private prisma: PrismaService) {}

  async getTenantDashboard(
    tenantId: string,
    _query: TenantDashboardQueryDto,
  ): Promise<TenantDashboardResponseDto> {
    const _now = new Date();

    // Run all queries in parallel for better performance
    const [
      leases,
      upcomingPayments,
      overduePayments,
      maintenanceRequests,
      renewalOffers,
      unreadMessagesCount,
      documentsCount,
    ] = await Promise.all([
      this.getActiveLeases(tenantId),
      this.getUpcomingPayments(tenantId, 30),
      this.getOverduePayments(tenantId),
      this.getMaintenanceRequests(tenantId),
      this.getPendingRenewals(tenantId),
      this.getUnreadMessagesCount(tenantId),
      this.getDocumentsCount(tenantId),
    ]);

    // Calculate totals
    const totalMonthlyRent = leases.reduce(
      (sum, lease) => sum + lease.rentAmount,
      0,
    );
    const currency = leases.length > 0 ? leases[0].currency : 'EUR';
    const pendingMaintenanceRequests = maintenanceRequests.length;
    const pendingRenewals = renewalOffers.length;

    return {
      activeLeases: leases.length,
      totalMonthlyRent,
      currency,
      pendingMaintenanceRequests,
      unreadMessages: unreadMessagesCount,
      pendingRenewals,
      documentsCount,
      leases,
      upcomingPayments,
      overduePayments,
      maintenanceRequests,
      renewalOffers,
    };
  }

  private async getActiveLeases(
    tenantId: string,
  ): Promise<TenantLeaseSummaryDto[]> {
    const leases = await this.prisma.lease.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'ACTIVE'] },
      },
      include: {
        property: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        landlord: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return leases.map((lease) => ({
      id: lease.id,
      property: {
        id: lease.property.id,
        title: lease.property.title,
        address: lease.property.address,
        city: lease.property.city,
        primaryImageUrl: lease.property.media[0]?.url,
      },
      landlord: {
        id: lease.landlord.id,
        firstName: lease.landlord.firstName,
        lastName: lease.landlord.lastName,
        email: lease.landlord.email,
        phone: lease.landlord.phone || undefined,
      },
      startDate: lease.startDate,
      endDate: lease.endDate,
      rentAmount: Number(lease.rentAmount),
      currency: lease.currency,
      dueDay: lease.dueDay,
      status: lease.status,
      securityDeposit: lease.securityDeposit
        ? Number(lease.securityDeposit)
        : null,
      securityDepositPaid: lease.securityDepositPaid,
      landlordSigned: !!lease.landlordSignedAt,
      tenantSigned: !!lease.tenantSignedAt,
      documentUrl: lease.documentUrl || undefined,
    }));
  }

  private async getUpcomingPayments(
    tenantId: string,
    days: number,
  ): Promise<TenantPaymentSummaryDto[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const payments = await this.prisma.rentPayment.findMany({
      where: {
        lease: {
          tenantId,
          status: 'ACTIVE',
        },
        status: 'PENDING',
        dueDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    return payments.map((payment) => ({
      id: payment.id,
      leaseId: payment.leaseId,
      propertyTitle: payment.lease.property.title,
      dueDate: payment.dueDate,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt || undefined,
      paidAmount: payment.paidAmount ? Number(payment.paidAmount) : undefined,
    }));
  }

  private async getOverduePayments(
    tenantId: string,
  ): Promise<TenantPaymentSummaryDto[]> {
    const _now = new Date();

    const payments = await this.prisma.rentPayment.findMany({
      where: {
        lease: {
          tenantId,
          status: 'ACTIVE',
        },
        status: 'OVERDUE',
      },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return payments.map((payment) => ({
      id: payment.id,
      leaseId: payment.leaseId,
      propertyTitle: payment.lease.property.title,
      dueDate: payment.dueDate,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt || undefined,
      paidAmount: payment.paidAmount ? Number(payment.paidAmount) : undefined,
    }));
  }

  private async getMaintenanceRequests(
    tenantId: string,
  ): Promise<TenantMaintenanceSummaryDto[]> {
    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        tenantId,
        status: {
          in: [
            'SUBMITTED',
            'APPROVED',
            'ASSIGNED',
            'SCHEDULED',
            'IN_PROGRESS',
          ],
        },
      },
      include: {
        property: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });

    return requests.map((request) => ({
      id: request.id,
      title: request.title,
      type: request.type,
      status: request.status,
      priority: request.priority,
      propertyTitle: request.property.title,
      scheduledDate: request.scheduledDate || undefined,
      createdAt: request.createdAt,
    }));
  }

  private async getPendingRenewals(
    tenantId: string,
  ): Promise<TenantRenewalSummaryDto[]> {
    const renewals = await this.prisma.leaseRenewal.findMany({
      where: {
        tenantId,
        status: 'OFFERED',
      },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
      orderBy: { offerExpiresAt: 'asc' },
    });

    return renewals.map((renewal) => ({
      id: renewal.id,
      leaseId: renewal.leaseId,
      propertyTitle: renewal.lease.property.title,
      status: renewal.status,
      proposedStartDate: renewal.proposedStartDate,
      proposedEndDate: renewal.proposedEndDate,
      proposedRentAmount: Number(renewal.proposedRentAmount),
      proposedTerms: renewal.proposedTerms || undefined,
      offerExpiresAt: renewal.offerExpiresAt || undefined,
    }));
  }

  private async getUnreadMessagesCount(tenantId: string): Promise<number> {
    const result = await this.prisma.conversationParticipant.aggregate({
      where: {
        userId: tenantId,
        isArchived: false,
      },
      _sum: {
        unreadCount: true,
      },
    });

    return result._sum.unreadCount || 0;
  }

  private async getDocumentsCount(tenantId: string): Promise<number> {
    // Get all lease IDs for this tenant
    const leaseIds = await this.prisma.lease.findMany({
      where: { tenantId },
      select: { id: true },
    });

    if (leaseIds.length === 0) return 0;

    const count = await this.prisma.tenantDocument.count({
      where: {
        leaseId: { in: leaseIds.map((l) => l.id) },
      },
    });

    return count;
  }
}
