import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeaseRenewalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import {
  CreateRenewalOfferDto,
  DeclineRenewalDto,
  RenewalQueryDto,
} from './dto';

interface LeaseRenewalResponseDto {
  id: string;
  leaseId: string;
  landlordId: string;
  tenantId: string;
  status: LeaseRenewalStatus;
  proposedStartDate: Date | null;
  proposedEndDate: Date | null;
  proposedRentAmount: number | null;
  proposedTerms: string | null;
  offerExpiresAt: Date | null;
  reminderSentAt: Date | null;
  offerSentAt: Date | null;
  respondedAt: Date | null;
  declineReason: string | null;
  newLeaseId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lease?: {
    id: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    property: {
      id: string;
      title: string;
      address: string;
      city: string;
    };
  };
  landlord?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  tenant?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface RenewalListResponseDto {
  data: LeaseRenewalResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class LeaseRenewalService {
  private readonly logger = new Logger(LeaseRenewalService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  /**
   * Check for leases ending within 60 days (PROD-105.1, PROD-105.2)
   * Creates PENDING renewal records and notifies landlords
   * Runs daily at 2:00 AM
   */
  @Cron('0 2 * * *', { name: 'lease-renewal-check' })
  async checkUpcomingRenewals(): Promise<void> {
    this.logger.log('Starting lease renewal check job');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    sixtyDaysFromNow.setHours(23, 59, 59, 999);

    // Find active leases ending within 60 days that don't have a renewal record
    const expiringLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: today,
          lte: sixtyDaysFromNow,
        },
        renewals: {
          none: {
            status: {
              in: ['PENDING', 'OFFERED'],
            },
          },
        },
      },
      include: {
        property: true,
        tenant: true,
        landlord: true,
      },
    });

    this.logger.log(
      `Found ${expiringLeases.length} leases expiring within 60 days`,
    );

