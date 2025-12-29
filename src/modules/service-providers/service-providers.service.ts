import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database';
import {
  ServiceType,
  ServiceProviderStatus,
  ServiceRequestStatus,
  Prisma,
} from '@prisma/client';
import {
  CreateServiceProviderDto,
  UpdateServiceProviderDto,
  SetWeeklyAvailabilityDto,
  CreateAvailabilityExceptionDto,
  CreateServiceRequestDto,
  RespondToRequestDto,
  CompleteRequestDto,
  ServiceProviderQueryDto,
  ServiceRequestQueryDto,
  AdminReviewDto,
  AdminProviderQueryDto,
  ServiceProviderResponseDto,
  ServiceProviderListResponseDto,
  ServiceRequestResponseDto,
  ServiceRequestListResponseDto,
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
  ReviewResponseDto,
  ReviewListResponseDto,
} from './dto/service-provider.dto';

@Injectable()
export class ServiceProvidersService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // PROVIDER APPLICATION (PROD-060)
  // ============================================

  /**
   * Apply to become a service provider (PROD-060.1)
   */
  async apply(
    userId: string,
    dto: CreateServiceProviderDto,
  ): Promise<ServiceProviderResponseDto> {
    // Check for existing application for this service type
    const existing = await this.prisma.serviceProvider.findFirst({
      where: {
        userId,
        serviceType: dto.serviceType,
      },
    });

    if (existing) {
      throw new ConflictException(
        `You already have an application for ${dto.serviceType} service`,
      );
    }

    const provider = await this.prisma.serviceProvider.create({
      data: {
        userId,
        serviceType: dto.serviceType,
        bio: dto.bio,
        qualifications: dto.qualifications,
        experience: dto.experience,
        serviceDetails: dto.serviceDetails as Prisma.InputJsonValue,
        serviceArea: dto.serviceArea as Prisma.InputJsonValue,
        documents: dto.documents as Prisma.InputJsonValue,
        profileCompleteness: this.calculateProfileCompleteness(dto),
        status: ServiceProviderStatus.PENDING,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return this.mapProviderToDto(provider);
  }

  /**
   * Get current user's provider profiles
   */
  async getMyProfiles(userId: string): Promise<ServiceProviderResponseDto[]> {
    const providers = await this.prisma.serviceProvider.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        availability: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return providers.map((p) => this.mapProviderToDto(p));
  }

  /**
   * Get a specific provider profile
   */
  async getProfile(providerId: string): Promise<ServiceProviderResponseDto> {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        availability: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    return this.mapProviderToDto(provider);
  }

  /**
   * Update provider profile (PROD-061)
   */
  async updateProfile(
    providerId: string,
    userId: string,
    dto: UpdateServiceProviderDto,
  ): Promise<ServiceProviderResponseDto> {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updated = await this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        bio: dto.bio ?? provider.bio,
        qualifications: dto.qualifications ?? provider.qualifications,
        experience: dto.experience ?? provider.experience,
        serviceDetails: (dto.serviceDetails ?? provider.serviceDetails) as Prisma.InputJsonValue,
        serviceArea: (dto.serviceArea ?? provider.serviceArea) as Prisma.InputJsonValue,
        documents: (dto.documents ?? provider.documents) as Prisma.InputJsonValue,
        profileCompleteness: this.calculateProfileCompleteness({
          ...provider,
          ...dto,
        }),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        availability: true,
      },
    });

    return this.mapProviderToDto(updated);
  }

  /**
   * Deactivate provider profile
   */
  async deactivate(
    providerId: string,
    userId: string,
  ): Promise<ServiceProviderResponseDto> {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('You can only deactivate your own profile');
    }

    const updated = await this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: { status: ServiceProviderStatus.INACTIVE },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return this.mapProviderToDto(updated);
  }

  // ============================================
  // AVAILABILITY CALENDAR (PROD-062)
  // ============================================

  /**
   * Set weekly availability (PROD-062.1)
   */
  async setWeeklyAvailability(
    providerId: string,
    userId: string,
    dto: SetWeeklyAvailabilityDto,
  ): Promise<void> {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('You can only manage your own availability');
    }

    // Use upsert for each slot
    await this.prisma.$transaction(
      dto.slots.map((slot) =>
        this.prisma.providerAvailability.upsert({
          where: {
            providerId_dayOfWeek: {
              providerId,
              dayOfWeek: slot.dayOfWeek,
            },
          },
          create: {
            providerId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable ?? true,
          },
          update: {
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable ?? true,
          },
        }),
      ),
    );
  }

  /**
   * Get provider's weekly availability
   */
  async getWeeklyAvailability(providerId: string) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    return this.prisma.providerAvailability.findMany({
      where: { providerId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  /**
   * Add availability exception (PROD-062.3)
   */
  async addException(
    providerId: string,
    userId: string,
    dto: CreateAvailabilityExceptionDto,
  ) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('You can only manage your own availability');
    }

    return this.prisma.availabilityException.upsert({
      where: {
        providerId_date: {
          providerId,
          date: new Date(dto.date),
        },
      },
      create: {
        providerId,
        date: new Date(dto.date),
        isAvailable: dto.isAvailable ?? false,
        reason: dto.reason,
      },
      update: {
        isAvailable: dto.isAvailable ?? false,
        reason: dto.reason,
      },
    });
  }

  /**
   * Get provider's exceptions
   */
  async getExceptions(providerId: string, startDate?: string, endDate?: string) {
    const where: Prisma.AvailabilityExceptionWhereInput = { providerId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    return this.prisma.availabilityException.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Delete an availability exception
   */
  async deleteException(
    exceptionId: string,
    userId: string,
  ): Promise<void> {
    const exception = await this.prisma.availabilityException.findUnique({
      where: { id: exceptionId },
      include: { provider: true },
    });

    if (!exception) {
      throw new NotFoundException('Exception not found');
    }

    if (exception.provider.userId !== userId) {
      throw new ForbiddenException('You can only delete your own exceptions');
    }

    await this.prisma.availabilityException.delete({
      where: { id: exceptionId },
    });
  }

  /**
   * Check if provider is available on a specific date/time (PROD-062.4)
   */
  async checkAvailability(
    providerId: string,
    date: string,
    timeSlot?: string,
  ): Promise<{ available: boolean; reason?: string }> {
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay();

    // Check for exceptions first
    const exception = await this.prisma.availabilityException.findUnique({
      where: {
        providerId_date: {
          providerId,
          date: checkDate,
        },
      },
    });

    if (exception) {
      return {
        available: exception.isAvailable,
        reason: exception.reason || (exception.isAvailable ? undefined : 'Unavailable on this date'),
      };
    }

    // Check weekly availability
    const weeklySlot = await this.prisma.providerAvailability.findUnique({
      where: {
        providerId_dayOfWeek: {
          providerId,
          dayOfWeek,
        },
      },
    });

    if (!weeklySlot || !weeklySlot.isAvailable) {
      return {
        available: false,
        reason: 'Not available on this day of the week',
      };
    }

    // Check time slot if provided
    if (timeSlot) {
      const [requestedStart] = timeSlot.split('-');
      if (requestedStart < weeklySlot.startTime || requestedStart >= weeklySlot.endTime) {
        return {
          available: false,
          reason: `Available hours are ${weeklySlot.startTime} - ${weeklySlot.endTime}`,
        };
      }
    }

    return { available: true };
  }

  // ============================================
  // SERVICE REQUESTS (PROD-063, PROD-064)
  // ============================================

  /**
   * Create a service request (PROD-063.1)
   */
  async createRequest(
    requesterId: string,
    dto: CreateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    // If targeting a specific provider, verify they exist and are approved
    if (dto.providerId) {
      const provider = await this.prisma.serviceProvider.findUnique({
        where: { id: dto.providerId },
      });

      if (!provider) {
        throw new NotFoundException('Service provider not found');
      }

      if (provider.status !== ServiceProviderStatus.APPROVED) {
        throw new BadRequestException('Service provider is not currently available');
      }

      if (provider.serviceType !== dto.serviceType) {
        throw new BadRequestException('Provider does not offer this service type');
      }
    }

    // Verify property if provided
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });

      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const request = await this.prisma.serviceRequest.create({
      data: {
        requesterId,
        providerId: dto.providerId,
        serviceType: dto.serviceType,
        propertyId: dto.propertyId,
        title: dto.title,
        description: dto.description,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
        preferredTimeSlot: dto.preferredTimeSlot,
        urgency: dto.urgency,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        budget: dto.budget,
        currency: dto.currency || 'EUR',
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        provider: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        property: {
          select: { id: true, title: true, address: true, city: true },
        },
      },
    });

    return this.mapRequestToDto(request);
  }

  /**
   * Get requests made by user
   */
  async getMyRequests(
    userId: string,
    query: ServiceRequestQueryDto,
  ): Promise<ServiceRequestListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceRequestWhereInput = { requesterId: userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.serviceType) {
      where.serviceType = query.serviceType;
    }

    const [requests, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true },
          },
          provider: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          property: {
            select: { id: true, title: true, address: true, city: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      data: requests.map((r) => this.mapRequestToDto(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get requests received by provider
   */
  async getReceivedRequests(
    providerId: string,
    userId: string,
    query: ServiceRequestQueryDto,
  ): Promise<ServiceRequestListResponseDto> {
    // Verify ownership
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceRequestWhereInput = { providerId };

    if (query.status) {
      where.status = query.status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true },
          },
          provider: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          property: {
            select: { id: true, title: true, address: true, city: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      data: requests.map((r) => this.mapRequestToDto(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single request
   */
  async getRequest(
    requestId: string,
    userId: string,
  ): Promise<ServiceRequestResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        provider: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        property: {
          select: { id: true, title: true, address: true, city: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    // Verify access (requester or provider)
    const isRequester = request.requesterId === userId;
    const isProvider = request.provider?.userId === userId;

    if (!isRequester && !isProvider) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapRequestToDto(request);
  }

  /**
   * Respond to a service request (PROD-064.2)
   */
  async respondToRequest(
    requestId: string,
    userId: string,
    dto: RespondToRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        provider: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (!request.provider) {
      throw new BadRequestException('This request is not assigned to a provider');
    }

    if (request.provider.userId !== userId) {
      throw new ForbiddenException('Only the assigned provider can respond');
    }

    if (request.status !== ServiceRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been responded to');
    }

    const newStatus =
      dto.action === 'accept'
        ? ServiceRequestStatus.ACCEPTED
        : ServiceRequestStatus.REJECTED;

    const updated = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        respondedAt: new Date(),
        rejectionReason: dto.action === 'reject' ? dto.rejectionReason : null,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        provider: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        property: {
          select: { id: true, title: true, address: true, city: true },
        },
      },
    });

    return this.mapRequestToDto(updated);
  }

  /**
   * Start working on a request (PROD-064.3)
   */
  async startRequest(
    requestId: string,
    userId: string,
  ): Promise<ServiceRequestResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (!request.provider || request.provider.userId !== userId) {
      throw new ForbiddenException('Only the assigned provider can start work');
    }

    if (request.status !== ServiceRequestStatus.ACCEPTED) {
      throw new BadRequestException('Request must be accepted before starting');
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status: ServiceRequestStatus.IN_PROGRESS },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        provider: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        property: {
          select: { id: true, title: true, address: true, city: true },
        },
      },
    });

    return this.mapRequestToDto(updated);
  }

  /**
   * Complete a service request (PROD-064.4)
   */
  async completeRequest(
    requestId: string,
    userId: string,
    dto: CompleteRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (!request.provider || request.provider.userId !== userId) {
      throw new ForbiddenException('Only the assigned provider can complete');
    }

    if (request.status !== ServiceRequestStatus.IN_PROGRESS) {
      throw new BadRequestException('Request must be in progress to complete');
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: ServiceRequestStatus.COMPLETED,
        completedAt: new Date(),
        completionNotes: dto.completionNotes,
      },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        provider: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        property: {
          select: { id: true, title: true, address: true, city: true },
        },
      },
    });

    return this.mapRequestToDto(updated);
  }

  /**
   * Cancel a service request (PROD-064.5)
   */
  async cancelRequest(
    requestId: string,
    userId: string,
  ): Promise<ServiceRequestResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { provider: true },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can cancel');
    }

    if (
      request.status === ServiceRequestStatus.COMPLETED ||
      request.status === ServiceRequestStatus.CANCELLED
    ) {
      throw new BadRequestException('Request cannot be cancelled');
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status: ServiceRequestStatus.CANCELLED },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true },
        },
        provider: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        property: {
          select: { id: true, title: true, address: true, city: true },
        },
      },
    });

    return this.mapRequestToDto(updated);
  }

  // ============================================
  // SEARCH (PROD-065)
  // ============================================

  /**
   * Search for service providers (PROD-065.1)
   */
  async search(
    query: ServiceProviderQueryDto,
  ): Promise<ServiceProviderListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceProviderWhereInput = {
      status: ServiceProviderStatus.APPROVED,
    };

    if (query.serviceType) {
      where.serviceType = query.serviceType;
    }

    if (query.minRating) {
      where.averageRating = { gte: query.minRating };
    }

    if (query.city || query.country) {
      // Search in serviceArea JSON field
      where.OR = [];

      if (query.city) {
        where.OR.push({
          serviceArea: {
            path: ['city'],
            string_contains: query.city,
          },
        });
      }

      if (query.country) {
        where.OR.push({
          serviceArea: {
            path: ['country'],
            equals: query.country,
          },
        });
      }
    }

    if (query.search) {
      const searchConditions: Prisma.ServiceProviderWhereInput[] = [
        { bio: { contains: query.search, mode: 'insensitive' } },
        { qualifications: { contains: query.search, mode: 'insensitive' } },
        { experience: { contains: query.search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    // Build order by
    const orderBy: Prisma.ServiceProviderOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'rating';
    const sortOrder = query.sortOrder || 'desc';

    switch (sortField) {
      case 'rating':
        orderBy.averageRating = sortOrder;
        break;
      case 'reviews':
        orderBy.totalReviews = sortOrder;
        break;
      case 'createdAt':
        orderBy.createdAt = sortOrder;
        break;
    }

    const [providers, total] = await Promise.all([
      this.prisma.serviceProvider.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          availability: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.serviceProvider.count({ where }),
    ]);

    return {
      data: providers.map((p) => this.mapProviderToDto(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // ADMIN (PROD-066)
  // ============================================

  /**
   * List providers for admin review (PROD-066.1)
   */
  async adminList(
    query: AdminProviderQueryDto,
  ): Promise<ServiceProviderListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceProviderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.serviceType) {
      where.serviceType = query.serviceType;
    }

    const [providers, total] = await Promise.all([
      this.prisma.serviceProvider.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          availability: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.serviceProvider.count({ where }),
    ]);

    return {
      data: providers.map((p) => this.mapProviderToDto(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Review a provider application (PROD-066.2)
   */
  async adminReview(
    providerId: string,
    adminId: string,
    dto: AdminReviewDto,
  ): Promise<ServiceProviderResponseDto> {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.status !== ServiceProviderStatus.PENDING) {
      throw new BadRequestException('Provider has already been reviewed');
    }

    const newStatus =
      dto.decision === 'approve'
        ? ServiceProviderStatus.APPROVED
        : ServiceProviderStatus.REJECTED;

    const updated = await this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        status: newStatus,
        adminNotes: dto.adminNotes,
        reviewedAt: new Date(),
        reviewedById: adminId,
        isVerified: dto.decision === 'approve',
        verifiedAt: dto.decision === 'approve' ? new Date() : null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        availability: true,
      },
    });

    return this.mapProviderToDto(updated);
  }

  /**
   * Suspend a provider (PROD-066.3)
   */
  async adminSuspend(
    providerId: string,
    adminId: string,
    reason: string,
  ): Promise<ServiceProviderResponseDto> {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    const updated = await this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        status: ServiceProviderStatus.SUSPENDED,
        adminNotes: reason,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return this.mapProviderToDto(updated);
  }

  // ============================================
  // JOB MATCHING (PROD-063)
  // ============================================

  /**
   * Find matching providers for a service request (PROD-063.2)
   */
  async findMatchingProviders(
    serviceType: ServiceType,
    city?: string,
    country?: string,
    preferredDate?: string,
  ): Promise<ServiceProviderResponseDto[]> {
    const where: Prisma.ServiceProviderWhereInput = {
      serviceType,
      status: ServiceProviderStatus.APPROVED,
    };

    // Location filtering on serviceArea JSON
    if (city || country) {
      where.OR = [];

      if (city) {
        where.OR.push({
          serviceArea: {
            path: ['city'],
            string_contains: city,
          },
        });
      }

      if (country) {
        where.OR.push({
          serviceArea: {
            path: ['country'],
            equals: country,
          },
        });
      }
    }

    const providers = await this.prisma.serviceProvider.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        availability: true,
      },
      orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
      take: 20,
    });

    // If preferred date, filter by availability
    if (preferredDate) {
      const availableProviders = [];
      for (const provider of providers) {
        const availability = await this.checkAvailability(provider.id, preferredDate);
        if (availability.available) {
          availableProviders.push(provider);
        }
      }
      return availableProviders.map((p) => this.mapProviderToDto(p));
    }

    return providers.map((p) => this.mapProviderToDto(p));
  }

  // ============================================
  // REVIEWS (PROD-068)
  // ============================================

  /**
   * Create a review for a completed service request (PROD-068.1)
   */
  async createReview(
    userId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    // Verify the service request exists and was completed
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: dto.serviceRequestId },
      include: {
        provider: true,
        review: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can leave a review');
    }

    if (request.status !== ServiceRequestStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed service requests');
    }

    if (request.review) {
      throw new ConflictException('A review already exists for this request');
    }

    if (!request.provider) {
      throw new BadRequestException('Service request has no provider');
    }

    // Create review and update provider rating in a transaction
    const review = await this.prisma.$transaction(async (tx) => {
      const review = await tx.providerReview.create({
        data: {
          providerId: request.provider!.id,
          reviewerId: userId,
          serviceRequestId: dto.serviceRequestId,
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          isPublic: dto.isPublic ?? true,
        },
        include: {
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          serviceRequest: {
            select: { id: true, title: true, serviceType: true },
          },
        },
      });

      // Update provider's aggregate rating
      const aggregateRating = await tx.providerReview.aggregate({
        where: { providerId: request.provider!.id },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.serviceProvider.update({
        where: { id: request.provider!.id },
        data: {
          averageRating: aggregateRating._avg.rating || 0,
          totalReviews: aggregateRating._count.rating || 0,
        },
      });

      return review;
    });

    return this.mapReviewToDto(review);
  }

  /**
   * Update a review (PROD-068.2)
   */
  async updateReview(
    reviewId: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.providerReview.findUnique({
      where: { id: reviewId },
      include: { provider: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Update review and recalculate aggregate if rating changed
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.providerReview.update({
        where: { id: reviewId },
        data: {
          rating: dto.rating ?? review.rating,
          title: dto.title ?? review.title,
          comment: dto.comment ?? review.comment,
          isPublic: dto.isPublic ?? review.isPublic,
        },
        include: {
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          serviceRequest: {
            select: { id: true, title: true, serviceType: true },
          },
        },
      });

      // Recalculate aggregate rating if rating was changed
      if (dto.rating !== undefined && dto.rating !== review.rating) {
        const aggregateRating = await tx.providerReview.aggregate({
          where: { providerId: review.providerId },
          _avg: { rating: true },
          _count: { rating: true },
        });

        await tx.serviceProvider.update({
          where: { id: review.providerId },
          data: {
            averageRating: aggregateRating._avg.rating || 0,
            totalReviews: aggregateRating._count.rating || 0,
          },
        });
      }

      return updated;
    });

    return this.mapReviewToDto(updated);
  }

  /**
   * Delete a review
   */
  async deleteReview(
    reviewId: string,
    userId: string,
  ): Promise<void> {
    const review = await this.prisma.providerReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.providerReview.delete({
        where: { id: reviewId },
      });

      // Recalculate aggregate rating
      const aggregateRating = await tx.providerReview.aggregate({
        where: { providerId: review.providerId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.serviceProvider.update({
        where: { id: review.providerId },
        data: {
          averageRating: aggregateRating._avg.rating || 0,
          totalReviews: aggregateRating._count.rating || 0,
        },
      });
    });
  }

  /**
   * Get reviews for a provider (PROD-068.3)
   */
  async getProviderReviews(
    providerId: string,
    query: ReviewQueryDto,
  ): Promise<ReviewListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProviderReviewWhereInput = {
      providerId,
      isPublic: true,
    };

    if (query.rating) {
      where.rating = query.rating;
    }

    // Build order by
    const orderBy: Prisma.ProviderReviewOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    switch (sortField) {
      case 'rating':
        orderBy.rating = sortOrder;
        break;
      case 'helpfulCount':
        orderBy.helpfulCount = sortOrder;
        break;
      case 'createdAt':
      default:
        orderBy.createdAt = sortOrder;
        break;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.providerReview.findMany({
        where,
        include: {
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          serviceRequest: {
            select: { id: true, title: true, serviceType: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.providerReview.count({ where }),
    ]);

    // Get rating distribution
    const ratingDistribution = await this.prisma.providerReview.groupBy({
      by: ['rating'],
      where: { providerId, isPublic: true },
      _count: { rating: true },
    });

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r.rating] = r._count.rating;
    });

    // Get aggregate stats
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: providerId },
      select: { averageRating: true, totalReviews: true },
    });

    return {
      data: reviews.map((r) => this.mapReviewToDto(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: provider
        ? {
            averageRating: provider.averageRating,
            totalReviews: provider.totalReviews,
            ratingDistribution: distribution,
          }
        : undefined,
    };
  }

  /**
   * Get a single review
   */
  async getReview(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.providerReview.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        serviceRequest: {
          select: { id: true, title: true, serviceType: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.mapReviewToDto(review);
  }

  /**
   * Mark a review as helpful (PROD-068.5)
   */
  async markReviewHelpful(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.providerReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.providerReview.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        serviceRequest: {
          select: { id: true, title: true, serviceType: true },
        },
      },
    });

    return this.mapReviewToDto(updated);
  }

  /**
   * Get my reviews (reviews I've written)
   */
  async getMyReviews(
    userId: string,
    query: ReviewQueryDto,
  ): Promise<ReviewListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProviderReviewWhereInput = { reviewerId: userId };

    if (query.rating) {
      where.rating = query.rating;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.providerReview.findMany({
        where,
        include: {
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
          serviceRequest: {
            select: { id: true, title: true, serviceType: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.providerReview.count({ where }),
    ]);

    return {
      data: reviews.map((r) => this.mapReviewToDto(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private calculateProfileCompleteness(data: any): number {
    let score = 0;
    const fields = [
      { name: 'bio', weight: 20 },
      { name: 'qualifications', weight: 20 },
      { name: 'experience', weight: 15 },
      { name: 'serviceDetails', weight: 15 },
      { name: 'serviceArea', weight: 15 },
      { name: 'documents', weight: 15 },
    ];

    for (const field of fields) {
      if (data[field.name]) {
        score += field.weight;
      }
    }

    return Math.min(100, score);
  }

  private mapProviderToDto(provider: any): ServiceProviderResponseDto {
    return {
      id: provider.id,
      userId: provider.userId,
      serviceType: provider.serviceType,
      status: provider.status,
      bio: provider.bio,
      qualifications: provider.qualifications,
      experience: provider.experience,
      serviceDetails: provider.serviceDetails as Record<string, unknown>,
      serviceArea: provider.serviceArea as Record<string, unknown>,
      documents: provider.documents as Array<{ type: string; url: string; name: string }>,
      profileCompleteness: provider.profileCompleteness,
      isVerified: provider.isVerified,
      verifiedAt: provider.verifiedAt,
      averageRating: provider.averageRating,
      totalReviews: provider.totalReviews,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      user: provider.user
        ? {
            id: provider.user.id,
            firstName: provider.user.firstName,
            lastName: provider.user.lastName,
            email: provider.user.email,
          }
        : undefined,
      availability: provider.availability?.map((a: any) => ({
        id: a.id,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      })),
    };
  }

  private mapRequestToDto(request: any): ServiceRequestResponseDto {
    return {
      id: request.id,
      requesterId: request.requesterId,
      providerId: request.providerId,
      serviceType: request.serviceType,
      propertyId: request.propertyId,
      title: request.title,
      description: request.description,
      preferredDate: request.preferredDate,
      preferredTimeSlot: request.preferredTimeSlot,
      urgency: request.urgency,
      address: request.address,
      city: request.city,
      country: request.country,
      budget: request.budget?.toString(),
      currency: request.currency,
      status: request.status,
      respondedAt: request.respondedAt,
      rejectionReason: request.rejectionReason,
      completedAt: request.completedAt,
      completionNotes: request.completionNotes,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      requester: request.requester
        ? {
            id: request.requester.id,
            firstName: request.requester.firstName,
            lastName: request.requester.lastName,
          }
        : undefined,
      provider: request.provider
        ? this.mapProviderToDto(request.provider)
        : undefined,
      property: request.property
        ? {
            id: request.property.id,
            title: request.property.title,
            address: request.property.address,
            city: request.property.city,
          }
        : undefined,
    };
  }

  private mapReviewToDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      providerId: review.providerId,
      reviewerId: review.reviewerId,
      serviceRequestId: review.serviceRequestId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      helpfulCount: review.helpfulCount,
      isPublic: review.isPublic,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewer: review.reviewer
        ? {
            id: review.reviewer.id,
            firstName: review.reviewer.firstName,
            lastName: review.reviewer.lastName,
          }
        : undefined,
      serviceRequest: review.serviceRequest
        ? {
            id: review.serviceRequest.id,
            title: review.serviceRequest.title,
            serviceType: review.serviceRequest.serviceType,
          }
        : undefined,
    };
  }
}
