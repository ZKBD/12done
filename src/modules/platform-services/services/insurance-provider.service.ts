import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PlatformProviderStatus, Prisma } from '@prisma/client';
import {
  CreateInsuranceProviderDto,
  UpdateInsuranceProviderDto,
  UpdateProviderStatusDto,
  QueryInsuranceProvidersDto,
  InsuranceProviderResponseDto,
  PaginatedInsuranceProvidersDto,
} from '../dto';

@Injectable()
export class InsuranceProviderService {
  private readonly logger = new Logger(InsuranceProviderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply to become an insurance provider (PROD-081.1)
   */
  async applyAsProvider(
    userId: string,
    dto: CreateInsuranceProviderDto,
  ): Promise<InsuranceProviderResponseDto> {
    // Check if user already has an insurance provider profile
    const existing = await this.prisma.insuranceProvider.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User already has an insurance provider profile');
    }

    const provider = await this.prisma.insuranceProvider.create({
      data: {
        userId,
        companyName: dto.companyName,
        companyLogo: dto.companyLogo,
        licenseNumber: dto.licenseNumber,
        licenseState: dto.licenseState,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'US',
        description: dto.description,
        yearFounded: dto.yearFounded,
        employeeCount: dto.employeeCount,
        insuranceTypes: dto.insuranceTypes,
        coverageAreas: dto.coverageAreas || [],
        applicationNotes: dto.applicationNotes,
        documents: dto.documents || [],
        status: PlatformProviderStatus.PENDING,
      },
    });

    this.logger.log(`Insurance provider application created: ${provider.id}`);

    return this.mapToResponseDto(provider);
  }

  /**
   * Get provider by ID (PROD-082.1)
   */
  async getProviderById(id: string): Promise<InsuranceProviderResponseDto> {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Insurance provider not found');
    }

    return this.mapToResponseDto(provider);
  }

  /**
   * Get provider by user ID
   */
  async getProviderByUserId(userId: string): Promise<InsuranceProviderResponseDto | null> {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { userId },
    });

    return provider ? this.mapToResponseDto(provider) : null;
  }

  /**
   * Update provider profile (PROD-082.1)
   */
  async updateProvider(
    id: string,
    userId: string,
    dto: UpdateInsuranceProviderDto,
  ): Promise<InsuranceProviderResponseDto> {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Insurance provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this provider');
    }

    const updated = await this.prisma.insuranceProvider.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Insurance provider updated: ${id}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Update provider status (Admin only) (PROD-081.5)
   */
  async updateProviderStatus(
    id: string,
    adminId: string,
    dto: UpdateProviderStatusDto,
  ): Promise<InsuranceProviderResponseDto> {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Insurance provider not found');
    }

    const updateData: Prisma.InsuranceProviderUpdateInput = {
      status: dto.status,
      statusReason: dto.statusReason,
    };

    if (dto.status === PlatformProviderStatus.APPROVED) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = adminId;
    }

    const updated = await this.prisma.insuranceProvider.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Insurance provider ${id} status updated to ${dto.status} by admin ${adminId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * List insurance providers with filters (PROD-080.2)
   */
  async listProviders(
    query: QueryInsuranceProvidersDto,
  ): Promise<PaginatedInsuranceProvidersDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.InsuranceProviderWhereInput = {
      status: PlatformProviderStatus.APPROVED, // Only show approved providers
    };

    if (query.insuranceType) {
      where.insuranceTypes = { has: query.insuranceType };
    }

    if (query.coverageArea) {
      where.coverageAreas = { has: query.coverageArea };
    }

    if (query.platformPartnersOnly) {
      where.isPlatformPartner = true;
    }

    if (query.minRating) {
      where.averageRating = { gte: query.minRating };
    }

    // Build order by
    let orderBy: Prisma.InsuranceProviderOrderByWithRelationInput = {};
    switch (query.sortBy) {
      case 'rating':
        orderBy = { averageRating: query.sortOrder === 'asc' ? 'asc' : 'desc' };
        break;
      case 'responseTime':
        orderBy = { avgResponseTime: query.sortOrder === 'asc' ? 'asc' : 'desc' };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    const [providers, total] = await Promise.all([
      this.prisma.insuranceProvider.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.insuranceProvider.count({ where }),
    ]);

    return {
      items: providers.map((p) => this.mapToResponseDto(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List pending applications (Admin only) (PROD-081.5)
   */
  async listPendingApplications(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedInsuranceProvidersDto> {
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      this.prisma.insuranceProvider.findMany({
        where: { status: PlatformProviderStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.insuranceProvider.count({
        where: { status: PlatformProviderStatus.PENDING },
      }),
    ]);

    return {
      items: providers.map((p) => this.mapToResponseDto(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Toggle platform partner status (Admin only) (PROD-080.4)
   */
  async togglePlatformPartner(
    id: string,
    isPlatformPartner: boolean,
  ): Promise<InsuranceProviderResponseDto> {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Insurance provider not found');
    }

    const updated = await this.prisma.insuranceProvider.update({
      where: { id },
      data: { isPlatformPartner },
    });

    this.logger.log(
      `Insurance provider ${id} platform partner status: ${isPlatformPartner}`,
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Update provider metrics (internal use)
   */
  async updateProviderMetrics(
    id: string,
    metrics: {
      averageRating?: number;
      totalReviews?: number;
      responseRate?: number;
      avgResponseTime?: number;
    },
  ): Promise<void> {
    await this.prisma.insuranceProvider.update({
      where: { id },
      data: metrics,
    });
  }

  private mapToResponseDto(provider: any): InsuranceProviderResponseDto {
    return {
      id: provider.id,
      companyName: provider.companyName,
      companyLogo: provider.companyLogo,
      licenseNumber: provider.licenseNumber,
      licenseState: provider.licenseState,
      licenseExpiry: provider.licenseExpiry,
      email: provider.email,
      phone: provider.phone,
      website: provider.website,
      address: provider.address,
      city: provider.city,
      state: provider.state,
      postalCode: provider.postalCode,
      country: provider.country,
      description: provider.description,
      yearFounded: provider.yearFounded,
      employeeCount: provider.employeeCount,
      insuranceTypes: provider.insuranceTypes,
      coverageAreas: provider.coverageAreas,
      status: provider.status,
      isPlatformPartner: provider.isPlatformPartner,
      averageRating: provider.averageRating,
      totalReviews: provider.totalReviews,
      responseRate: provider.responseRate,
      avgResponseTime: provider.avgResponseTime,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
