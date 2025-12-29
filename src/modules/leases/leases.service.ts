import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { LeaseStatus, RentPaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateLeaseDto,
  UpdateLeaseDto,
  LeaseQueryDto,
  RecordPaymentDto,
  WaivePaymentDto,
  PaymentQueryDto,
  LeaseResponseDto,
  LeaseListResponseDto,
  RentPaymentResponseDto,
  PaymentListResponseDto,
} from './dto';

@Injectable()
export class LeasesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Create a new lease (PROD-102.1)
   * POST /leases
   */
  async create(
    landlordId: string,
    dto: CreateLeaseDto,
  ): Promise<LeaseResponseDto> {
    // Verify property ownership
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== landlordId) {
      throw new ForbiddenException('Only property owner can create a lease');
    }

    // Verify tenant exists
    const tenant = await this.prisma.user.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Cannot lease to yourself
    if (dto.tenantId === landlordId) {
      throw new BadRequestException('Cannot create a lease with yourself as tenant');
    }

    // Check for existing active lease on this property
    const existingLease = await this.prisma.lease.findFirst({
      where: {
        propertyId: dto.propertyId,
        status: 'ACTIVE',
      },
    });

    if (existingLease) {
      throw new ConflictException('Property already has an active lease');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Create lease
    const lease = await this.prisma.lease.create({
      data: {
        propertyId: dto.propertyId,
        tenantId: dto.tenantId,
        landlordId,
        startDate,
        endDate,
        rentAmount: dto.rentAmount,
        currency: dto.currency || 'EUR',
        dueDay: dto.dueDay,
        securityDeposit: dto.securityDeposit,
        securityDepositPaid: dto.securityDepositPaid || false,
        documentUrl: dto.documentUrl,
        status: 'DRAFT',
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            country: true,
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
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return this.mapToLeaseResponseDto(lease);
  }

  /**
   * Get user's leases (PROD-102)
   * GET /leases
   */
  async findAll(
    userId: string,
    query: LeaseQueryDto,
  ): Promise<LeaseListResponseDto> {
    const { page = 1, limit = 20, status, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaseWhereInput = {};

    // Filter by role
    if (role === 'tenant') {
      where.tenantId = userId;
    } else if (role === 'landlord') {
      where.landlordId = userId;
    } else {
      // Return leases where user is either tenant or landlord
      where.OR = [{ tenantId: userId }, { landlordId: userId }];
    }

    if (status) {
      where.status = status;
    }

    const [leases, total] = await Promise.all([
      this.prisma.lease.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
              country: true,
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
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.lease.count({ where }),
    ]);

    return {
      data: leases.map((lease) => this.mapToLeaseResponseDto(lease)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get lease by ID
   * GET /leases/:id
   */
  async findOne(leaseId: string, userId: string): Promise<LeaseResponseDto> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            country: true,
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
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    // Access control: only tenant or landlord can view
    if (lease.tenantId !== userId && lease.landlordId !== userId) {
      throw new ForbiddenException('Not authorized to view this lease');
    }

    return this.mapToLeaseResponseDto(lease);
  }

  /**
   * Update a draft lease (landlord only)
   * PATCH /leases/:id
   */
  async update(
    leaseId: string,
    landlordId: string,
    dto: UpdateLeaseDto,
  ): Promise<LeaseResponseDto> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.landlordId !== landlordId) {
      throw new ForbiddenException('Only landlord can update the lease');
    }

    if (lease.status !== 'DRAFT') {
      throw new BadRequestException('Only draft leases can be modified');
    }

    // Validate dates if provided
    const startDate = dto.startDate ? new Date(dto.startDate) : lease.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : lease.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const updated = await this.prisma.lease.update({
      where: { id: leaseId },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        rentAmount: dto.rentAmount,
        currency: dto.currency,
        dueDay: dto.dueDay,
        securityDeposit: dto.securityDeposit,
        securityDepositPaid: dto.securityDepositPaid,
        documentUrl: dto.documentUrl,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            country: true,
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
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return this.mapToLeaseResponseDto(updated);
  }

  /**
   * Activate a lease (landlord only)
   * POST /leases/:id/activate
   */
  async activate(leaseId: string, landlordId: string): Promise<LeaseResponseDto> {
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
      throw new ForbiddenException('Only landlord can activate the lease');
    }

    if (lease.status !== 'DRAFT') {
      throw new BadRequestException('Only draft leases can be activated');
    }

    // Check for existing active lease on this property
    const existingActiveLease = await this.prisma.lease.findFirst({
      where: {
        propertyId: lease.propertyId,
        status: 'ACTIVE',
        id: { not: leaseId },
      },
    });

    if (existingActiveLease) {
      throw new ConflictException('Property already has an active lease');
    }

    // Generate payment schedule
    const payments = this.generatePaymentSchedule(lease);

    // Update lease status and create payments in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // Create rent payments
      await tx.rentPayment.createMany({
        data: payments,
      });

      // Update lease status
      return tx.lease.update({
        where: { id: leaseId },
        data: { status: 'ACTIVE' },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
              country: true,
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
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });

    // Notify tenant that lease is now active
    await this.notifications.create(
      lease.tenantId,
      'RENT_REMINDER_TENANT',
      'Lease Activated',
      `Your lease for "${lease.property.title}" is now active. Rent of ${lease.rentAmount} ${lease.currency} is due on day ${lease.dueDay} of each month.`,
      {
        leaseId: lease.id,
        propertyId: lease.propertyId,
      },
    );

    return this.mapToLeaseResponseDto(updated);
  }

  /**
   * Terminate a lease early (landlord only)
   * POST /leases/:id/terminate
   */
  async terminate(
    leaseId: string,
    landlordId: string,
    reason?: string,
  ): Promise<LeaseResponseDto> {
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
      throw new ForbiddenException('Only landlord can terminate the lease');
    }

    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException('Only active leases can be terminated');
    }

    // Update lease status
    const updated = await this.prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'TERMINATED' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            country: true,
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
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify tenant
    await this.notifications.create(
      lease.tenantId,
      'RENT_REMINDER_TENANT',
      'Lease Terminated',
      `Your lease for "${lease.property.title}" has been terminated.${reason ? ` Reason: ${reason}` : ''}`,
      {
        leaseId: lease.id,
        propertyId: lease.propertyId,
      },
    );

    return this.mapToLeaseResponseDto(updated);
  }

  /**
   * Get payment history for a lease
   * GET /leases/:id/payments
   */
  async getPayments(
    leaseId: string,
    userId: string,
    query: PaymentQueryDto,
  ): Promise<PaymentListResponseDto> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    // Access control
    if (lease.tenantId !== userId && lease.landlordId !== userId) {
      throw new ForbiddenException('Not authorized to view these payments');
    }

    const where: Prisma.RentPaymentWhereInput = {
      leaseId,
    };

    if (query.status) {
      where.status = query.status as RentPaymentStatus;
    }

    const payments = await this.prisma.rentPayment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    return {
      data: payments.map((payment) => this.mapToPaymentResponseDto(payment)),
      meta: {
        total: payments.length,
        page: 1,
        limit: payments.length,
        totalPages: 1,
      },
    };
  }

  /**
   * Record a rent payment (landlord only) - PROD-102.4
   * POST /leases/:leaseId/payments/:paymentId/record
   */
  async recordPayment(
    leaseId: string,
    paymentId: string,
    landlordId: string,
    dto: RecordPaymentDto,
  ): Promise<RentPaymentResponseDto> {
    const payment = await this.prisma.rentPayment.findUnique({
      where: { id: paymentId },
      include: {
        lease: {
          include: {
            property: true,
            tenant: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.leaseId !== leaseId) {
      throw new BadRequestException('Payment does not belong to this lease');
    }

    if (payment.lease.landlordId !== landlordId) {
      throw new ForbiddenException('Only landlord can record payments');
    }

    if (payment.status === 'PAID') {
      throw new BadRequestException('Payment has already been recorded');
    }

    if (payment.status === 'WAIVED') {
      throw new BadRequestException('Payment has been waived');
    }

    // Update payment
    const updated = await this.prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: dto.paidAmount,
        paymentMethod: dto.paymentMethod,
        transactionRef: dto.transactionRef,
        notes: dto.notes,
      },
    });

    // Notify landlord (confirmation) - PROD-102.4
    await this.notifications.create(
      landlordId,
      'RENT_PAYMENT_RECEIVED',
      'Rent Payment Recorded',
      `Payment of ${dto.paidAmount} ${payment.currency} has been recorded for "${payment.lease.property.title}"`,
      {
        leaseId: payment.leaseId,
        paymentId: payment.id,
        propertyId: payment.lease.propertyId,
      },
    );

    return this.mapToPaymentResponseDto(updated);
  }

  /**
   * Waive a rent payment (landlord only)
   * POST /leases/:leaseId/payments/:paymentId/waive
   */
  async waivePayment(
    leaseId: string,
    paymentId: string,
    landlordId: string,
    dto: WaivePaymentDto,
  ): Promise<RentPaymentResponseDto> {
    const payment = await this.prisma.rentPayment.findUnique({
      where: { id: paymentId },
      include: {
        lease: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.leaseId !== leaseId) {
      throw new BadRequestException('Payment does not belong to this lease');
    }

    if (payment.lease.landlordId !== landlordId) {
      throw new ForbiddenException('Only landlord can waive payments');
    }

    if (payment.status === 'PAID') {
      throw new BadRequestException('Cannot waive a paid payment');
    }

    if (payment.status === 'WAIVED') {
      throw new BadRequestException('Payment has already been waived');
    }

    const updated = await this.prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        status: 'WAIVED',
        notes: dto.reason,
      },
    });

    return this.mapToPaymentResponseDto(updated);
  }

  /**
   * Generate payment schedule for a lease
   */
  private generatePaymentSchedule(lease: {
    id: string;
    startDate: Date;
    endDate: Date;
    rentAmount: Prisma.Decimal;
    currency: string;
    dueDay: number;
  }): Prisma.RentPaymentCreateManyInput[] {
    const payments: Prisma.RentPaymentCreateManyInput[] = [];
    const startDate = new Date(lease.startDate);
    const endDate = new Date(lease.endDate);

    // Start from the first month
    let currentDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      lease.dueDay,
    );

    // If dueDay is before startDate in the first month, move to next month
    if (currentDate < startDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    while (currentDate <= endDate) {
      payments.push({
        leaseId: lease.id,
        dueDate: new Date(currentDate),
        amount: lease.rentAmount,
        currency: lease.currency,
        status: 'PENDING',
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return payments;
  }

  /**
   * Map Lease to LeaseResponseDto
   */
  private mapToLeaseResponseDto(lease: {
    id: string;
    propertyId: string;
    tenantId: string;
    landlordId: string;
    startDate: Date;
    endDate: Date;
    rentAmount: Prisma.Decimal;
    currency: string;
    dueDay: number;
    securityDeposit: Prisma.Decimal | null;
    securityDepositPaid: boolean;
    status: LeaseStatus;
    documentUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    property?: {
      id: string;
      title: string;
      address: string;
      city: string;
      country: string;
    };
    tenant?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    landlord?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }): LeaseResponseDto {
    return {
      id: lease.id,
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      landlordId: lease.landlordId,
      startDate: lease.startDate,
      endDate: lease.endDate,
      rentAmount: Number(lease.rentAmount),
      currency: lease.currency,
      dueDay: lease.dueDay,
      securityDeposit: lease.securityDeposit
        ? Number(lease.securityDeposit)
        : undefined,
      securityDepositPaid: lease.securityDepositPaid,
      status: lease.status,
      documentUrl: lease.documentUrl || undefined,
      createdAt: lease.createdAt,
      updatedAt: lease.updatedAt,
      property: lease.property,
      tenant: lease.tenant,
      landlord: lease.landlord,
    };
  }

  /**
   * Map RentPayment to RentPaymentResponseDto
   */
  private mapToPaymentResponseDto(payment: {
    id: string;
    leaseId: string;
    dueDate: Date;
    amount: Prisma.Decimal;
    currency: string;
    status: RentPaymentStatus;
    paidAt: Date | null;
    paidAmount: Prisma.Decimal | null;
    paymentMethod: string | null;
    transactionRef: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): RentPaymentResponseDto {
    return {
      id: payment.id,
      leaseId: payment.leaseId,
      dueDate: payment.dueDate,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt || undefined,
      paidAmount: payment.paidAmount ? Number(payment.paidAmount) : undefined,
      paymentMethod: payment.paymentMethod || undefined,
      transactionRef: payment.transactionRef || undefined,
      notes: payment.notes || undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
