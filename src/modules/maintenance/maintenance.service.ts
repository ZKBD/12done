import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { MailService } from '@/mail/mail.service';
import {
  MaintenanceRequestStatus,
  MaintenancePriority,
  Prisma,
  ServiceProviderStatus,
} from '@prisma/client';
import {
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  RejectRequestDto,
  AssignProviderDto,
  ScheduleRequestDto,
  CompleteRequestDto,
  MaintenanceQueryDto,
  MaintenanceRequestResponseDto,
  MaintenanceListResponseDto,
} from './dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Create a new maintenance request (tenant only)
   */
  async create(
    tenantId: string,
    dto: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    // Verify lease exists and tenant is part of it
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: {
        property: true,
        tenant: true,
        landlord: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.tenantId !== tenantId) {
      throw new ForbiddenException('You are not the tenant on this lease');
    }

    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException('Can only create maintenance requests for active leases');
    }

    // Create the maintenance request
    const request = await this.prisma.maintenanceRequest.create({
      data: {
        propertyId: lease.propertyId,
        leaseId: dto.leaseId,
        tenantId,
        landlordId: lease.landlordId,
        type: dto.type,
        priority: dto.priority || MaintenancePriority.NORMAL,
        title: dto.title,
        description: dto.description,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
        attachmentUrls: dto.attachmentUrls || [],
      },
      include: this.getIncludeOptions(),
    });

    // Notify landlord
    await this.notifications.create(
      lease.landlordId,
      'MAINTENANCE_REQUEST_SUBMITTED',
      'New Maintenance Request',
      `${lease.tenant.firstName} submitted a maintenance request for "${lease.property.title}": ${dto.title}`,
      {
        maintenanceRequestId: request.id,
        propertyId: lease.propertyId,
        leaseId: lease.id,
        type: dto.type,
        priority: dto.priority || MaintenancePriority.NORMAL,
      },
    );

    // Send email to landlord
    await this.mail.sendMaintenanceSubmittedEmail(
      lease.landlord.email,
      lease.landlord.firstName,
      `${lease.tenant.firstName} ${lease.tenant.lastName}`,
      lease.property.title,
      dto.title,
      dto.description,
      dto.priority || MaintenancePriority.NORMAL,
      dto.preferredDate,
    );

    return this.mapToResponseDto(request);
  }

  /**
   * Get all maintenance requests with filtering
   */
  async findAll(
    userId: string,
    query: MaintenanceQueryDto,
  ): Promise<MaintenanceListResponseDto> {
    const { page = 1, limit = 10, status, type, priority, role, propertyId, leaseId } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.MaintenanceRequestWhereInput = {};

    // Role-based filtering
    if (role === 'tenant') {
      where.tenantId = userId;
    } else if (role === 'landlord') {
      where.landlordId = userId;
    } else if (role === 'provider') {
      // Find provider profile for user
      const provider = await this.prisma.serviceProvider.findFirst({
        where: { userId, status: ServiceProviderStatus.APPROVED },
      });
      if (provider) {
        where.assignedProviderId = provider.id;
      } else {
        // No provider profile, return empty
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }
    } else {
      // Default: show requests where user is tenant or landlord
      where.OR = [{ tenantId: userId }, { landlordId: userId }];
    }

    // Additional filters
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (propertyId) where.propertyId = propertyId;
    if (leaseId) where.leaseId = leaseId;

    const [requests, total] = await Promise.all([
      this.prisma.maintenanceRequest.findMany({
        where,
        include: this.getIncludeOptions(),
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);

    return {
      data: requests.map((r) => this.mapToResponseDto(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single maintenance request
   */
  async findOne(
    requestId: string,
    userId: string,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: this.getIncludeOptions(),
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    // Check access: tenant, landlord, or assigned provider
    const isAuthorized = await this.checkAccess(request, userId);
    if (!isAuthorized) {
      throw new ForbiddenException('Not authorized to view this request');
    }

    return this.mapToResponseDto(request);
  }

  /**
   * Update a maintenance request (tenant only, SUBMITTED status only)
   */
  async update(
    requestId: string,
    userId: string,
    dto: UpdateMaintenanceRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (request.tenantId !== userId) {
      throw new ForbiddenException('Only the tenant can update this request');
    }

    if (request.status !== MaintenanceRequestStatus.SUBMITTED) {
      throw new BadRequestException('Can only update requests in SUBMITTED status');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
        attachmentUrls: dto.attachmentUrls,
      },
      include: this.getIncludeOptions(),
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Approve a maintenance request (landlord only)
   */
  async approve(
    requestId: string,
    landlordId: string,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: true,
        property: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (request.landlordId !== landlordId) {
      throw new ForbiddenException('Only the landlord can approve this request');
    }

    if (request.status !== MaintenanceRequestStatus.SUBMITTED) {
      throw new BadRequestException('Can only approve requests in SUBMITTED status');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: MaintenanceRequestStatus.APPROVED },
      include: this.getIncludeOptions(),
    });

    // Notify tenant
    await this.notifications.create(
      request.tenantId,
      'MAINTENANCE_REQUEST_APPROVED',
      'Maintenance Request Approved',
      `Your maintenance request "${request.title}" has been approved`,
      { maintenanceRequestId: requestId },
    );

    await this.mail.sendMaintenanceApprovedEmail(
      request.tenant.email,
      request.tenant.firstName,
      request.property.title,
      request.title,
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Reject a maintenance request (landlord only)
   */
  async reject(
    requestId: string,
    landlordId: string,
    dto: RejectRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: true,
        property: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (request.landlordId !== landlordId) {
      throw new ForbiddenException('Only the landlord can reject this request');
    }

    if (request.status !== MaintenanceRequestStatus.SUBMITTED) {
      throw new BadRequestException('Can only reject requests in SUBMITTED status');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: MaintenanceRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      },
      include: this.getIncludeOptions(),
    });

    // Notify tenant
    await this.notifications.create(
      request.tenantId,
      'MAINTENANCE_REQUEST_REJECTED',
      'Maintenance Request Rejected',
      `Your maintenance request "${request.title}" has been rejected: ${dto.rejectionReason}`,
      { maintenanceRequestId: requestId, reason: dto.rejectionReason },
    );

    await this.mail.sendMaintenanceRejectedEmail(
      request.tenant.email,
      request.tenant.firstName,
      request.property.title,
      request.title,
      dto.rejectionReason,
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Assign a service provider (landlord only)
   */
  async assignProvider(
    requestId: string,
    landlordId: string,
    dto: AssignProviderDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: true,
        property: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (request.landlordId !== landlordId) {
      throw new ForbiddenException('Only the landlord can assign a provider');
    }

    if (request.status !== MaintenanceRequestStatus.APPROVED) {
      throw new BadRequestException('Can only assign providers to approved requests');
    }

    // Verify provider exists and is approved
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.providerId },
      include: { user: true },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.status !== ServiceProviderStatus.APPROVED) {
      throw new BadRequestException('Provider must be approved');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        assignedProviderId: dto.providerId,
        status: MaintenanceRequestStatus.ASSIGNED,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        scheduledTimeSlot: dto.scheduledTimeSlot,
        estimatedCost: dto.estimatedCost,
      },
      include: this.getIncludeOptions(),
    });

    // Notify tenant
    await this.notifications.create(
      request.tenantId,
      'MAINTENANCE_REQUEST_ASSIGNED',
      'Provider Assigned',
      `A service provider has been assigned to your maintenance request "${request.title}"`,
      { maintenanceRequestId: requestId, providerId: dto.providerId },
    );

    await this.mail.sendMaintenanceAssignedEmail(
      request.tenant.email,
      request.tenant.firstName,
      request.property.title,
      request.title,
      `${provider.user.firstName} ${provider.user.lastName}`,
      dto.scheduledDate,
      dto.scheduledTimeSlot,
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Schedule the maintenance work (landlord or provider)
   */
  async schedule(
    requestId: string,
    userId: string,
    dto: ScheduleRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: true,
        landlord: true,
        property: true,
        assignedProvider: { include: { user: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    // Check authorization: landlord or assigned provider
    const isLandlord = request.landlordId === userId;
    const isProvider = request.assignedProvider?.userId === userId;

    if (!isLandlord && !isProvider) {
      throw new ForbiddenException('Only landlord or assigned provider can schedule');
    }

    if (request.status !== MaintenanceRequestStatus.ASSIGNED) {
      throw new BadRequestException('Can only schedule assigned requests');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: MaintenanceRequestStatus.SCHEDULED,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTimeSlot: dto.scheduledTimeSlot,
      },
      include: this.getIncludeOptions(),
    });

    // Notify tenant
    await this.notifications.create(
      request.tenantId,
      'MAINTENANCE_REQUEST_SCHEDULED',
      'Maintenance Scheduled',
      `Your maintenance request "${request.title}" is scheduled for ${dto.scheduledDate} at ${dto.scheduledTimeSlot}`,
      { maintenanceRequestId: requestId, scheduledDate: dto.scheduledDate, scheduledTimeSlot: dto.scheduledTimeSlot },
    );

    await this.mail.sendMaintenanceScheduledEmail(
      request.tenant.email,
      request.tenant.firstName,
      request.property.title,
      request.title,
      dto.scheduledDate,
      dto.scheduledTimeSlot,
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Start work on the maintenance request (provider only)
   */
  async startWork(
    requestId: string,
    userId: string,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { assignedProvider: true },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (!request.assignedProvider || request.assignedProvider.userId !== userId) {
      throw new ForbiddenException('Only the assigned provider can start work');
    }

    if (request.status !== MaintenanceRequestStatus.SCHEDULED) {
      throw new BadRequestException('Can only start work on scheduled requests');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: MaintenanceRequestStatus.IN_PROGRESS },
      include: this.getIncludeOptions(),
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Complete the maintenance work (provider only)
   */
  async complete(
    requestId: string,
    userId: string,
    dto: CompleteRequestDto,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: true,
        landlord: true,
        property: true,
        assignedProvider: { include: { user: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    if (!request.assignedProvider || request.assignedProvider.userId !== userId) {
      throw new ForbiddenException('Only the assigned provider can complete work');
    }

    if (request.status !== MaintenanceRequestStatus.IN_PROGRESS) {
      throw new BadRequestException('Can only complete work that is in progress');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: MaintenanceRequestStatus.COMPLETED,
        completionNotes: dto.completionNotes,
        completionPhotos: dto.completionPhotos || [],
        actualCost: dto.actualCost,
        completedAt: new Date(),
      },
      include: this.getIncludeOptions(),
    });

    // Notify tenant and landlord
    const notificationPromises = [
      this.notifications.create(
        request.tenantId,
        'MAINTENANCE_REQUEST_COMPLETED',
        'Maintenance Completed',
        `The maintenance work for "${request.title}" has been completed`,
        { maintenanceRequestId: requestId },
      ),
      this.notifications.create(
        request.landlordId,
        'MAINTENANCE_REQUEST_COMPLETED',
        'Maintenance Completed',
        `The maintenance work for "${request.title}" has been completed`,
        { maintenanceRequestId: requestId },
      ),
    ];

    const actualCostStr = dto.actualCost?.toString();
    const emailPromises = [
      this.mail.sendMaintenanceCompletedEmail(
        request.tenant.email,
        request.tenant.firstName,
        request.property.title,
        request.title,
        dto.completionNotes,
        actualCostStr,
      ),
      this.mail.sendMaintenanceCompletedEmail(
        request.landlord.email,
        request.landlord.firstName,
        request.property.title,
        request.title,
        dto.completionNotes,
        actualCostStr,
      ),
    ];

    await Promise.all([...notificationPromises, ...emailPromises]);

    return this.mapToResponseDto(updated);
  }

  /**
   * Confirm completion (tenant or landlord)
   */
  async confirmCompletion(
    requestId: string,
    userId: string,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    const isTenant = request.tenantId === userId;
    const isLandlord = request.landlordId === userId;

    if (!isTenant && !isLandlord) {
      throw new ForbiddenException('Only tenant or landlord can confirm completion');
    }

    if (request.status !== MaintenanceRequestStatus.COMPLETED) {
      throw new BadRequestException('Can only confirm completed requests');
    }

    const updateData: Prisma.MaintenanceRequestUpdateInput = {};
    if (isTenant) updateData.confirmedByTenant = true;
    if (isLandlord) updateData.confirmedByLandlord = true;

    // Check if both have confirmed after this update
    const willBeTenantConfirmed = isTenant ? true : request.confirmedByTenant;
    const willBeLandlordConfirmed = isLandlord ? true : request.confirmedByLandlord;

    if (willBeTenantConfirmed && willBeLandlordConfirmed) {
      updateData.status = MaintenanceRequestStatus.CONFIRMED;
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: updateData,
      include: this.getIncludeOptions(),
    });

    // Notify if fully confirmed
    if (updated.status === MaintenanceRequestStatus.CONFIRMED) {
      await this.notifications.create(
        request.tenantId,
        'MAINTENANCE_REQUEST_CONFIRMED',
        'Maintenance Confirmed',
        `The maintenance request "${request.title}" has been confirmed by all parties`,
        { maintenanceRequestId: requestId },
      );
    }

    return this.mapToResponseDto(updated);
  }

  /**
   * Cancel a maintenance request
   */
  async cancel(
    requestId: string,
    userId: string,
  ): Promise<MaintenanceRequestResponseDto> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    const isTenant = request.tenantId === userId;
    const isLandlord = request.landlordId === userId;

    if (!isTenant && !isLandlord) {
      throw new ForbiddenException('Only tenant or landlord can cancel');
    }

    // Tenant can only cancel if SUBMITTED
    if (isTenant && request.status !== MaintenanceRequestStatus.SUBMITTED) {
      throw new BadRequestException('Tenant can only cancel submitted requests');
    }

    // Cannot cancel if already completed or confirmed
    const nonCancellableStatuses: MaintenanceRequestStatus[] = [
      MaintenanceRequestStatus.COMPLETED,
      MaintenanceRequestStatus.CONFIRMED,
      MaintenanceRequestStatus.CANCELLED,
    ];

    if (nonCancellableStatuses.includes(request.status)) {
      throw new BadRequestException('Cannot cancel requests in this status');
    }

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: { status: MaintenanceRequestStatus.CANCELLED },
      include: this.getIncludeOptions(),
    });

    return this.mapToResponseDto(updated);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getIncludeOptions() {
    return {
      property: {
        select: { id: true, title: true, address: true, city: true },
      },
      lease: {
        select: { id: true, startDate: true, endDate: true, status: true },
      },
      tenant: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      landlord: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      assignedProvider: {
        select: {
          id: true,
          userId: true,
          bio: true,
          averageRating: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    };
  }

  private async checkAccess(
    request: { tenantId: string; landlordId: string; assignedProviderId: string | null },
    userId: string,
  ): Promise<boolean> {
    if (request.tenantId === userId || request.landlordId === userId) {
      return true;
    }

    // Check if user is the assigned provider
    if (request.assignedProviderId) {
      const provider = await this.prisma.serviceProvider.findUnique({
        where: { id: request.assignedProviderId },
      });
      if (provider?.userId === userId) {
        return true;
      }
    }

    return false;
  }

  private mapToResponseDto(request: any): MaintenanceRequestResponseDto {
    return {
      id: request.id,
      propertyId: request.propertyId,
      leaseId: request.leaseId,
      tenantId: request.tenantId,
      landlordId: request.landlordId,
      assignedProviderId: request.assignedProviderId,
      type: request.type,
      priority: request.priority,
      title: request.title,
      description: request.description,
      attachmentUrls: request.attachmentUrls,
      status: request.status,
      rejectionReason: request.rejectionReason,
      preferredDate: request.preferredDate,
      scheduledDate: request.scheduledDate,
      scheduledTimeSlot: request.scheduledTimeSlot,
      completionNotes: request.completionNotes,
      completionPhotos: request.completionPhotos,
      estimatedCost: request.estimatedCost ? Number(request.estimatedCost) : undefined,
      actualCost: request.actualCost ? Number(request.actualCost) : undefined,
      completedAt: request.completedAt,
      confirmedByTenant: request.confirmedByTenant,
      confirmedByLandlord: request.confirmedByLandlord,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      property: request.property,
      lease: request.lease,
      tenant: request.tenant,
      landlord: request.landlord,
      assignedProvider: request.assignedProvider,
    };
  }
}
