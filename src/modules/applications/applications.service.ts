import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ApplicationStatus, ListingType, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateApplicationDto,
  ReviewApplicationDto,
  ApplicationQueryDto,
  ApplicationResponseDto,
  ApplicationListResponseDto,
} from './dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Create a rental application (PROD-101.3)
   * POST /properties/:id/apply
   */
  async create(
    propertyId: string,
    applicantId: string,
    dto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    // Get property with owner
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Cannot apply to own property
    if (property.ownerId === applicantId) {
      throw new ForbiddenException('Cannot apply to your own property');
    }

    // Property must be for rent
    const rentalTypes: ListingType[] = ['LONG_TERM_RENT', 'SHORT_TERM_RENT'];
    const isRental = property.listingTypes.some((type) =>
      rentalTypes.includes(type),
    );

    if (!isRental) {
      throw new BadRequestException(
        'Property is not available for rent',
      );
    }

    // Check for existing application (unique constraint)
    const existingApplication = await this.prisma.rentalApplication.findUnique({
      where: {
        applicantId_propertyId: {
          applicantId,
          propertyId,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'You have already applied for this property',
      );
    }

    // Create application
    const application = await this.prisma.rentalApplication.create({
      data: {
        applicantId,
        propertyId,
        employmentStatus: dto.employmentStatus,
        employer: dto.employer,
        jobTitle: dto.jobTitle,
        monthlyIncome: dto.monthlyIncome,
        incomeCurrency: dto.incomeCurrency || 'EUR',
        employmentDuration: dto.employmentDuration,
        references: dto.references as unknown as Prisma.InputJsonValue,
        desiredMoveInDate: dto.desiredMoveInDate
          ? new Date(dto.desiredMoveInDate)
          : null,
        desiredLeaseTerm: dto.desiredLeaseTerm,
        numberOfOccupants: dto.numberOfOccupants,
        hasPets: dto.hasPets || false,
        petDetails: dto.petDetails,
        additionalNotes: dto.additionalNotes,
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
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify property owner (APPLICATION_RECEIVED)
    await this.notifications.create(
      property.ownerId,
      'APPLICATION_RECEIVED',
      'New Rental Application',
      `${application.applicant.firstName} ${application.applicant.lastName} has applied for "${property.title}"`,
      {
        applicationId: application.id,
        propertyId: property.id,
        applicantId: applicantId,
      },
    );

    return this.mapToResponseDto(application);
  }

  /**
   * Get user's applications (PROD-101.4)
   * GET /applications
   */
  async getMyApplications(
    userId: string,
    query: ApplicationQueryDto,
  ): Promise<ApplicationListResponseDto> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RentalApplicationWhereInput = {
      applicantId: userId,
    };

    if (status) {
      where.status = status as ApplicationStatus;
    }

    const [applications, total] = await Promise.all([
      this.prisma.rentalApplication.findMany({
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
        },
      }),
      this.prisma.rentalApplication.count({ where }),
    ]);

    return {
      data: applications.map((app) => this.mapToResponseDto(app)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get application by ID
   * GET /applications/:id
   */
  async getById(
    applicationId: string,
    userId: string,
  ): Promise<ApplicationResponseDto> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            country: true,
            ownerId: true,
          },
        },
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Access control: only applicant or property owner can view
    const isApplicant = application.applicantId === userId;
    const isOwner = application.property.ownerId === userId;

    if (!isApplicant && !isOwner) {
      throw new ForbiddenException('Not authorized to view this application');
    }

    return this.mapToResponseDto(application);
  }

  /**
   * Get applications for a property (owner only)
   * GET /properties/:id/applications
   */
  async getPropertyApplications(
    propertyId: string,
    ownerId: string,
    query: ApplicationQueryDto,
  ): Promise<ApplicationListResponseDto> {
    // Verify property ownership
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== ownerId) {
      throw new ForbiddenException('Not authorized to view these applications');
    }

    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RentalApplicationWhereInput = {
      propertyId,
    };

    if (status) {
      where.status = status as ApplicationStatus;
    }

    const [applications, total] = await Promise.all([
      this.prisma.rentalApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.rentalApplication.count({ where }),
    ]);

    return {
      data: applications.map((app) => this.mapToResponseDto(app)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Review application (owner only) - PROD-101.5
   * PATCH /applications/:id/review
   */
  async review(
    applicationId: string,
    ownerId: string,
    dto: ReviewApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Only property owner can review
    if (application.property.ownerId !== ownerId) {
      throw new ForbiddenException('Not authorized to review this application');
    }

    // Cannot review withdrawn applications
    if (application.status === 'WITHDRAWN') {
      throw new BadRequestException('Cannot review a withdrawn application');
    }

    // Update application
    const updated = await this.prisma.rentalApplication.update({
      where: { id: applicationId },
      data: {
        status: dto.status as ApplicationStatus,
        ownerNotes: dto.ownerNotes,
        reviewedAt: new Date(),
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
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify applicant (APPLICATION_STATUS_CHANGED)
    const statusText = dto.status.toLowerCase().replace('_', ' ');
    await this.notifications.create(
      application.applicantId,
      'APPLICATION_STATUS_CHANGED',
      `Application ${statusText}`,
      `Your application for "${application.property.title}" has been ${statusText}`,
      {
        applicationId: application.id,
        propertyId: application.property.id,
        newStatus: dto.status,
      },
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Withdraw application (applicant only)
   * PATCH /applications/:id/withdraw
   */
  async withdraw(
    applicationId: string,
    applicantId: string,
  ): Promise<ApplicationResponseDto> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Only applicant can withdraw
    if (application.applicantId !== applicantId) {
      throw new ForbiddenException(
        'Not authorized to withdraw this application',
      );
    }

    // Can only withdraw PENDING or UNDER_REVIEW applications
    if (!['PENDING', 'UNDER_REVIEW'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot withdraw an application with status: ${application.status}`,
      );
    }

    // Update application
    const updated = await this.prisma.rentalApplication.update({
      where: { id: applicationId },
      data: {
        status: 'WITHDRAWN',
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
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Notify property owner (APPLICATION_WITHDRAWN)
    await this.notifications.create(
      application.property.ownerId,
      'APPLICATION_WITHDRAWN',
      'Application Withdrawn',
      `An applicant has withdrawn their application for "${application.property.title}"`,
      {
        applicationId: application.id,
        propertyId: application.property.id,
      },
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(
    application: {
      id: string;
      applicantId: string;
      propertyId: string;
      status: ApplicationStatus;
      employmentStatus: string | null;
      employer: string | null;
      jobTitle: string | null;
      monthlyIncome: unknown;
      incomeCurrency: string;
      employmentDuration: string | null;
      references: unknown;
      desiredMoveInDate: Date | null;
      desiredLeaseTerm: number | null;
      numberOfOccupants: number | null;
      hasPets: boolean;
      petDetails: string | null;
      additionalNotes: string | null;
      ownerNotes: string | null;
      reviewedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      property?: {
        id: string;
        title: string;
        address: string;
        city: string;
        country: string;
      };
      applicant?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    },
  ): ApplicationResponseDto {
    const property = application.property;
    const applicant = application.applicant;

    return {
      id: application.id,
      applicantId: application.applicantId,
      propertyId: application.propertyId,
      status: application.status,
      employmentStatus: application.employmentStatus || undefined,
      employer: application.employer || undefined,
      jobTitle: application.jobTitle || undefined,
      monthlyIncome: application.monthlyIncome
        ? Number(application.monthlyIncome)
        : undefined,
      incomeCurrency: application.incomeCurrency || undefined,
      employmentDuration: application.employmentDuration || undefined,
      references: application.references as
        | { name: string; relationship: string; phone?: string; email?: string }[]
        | undefined,
      desiredMoveInDate: application.desiredMoveInDate || undefined,
      desiredLeaseTerm: application.desiredLeaseTerm || undefined,
      numberOfOccupants: application.numberOfOccupants || undefined,
      hasPets: application.hasPets,
      petDetails: application.petDetails || undefined,
      additionalNotes: application.additionalNotes || undefined,
      ownerNotes: application.ownerNotes || undefined,
      reviewedAt: application.reviewedAt || undefined,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      property: property
        ? {
            id: property.id,
            title: property.title,
            address: property.address,
            city: property.city,
            country: property.country,
          }
        : undefined,
      applicant: applicant
        ? {
            id: applicant.id,
            firstName: applicant.firstName,
            lastName: applicant.lastName,
            email: applicant.email,
          }
        : undefined,
    };
  }
}
