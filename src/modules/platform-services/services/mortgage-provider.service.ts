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
  CreateMortgageProviderDto,
  UpdateMortgageProviderDto,
  UpdateProviderStatusDto,
  QueryMortgageProvidersDto,
  MortgageProviderResponseDto,
  PaginatedMortgageProvidersDto,
} from '../dto';

@Injectable()
export class MortgageProviderService {
  private readonly logger = new Logger(MortgageProviderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply to become a mortgage provider (PROD-081.2)
   */
  async applyAsProvider(
    userId: string,
    dto: CreateMortgageProviderDto,
  ): Promise<MortgageProviderResponseDto> {
    // Check if user already has a mortgage provider profile
    const existing = await this.prisma.mortgageProvider.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User already has a mortgage provider profile');
    }

    const provider = await this.prisma.mortgageProvider.create({
      data: {
        userId,
        companyName: dto.companyName,
        companyLogo: dto.companyLogo,
        nmlsId: dto.nmlsId,
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
        productTypes: dto.productTypes,
        minLoanAmount: dto.minLoanAmount,
        maxLoanAmount: dto.maxLoanAmount,
        minCreditScore: dto.minCreditScore,
        lendingAreas: dto.lendingAreas || [],
        rates: dto.rates || {},
        applicationNotes: dto.applicationNotes,
        documents: dto.documents || [],
        status: PlatformProviderStatus.PENDING,
      },
    });

    this.logger.log(`Mortgage provider application created: ${provider.id}`);

    return this.mapToResponseDto(provider);
  }

  /**
   * Get provider by ID (PROD-082.2)
   */
  async getProviderById(id: string): Promise<MortgageProviderResponseDto> {
    const provider = await this.prisma.mortgageProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Mortgage provider not found');
    }

    return this.mapToResponseDto(provider);
  }

  /**
   * Get provider by user ID
   */
  async getProviderByUserId(userId: string): Promise<MortgageProviderResponseDto | null> {
    const provider = await this.prisma.mortgageProvider.findUnique({
      where: { userId },
    });

    return provider ? this.mapToResponseDto(provider) : null;
  }

  /**
   * Update provider profile (PROD-082.2)
   */
  async updateProvider(
    id: string,
    userId: string,
    dto: UpdateMortgageProviderDto,
  ): Promise<MortgageProviderResponseDto> {
    const provider = await this.prisma.mortgageProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Mortgage provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this provider');
    }

    const updated = await this.prisma.mortgageProvider.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Mortgage provider updated: ${id}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Update provider status (Admin only) (PROD-081.5)
   */
  async updateProviderStatus(
    id: string,
    adminId: string,
    dto: UpdateProviderStatusDto,
  ): Promise<MortgageProviderResponseDto> {
    const provider = await this.prisma.mortgageProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Mortgage provider not found');
    }

    const updateData: Prisma.MortgageProviderUpdateInput = {
      status: dto.status,
      statusReason: dto.statusReason,
    };

    if (dto.status === PlatformProviderStatus.APPROVED) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = adminId;
    }

    const updated = await this.prisma.mortgageProvider.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Mortgage provider ${id} status updated to ${dto.status} by admin ${adminId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * List mortgage providers with filters (PROD-080.3)
   */
  async listProviders(
    query: QueryMortgageProvidersDto,
  ): Promise<PaginatedMortgageProvidersDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.MortgageProviderWhereInput = {
      status: PlatformProviderStatus.APPROVED, // Only show approved providers
    };

    if (query.productType) {
      where.productTypes = { has: query.productType };
    }

    if (query.lendingArea) {
      where.lendingAreas = { has: query.lendingArea };
    }

    if (query.loanAmount) {
      where.AND = [
        { OR: [{ minLoanAmount: null }, { minLoanAmount: { lte: query.loanAmount } }] },
        { OR: [{ maxLoanAmount: null }, { maxLoanAmount: { gte: query.loanAmount } }] },
      ];
    }

    if (query.creditScore) {
      where.OR = [
        { minCreditScore: null },
        { minCreditScore: { lte: query.creditScore } },
      ];
    }

    if (query.platformPartnersOnly) {
      where.isPlatformPartner = true;
    }

    if (query.minRating) {
      where.averageRating = { gte: query.minRating };
    }

    // Build order by
    let orderBy: Prisma.MortgageProviderOrderByWithRelationInput = {};
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
      this.prisma.mortgageProvider.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.mortgageProvider.count({ where }),
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
  ): Promise<PaginatedMortgageProvidersDto> {
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      this.prisma.mortgageProvider.findMany({
        where: { status: PlatformProviderStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.mortgageProvider.count({
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
  ): Promise<MortgageProviderResponseDto> {
    const provider = await this.prisma.mortgageProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Mortgage provider not found');
    }

    const updated = await this.prisma.mortgageProvider.update({
      where: { id },
      data: { isPlatformPartner },
    });

    this.logger.log(
      `Mortgage provider ${id} platform partner status: ${isPlatformPartner}`,
    );

    return this.mapToResponseDto(updated);
  }

  /**
   * Update provider rates (PROD-082.2)
   */
  async updateRates(
    id: string,
    userId: string,
    rates: Record<string, number>,
  ): Promise<MortgageProviderResponseDto> {
    const provider = await this.prisma.mortgageProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('Mortgage provider not found');
    }

    if (provider.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this provider');
    }

    const updated = await this.prisma.mortgageProvider.update({
      where: { id },
      data: { rates },
    });

    this.logger.log(`Mortgage provider ${id} rates updated`);

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
    await this.prisma.mortgageProvider.update({
      where: { id },
      data: metrics,
    });
  }

  private mapToResponseDto(provider: any): MortgageProviderResponseDto {
    return {
      id: provider.id,
      companyName: provider.companyName,
      companyLogo: provider.companyLogo,
      nmlsId: provider.nmlsId,
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
      productTypes: provider.productTypes,
      minLoanAmount: provider.minLoanAmount ? Number(provider.minLoanAmount) : undefined,
      maxLoanAmount: provider.maxLoanAmount ? Number(provider.maxLoanAmount) : undefined,
      minCreditScore: provider.minCreditScore,
      lendingAreas: provider.lendingAreas,
      rates: provider.rates as Record<string, number>,
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