    for (const lease of expiringLeases) {
      try {
        // Create PENDING renewal record
        const renewal = await this.prisma.leaseRenewal.create({
          data: {
            leaseId: lease.id,
            landlordId: lease.landlordId,
            tenantId: lease.tenantId,
            status: 'PENDING',
            reminderSentAt: new Date(),
          },
        });

        const daysUntilExpiry = Math.ceil(
          (lease.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Send email to landlord
        await this.mail.sendLeaseRenewalReminderEmail(
          lease.landlord.email,
          lease.landlord.firstName,
          lease.property.title,
          `${lease.tenant.firstName} ${lease.tenant.lastName}`,
          lease.endDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          daysUntilExpiry,
        );

        // Create in-app notification for landlord
        await this.notifications.create(
          lease.landlordId,
          'LEASE_RENEWAL_REMINDER_LANDLORD',
          'Lease Ending Soon',
          `The lease for "${lease.property.title}" with ${lease.tenant.firstName} ${lease.tenant.lastName} ends in ${daysUntilExpiry} days. Consider creating a renewal offer.`,
          {
            renewalId: renewal.id,
            leaseId: lease.id,
            propertyId: lease.propertyId,
            tenantId: lease.tenantId,
            daysUntilExpiry,
          },
        );

        this.logger.log(
          `Created renewal reminder for lease ${lease.id} (${daysUntilExpiry} days until expiry)`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process renewal for lease ${lease.id}:`,
          error,
        );
      }
    }

    this.logger.log('Completed lease renewal check job');
  }

  /**
   * Expire offers past their deadline (PROD-105)
   * Runs daily at 3:00 AM
   */
  @Cron('0 3 * * *', { name: 'lease-renewal-expire' })
  async expireOffers(): Promise<void> {
    this.logger.log('Starting lease renewal expiration job');

    const now = new Date();

    // Find OFFERED renewals past their expiration
    const expiredOffers = await this.prisma.leaseRenewal.findMany({
      where: {
        status: 'OFFERED',
        offerExpiresAt: {
          lt: now,
        },
      },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
        landlord: true,
        tenant: true,
      },
    });

    this.logger.log(`Found ${expiredOffers.length} expired renewal offers`);

    for (const renewal of expiredOffers) {
      try {
        // Update status to EXPIRED
        await this.prisma.leaseRenewal.update({
          where: { id: renewal.id },
          data: { status: 'EXPIRED' },
        });

        // Notify both parties
        await this.mail.sendLeaseRenewalExpiredEmail(
          renewal.tenant.email,
          renewal.tenant.firstName,
          renewal.lease.property.title,
        );

        await this.mail.sendLeaseRenewalExpiredEmail(
          renewal.landlord.email,
          renewal.landlord.firstName,
          renewal.lease.property.title,
        );

        // Create in-app notifications
        await this.notifications.create(
          renewal.tenantId,
          'LEASE_RENEWAL_EXPIRED',
          'Renewal Offer Expired',
          `The renewal offer for "${renewal.lease.property.title}" has expired.`,
          {
            renewalId: renewal.id,
            leaseId: renewal.leaseId,
            propertyId: renewal.lease.propertyId,
          },
        );

        await this.notifications.create(
          renewal.landlordId,
          'LEASE_RENEWAL_EXPIRED',
          'Renewal Offer Expired',
          `Your renewal offer for "${renewal.lease.property.title}" to ${renewal.tenant.firstName} ${renewal.tenant.lastName} has expired.`,
          {
            renewalId: renewal.id,
            leaseId: renewal.leaseId,
            propertyId: renewal.lease.propertyId,
            tenantId: renewal.tenantId,
          },
        );

        this.logger.log(`Expired renewal offer ${renewal.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to expire renewal offer ${renewal.id}:`,
          error,
        );
      }
    }

    this.logger.log('Completed lease renewal expiration job');
  }

  /**
   * Get pending renewals for a landlord (PROD-105)
   * GET /leases/renewals/pending
   */
  async findPendingRenewals(
    landlordId: string,
    query: RenewalQueryDto,
  ): Promise<RenewalListResponseDto> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaseRenewalWhereInput = {
      landlordId,
    };

    if (status) {
      where.status = status;
    } else {
      // Default to PENDING and OFFERED
      where.status = { in: ['PENDING', 'OFFERED'] };
    }

    const [renewals, total] = await Promise.all([
      this.prisma.leaseRenewal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lease: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.leaseRenewal.count({ where }),
    ]);

    return {
      data: renewals.map((r) => this.mapToRenewalResponseDto(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get renewal status for a specific lease
   * GET /leases/:id/renewal
   */
  async findRenewalForLease(
    leaseId: string,
    userId: string,
  ): Promise<LeaseRenewalResponseDto | null> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    // Access control
    if (lease.tenantId !== userId && lease.landlordId !== userId) {
      throw new ForbiddenException('Not authorized to view this lease');
    }

    // Find the most recent active renewal
    const renewal = await this.prisma.leaseRenewal.findFirst({
      where: {
        leaseId,
        status: { in: ['PENDING', 'OFFERED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lease: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
              },
            },
          },
        },
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!renewal) {
      return null;
    }

    return this.mapToRenewalResponseDto(renewal);
  }

  /**
   * Create a renewal offer (PROD-105.3)
   * POST /leases/:id/renewal/offer
   */
  async createOffer(
    leaseId: string,
    landlordId: string,
    dto: CreateRenewalOfferDto,
  ): Promise<LeaseRenewalResponseDto> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: true,
        tenant: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.landlordId !== landlordId) {
      throw new ForbiddenException('Only landlord can create a renewal offer');
    }

    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException('Can only renew active leases');
    }

    // Validate dates
    const proposedStartDate = new Date(dto.proposedStartDate);
    const proposedEndDate = new Date(dto.proposedEndDate);

    if (proposedEndDate <= proposedStartDate) {
      throw new BadRequestException(
        'Proposed end date must be after start date',
      );
    }

    // Check for existing PENDING or OFFERED renewal
    const existingRenewal = await this.prisma.leaseRenewal.findFirst({
      where: {
        leaseId,
        status: { in: ['PENDING', 'OFFERED'] },
      },
    });

    // Default offer expiration: 14 days from now
    const offerExpiresAt = dto.offerExpiresAt
      ? new Date(dto.offerExpiresAt)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    let renewal;
    if (existingRenewal) {
      // Update existing PENDING renewal to OFFERED
      if (existingRenewal.status !== 'PENDING') {
        throw new ConflictException('An offer already exists for this lease');
      }

      renewal = await this.prisma.leaseRenewal.update({
        where: { id: existingRenewal.id },
        data: {
          status: 'OFFERED',
          proposedStartDate,
          proposedEndDate,
          proposedRentAmount: dto.proposedRentAmount,
          proposedTerms: dto.proposedTerms,
          offerExpiresAt,
          offerSentAt: new Date(),
        },
        include: {
          lease: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    } else {
      // Create new renewal with OFFERED status
      renewal = await this.prisma.leaseRenewal.create({
        data: {
          leaseId,
          landlordId,
          tenantId: lease.tenantId,
          status: 'OFFERED',
          proposedStartDate,
          proposedEndDate,
          proposedRentAmount: dto.proposedRentAmount,
          proposedTerms: dto.proposedTerms,
          offerExpiresAt,
          offerSentAt: new Date(),
        },
        include: {
          lease: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    }

    // Notify tenant (PROD-105.4)
    await this.mail.sendLeaseRenewalOfferEmail(
      lease.tenant.email,
      lease.tenant.firstName,
      lease.property.title,
      proposedStartDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      proposedEndDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      dto.proposedRentAmount,
      offerExpiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    );

    await this.notifications.create(
      lease.tenantId,
      'LEASE_RENEWAL_OFFER_TENANT',
      'Lease Renewal Offer',
      `You have received a renewal offer for "${lease.property.title}". New rent: ${dto.proposedRentAmount} ${lease.currency}. Offer expires on ${offerExpiresAt.toLocaleDateString()}.`,
      {
        renewalId: renewal.id,
        leaseId: lease.id,
        propertyId: lease.propertyId,
        proposedRentAmount: dto.proposedRentAmount,
        offerExpiresAt,
      },
    );

    return this.mapToRenewalResponseDto(renewal);
  }

  /**
   * Accept a renewal offer (PROD-105.5, PROD-105.6)
   * POST /leases/:id/renewal/accept
   */
  async acceptOffer(
    leaseId: string,
    tenantId: string,
  ): Promise<LeaseRenewalResponseDto> {
    const renewal = await this.prisma.leaseRenewal.findFirst({
      where: {
        leaseId,
        status: 'OFFERED',
      },
      include: {
        lease: {
          include: {
            property: true,
            landlord: true,
            tenant: true,
          },
        },
      },
    });

    if (!renewal) {
      throw new NotFoundException('No active renewal offer found');
    }

    if (renewal.tenantId !== tenantId) {
      throw new ForbiddenException('Only tenant can accept the renewal offer');
    }

    // Check if offer has expired
    if (renewal.offerExpiresAt && renewal.offerExpiresAt < new Date()) {
      throw new BadRequestException('This renewal offer has expired');
    }

    // Create new lease and update renewal in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create new lease based on the renewal offer
      const newLease = await tx.lease.create({
        data: {
          propertyId: renewal.lease.propertyId,
          tenantId: renewal.tenantId,
          landlordId: renewal.landlordId,
          startDate: renewal.proposedStartDate!,
          endDate: renewal.proposedEndDate!,
          rentAmount: renewal.proposedRentAmount!,
          currency: renewal.lease.currency,
          dueDay: renewal.lease.dueDay,
          securityDeposit: renewal.lease.securityDeposit,
          securityDepositPaid: renewal.lease.securityDepositPaid,
          status: 'DRAFT', // Will need to be activated
        },
      });

      // Update renewal status
      const updatedRenewal = await tx.leaseRenewal.update({
        where: { id: renewal.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          newLeaseId: newLease.id,
        },
        include: {
          lease: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return { renewal: updatedRenewal, newLease };
    });

    // Notify both parties
    await this.mail.sendLeaseRenewalAcceptedEmail(
      renewal.lease.landlord.email,
      renewal.lease.landlord.firstName,
      renewal.lease.property.title,
      `${renewal.lease.tenant.firstName} ${renewal.lease.tenant.lastName}`,
    );

    await this.mail.sendLeaseRenewalAcceptedEmail(
      renewal.lease.tenant.email,
      renewal.lease.tenant.firstName,
      renewal.lease.property.title,
      `${renewal.lease.landlord.firstName} ${renewal.lease.landlord.lastName}`,
    );

    // Create in-app notifications
    await this.notifications.create(
      renewal.landlordId,
      'LEASE_RENEWAL_ACCEPTED',
      'Renewal Offer Accepted',
      `${renewal.lease.tenant.firstName} ${renewal.lease.tenant.lastName} has accepted your renewal offer for "${renewal.lease.property.title}". A new lease draft has been created.`,
      {
        renewalId: renewal.id,
        leaseId: renewal.leaseId,
        newLeaseId: result.newLease.id,
        propertyId: renewal.lease.propertyId,
        tenantId: renewal.tenantId,
      },
    );

    await this.notifications.create(
      renewal.tenantId,
      'LEASE_RENEWAL_ACCEPTED',
      'Renewal Accepted',
      `You have accepted the renewal offer for "${renewal.lease.property.title}". A new lease will be prepared for activation.`,
      {
        renewalId: renewal.id,
        leaseId: renewal.leaseId,
        newLeaseId: result.newLease.id,
        propertyId: renewal.lease.propertyId,
      },
    );

    return this.mapToRenewalResponseDto(result.renewal);
  }

  /**
   * Decline a renewal offer (PROD-105.5)
   * POST /leases/:id/renewal/decline
   */
  async declineOffer(
    leaseId: string,
    tenantId: string,
    dto: DeclineRenewalDto,
  ): Promise<LeaseRenewalResponseDto> {
    const renewal = await this.prisma.leaseRenewal.findFirst({
      where: {
        leaseId,
        status: 'OFFERED',
      },
      include: {
        lease: {
          include: {
            property: true,
            landlord: true,
            tenant: true,
          },
        },
      },
    });

    if (!renewal) {
      throw new NotFoundException('No active renewal offer found');
    }

    if (renewal.tenantId !== tenantId) {
      throw new ForbiddenException('Only tenant can decline the renewal offer');
    }

    // Update renewal status
    const updatedRenewal = await this.prisma.leaseRenewal.update({
      where: { id: renewal.id },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
        declineReason: dto.declineReason,
      },
      include: {
        lease: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
              },
            },
          },
        },
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify landlord
    await this.mail.sendLeaseRenewalDeclinedEmail(
      renewal.lease.landlord.email,
      renewal.lease.landlord.firstName,
      renewal.lease.property.title,
      `${renewal.lease.tenant.firstName} ${renewal.lease.tenant.lastName}`,
      dto.declineReason,
    );

    await this.notifications.create(
      renewal.landlordId,
      'LEASE_RENEWAL_DECLINED',
      'Renewal Offer Declined',
      `${renewal.lease.tenant.firstName} ${renewal.lease.tenant.lastName} has declined your renewal offer for "${renewal.lease.property.title}".${dto.declineReason ? ` Reason: ${dto.declineReason}` : ''}`,
      {
        renewalId: renewal.id,
        leaseId: renewal.leaseId,
        propertyId: renewal.lease.propertyId,
        tenantId: renewal.tenantId,
        declineReason: dto.declineReason,
      },
    );

    return this.mapToRenewalResponseDto(updatedRenewal);
  }

  /**
   * Cancel a renewal offer (landlord only)
   * DELETE /leases/:id/renewal
   */
  async cancelOffer(
    leaseId: string,
    landlordId: string,
  ): Promise<LeaseRenewalResponseDto> {
    const renewal = await this.prisma.leaseRenewal.findFirst({
      where: {
        leaseId,
        status: { in: ['PENDING', 'OFFERED'] },
      },
      include: {
        lease: {
          include: {
            property: true,
            tenant: true,
          },
        },
      },
    });

    if (!renewal) {
      throw new NotFoundException('No active renewal found');
    }

    if (renewal.landlordId !== landlordId) {
      throw new ForbiddenException('Only landlord can cancel the renewal');
    }

    // Update renewal status
    const updatedRenewal = await this.prisma.leaseRenewal.update({
      where: { id: renewal.id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        lease: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
              },
            },
          },
        },
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // If there was an offer, notify tenant
    if (renewal.status === 'OFFERED') {
      await this.notifications.create(
        renewal.tenantId,
        'LEASE_RENEWAL_EXPIRED',
        'Renewal Offer Cancelled',
        `The renewal offer for "${renewal.lease.property.title}" has been cancelled by the landlord.`,
        {
          renewalId: renewal.id,
          leaseId: renewal.leaseId,
          propertyId: renewal.lease.propertyId,
        },
      );
    }

    return this.mapToRenewalResponseDto(updatedRenewal);
  }

  /**
   * Map renewal to response DTO
   */
  private mapToRenewalResponseDto(renewal: {
    id: string;
    leaseId: string;
    landlordId: string;
    tenantId: string;
    status: LeaseRenewalStatus;
    proposedStartDate: Date | null;
    proposedEndDate: Date | null;
    proposedRentAmount: Prisma.Decimal | null;
    proposedTerms: string | null;
    offerExpiresAt: Date | null;
    reminderSentAt: Date | null;
    offerSentAt: Date | null;
    respondedAt: Date | null;
    declineReason: string | null;
    newLeaseId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lease?: {
      id: string;
      startDate: Date;
      endDate: Date;
      rentAmount: Prisma.Decimal;
      property: {
        id: string;
        title: string;
        address: string;
        city: string;
      };
    };
    landlord?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    tenant?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }): LeaseRenewalResponseDto {
    return {
      id: renewal.id,
      leaseId: renewal.leaseId,
      landlordId: renewal.landlordId,
      tenantId: renewal.tenantId,
      status: renewal.status,
      proposedStartDate: renewal.proposedStartDate,
      proposedEndDate: renewal.proposedEndDate,
      proposedRentAmount: renewal.proposedRentAmount
        ? Number(renewal.proposedRentAmount)
        : null,
      proposedTerms: renewal.proposedTerms,
      offerExpiresAt: renewal.offerExpiresAt,
      reminderSentAt: renewal.reminderSentAt,
      offerSentAt: renewal.offerSentAt,
      respondedAt: renewal.respondedAt,
      declineReason: renewal.declineReason,
      newLeaseId: renewal.newLeaseId,
      createdAt: renewal.createdAt,
      updatedAt: renewal.updatedAt,
      lease: renewal.lease
        ? {
            id: renewal.lease.id,
            startDate: renewal.lease.startDate,
            endDate: renewal.lease.endDate,
            rentAmount: Number(renewal.lease.rentAmount),
            property: renewal.lease.property,
          }
        : undefined,
      landlord: renewal.landlord,
      tenant: renewal.tenant,
    };
  }
}
