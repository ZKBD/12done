import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { InquiryStatus, PlatformProviderStatus, Prisma } from '@prisma/client';
import {
  CreateInsuranceInquiryDto,
  CreateMortgageInquiryDto,
  RespondToInquiryDto,
  SubmitInquiryFeedbackDto,
  QueryInquiriesDto,
  ProviderInquiryResponseDto,
  PaginatedInquiriesDto,
} from '../dto';
import { InsuranceProviderService } from './insurance-provider.service';
import { MortgageProviderService } from './mortgage-provider.service';

@Injectable()
export class ProviderInquiryService {
  private readonly logger = new Logger(ProviderInquiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insuranceProviderService: InsuranceProviderService,
    private readonly mortgageProviderService: MortgageProviderService,
  ) {}

  /**
   * Create inquiry to insurance provider (PROD-082.3)
   */
  async createInsuranceInquiry(
    userId: string,
    dto: CreateInsuranceInquiryDto,
  ): Promise<ProviderInquiryResponseDto> {
    // Verify provider exists and is approved
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id: dto.providerId },
    });

    if (!provider) {
      throw new NotFoundException('Insurance provider not found');
    }

    if (provider.status !== PlatformProviderStatus.APPROVED) {
      throw new BadRequestException('Provider is not accepting inquiries');
    }

    // Verify property exists if provided
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const inquiry = await this.prisma.providerInquiry.create({
      data: {
        userId,
        insuranceProviderId: dto.providerId,
        providerType: 'insurance',
        propertyId: dto.propertyId,
        subject: dto.subject,
        message: dto.message,
        phoneNumber: dto.phoneNumber,
        insuranceType: dto.insuranceType,
        status: InquiryStatus.PENDING,
      },
      include: {
        insuranceProvider: {
          select: { id: true, companyName: true, companyLogo: true },
        },
      },
    });

    this.logger.log(`Insurance inquiry created: ${inquiry.id}`);

    return this.mapToResponseDto(inquiry);
  }

  /**
   * Create inquiry to mortgage provider (PROD-082.3)
   */
  async createMortgageInquiry(
    userId: string,
    dto: CreateMortgageInquiryDto,
  ): Promise<ProviderInquiryResponseDto> {
    // Verify provider exists and is approved
    const provider = await this.prisma.mortgageProvider.findUnique({
      where: { id: dto.providerId },
    });

    if (!provider) {
      throw new NotFoundException('Mortgage provider not found');
    }

    if (provider.status !== PlatformProviderStatus.APPROVED) {
      throw new BadRequestException('Provider is not accepting inquiries');
    }

    // Verify property exists if provided
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    const inquiry = await this.prisma.providerInquiry.create({
      data: {
        userId,
        mortgageProviderId: dto.providerId,
        providerType: 'mortgage',
        propertyId: dto.propertyId,
        subject: dto.subject,
        message: dto.message,
        phoneNumber: dto.phoneNumber,
        mortgageType: dto.mortgageType,
        loanAmount: dto.loanAmount,
        downPayment: dto.downPayment,
        creditScore: dto.creditScore,
        status: InquiryStatus.PENDING,
      },
      include: {
        mortgageProvider: {
          select: { id: true, companyName: true, companyLogo: true },
        },
      },
    });

    this.logger.log(`Mortgage inquiry created: ${inquiry.id}`);

    return this.mapToResponseDto(inquiry);
  }

  /**
   * Get inquiry by ID
   */
  async getInquiryById(
    id: string,
    userId: string,
  ): Promise<ProviderInquiryResponseDto> {
    const inquiry = await this.prisma.providerInquiry.findUnique({
      where: { id },
      include: {
        insuranceProvider: {
          select: { id: true, companyName: true, companyLogo: true, userId: true },
        },
        mortgageProvider: {
          select: { id: true, companyName: true, companyLogo: true, userId: true },
        },
      },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    // Check if user is either the inquirer or the provider
    const isInquirer = inquiry.userId === userId;
    const isProvider =
      (inquiry.insuranceProvider?.userId === userId) ||
      (inquiry.mortgageProvider?.userId === userId);

    if (!isInquirer && !isProvider) {
      throw new ForbiddenException('Not authorized to view this inquiry');
    }

    // Mark as viewed if provider is viewing
    if (isProvider && inquiry.status === InquiryStatus.PENDING) {
      await this.prisma.providerInquiry.update({
        where: { id },
        data: { status: InquiryStatus.VIEWED, viewedAt: new Date() },
      });
      inquiry.status = InquiryStatus.VIEWED;
      inquiry.viewedAt = new Date();
    }

    return this.mapToResponseDto(inquiry);
  }

  /**
   * Respond to inquiry (Provider only) (PROD-082.4)
   */
  async respondToInquiry(
    id: string,
    userId: string,
    dto: RespondToInquiryDto,
  ): Promise<ProviderInquiryResponseDto> {
    const inquiry = await this.prisma.providerInquiry.findUnique({
      where: { id },
      include: {
        insuranceProvider: { select: { userId: true } },
        mortgageProvider: { select: { userId: true } },
      },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    // Verify user is the provider
    const isProvider =
      (inquiry.insuranceProvider?.userId === userId) ||
      (inquiry.mortgageProvider?.userId === userId);

    if (!isProvider) {
      throw new ForbiddenException('Only the provider can respond to this inquiry');
    }

    if (inquiry.status === InquiryStatus.RESPONDED) {
      throw new BadRequestException('Inquiry has already been responded to');
    }

    const updated = await this.prisma.providerInquiry.update({
      where: { id },
      data: {
        response: dto.response,
        responseBy: userId,
        respondedAt: new Date(),
        status: InquiryStatus.RESPONDED,
      },
      include: {
        insuranceProvider: {
          select: { id: true, companyName: true, companyLogo: true },
        },
        mortgageProvider: {
          select: { id: true, companyName: true, companyLogo: true },
        },
      },
    });

    this.logger.log(`Inquiry ${id} responded by provider`);

    // Update provider response metrics
    await this.updateProviderResponseMetrics(inquiry);

    return this.mapToResponseDto(updated);
  }

  /**
   * Submit feedback on inquiry (User only) (PROD-082.5)
   */
  async submitFeedback(
    id: string,
    userId: string,
    dto: SubmitInquiryFeedbackDto,
  ): Promise<ProviderInquiryResponseDto> {
    const inquiry = await this.prisma.providerInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    if (inquiry.userId !== userId) {
      throw new ForbiddenException('Only the inquirer can submit feedback');
    }

    if (inquiry.status !== InquiryStatus.RESPONDED) {
      throw new BadRequestException('Can only submit feedback after provider has responded');
    }

    if (inquiry.rating) {
      throw new BadRequestException('Feedback has already been submitted');
    }

    const updated = await this.prisma.providerInquiry.update({
      where: { id },
      data: {
        rating: dto.rating,
        feedback: dto.feedback,
        feedbackAt: new Date(),
        status: InquiryStatus.CLOSED,
      },
      include: {
        insuranceProvider: {
          select: { id: true, companyName: true, companyLogo: true },
        },
        mortgageProvider: {
          select: { id: true, companyName: true, companyLogo: true },
        },
      },
    });

    this.logger.log(`Feedback submitted for inquiry ${id}: ${dto.rating} stars`);

    // Update provider rating
    await this.updateProviderRating(inquiry);

    return this.mapToResponseDto(updated);
  }

  /**
   * List user's inquiries
   */
  async listUserInquiries(
    userId: string,
    query: QueryInquiriesDto,
  ): Promise<PaginatedInquiriesDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProviderInquiryWhereInput = { userId };

    if (query.providerType) {
      where.providerType = query.providerType;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [inquiries, total] = await Promise.all([
      this.prisma.providerInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          insuranceProvider: {
            select: { id: true, companyName: true, companyLogo: true },
          },
          mortgageProvider: {
            select: { id: true, companyName: true, companyLogo: true },
          },
        },
      }),
      this.prisma.providerInquiry.count({ where }),
    ]);

    return {
      items: inquiries.map((i) => this.mapToResponseDto(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List provider's received inquiries
   */
  async listProviderInquiries(
    userId: string,
    providerType: 'insurance' | 'mortgage',
    query: QueryInquiriesDto,
  ): Promise<PaginatedInquiriesDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Get provider ID
    let providerId: string | undefined;
    if (providerType === 'insurance') {
      const provider = await this.prisma.insuranceProvider.findUnique({
        where: { userId },
        select: { id: true },
      });
      providerId = provider?.id;
    } else {
      const provider = await this.prisma.mortgageProvider.findUnique({
        where: { userId },
        select: { id: true },
      });
      providerId = provider?.id;
    }

    if (!providerId) {
      throw new NotFoundException('Provider profile not found');
    }

    const where: Prisma.ProviderInquiryWhereInput = {
      providerType,
      ...(providerType === 'insurance'
        ? { insuranceProviderId: providerId }
        : { mortgageProviderId: providerId }),
    };

    if (query.status) {
      where.status = query.status;
    }

    const [inquiries, total] = await Promise.all([
      this.prisma.providerInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          property: {
            select: { id: true, title: true, address: true, city: true },
          },
        },
      }),
      this.prisma.providerInquiry.count({ where }),
    ]);

    return {
      items: inquiries.map((i) => this.mapToResponseDto(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update provider response metrics after responding
   */
  private async updateProviderResponseMetrics(inquiry: any): Promise<void> {
    const providerId = inquiry.insuranceProviderId || inquiry.mortgageProviderId;
    const providerType = inquiry.providerType;

    // Calculate response metrics
    const allInquiries = await this.prisma.providerInquiry.findMany({
      where: providerType === 'insurance'
        ? { insuranceProviderId: providerId }
        : { mortgageProviderId: providerId },
      select: {
        status: true,
        createdAt: true,
        respondedAt: true,
      },
    });

    const responded = allInquiries.filter(
      (i) => i.status === InquiryStatus.RESPONDED || i.status === InquiryStatus.CLOSED,
    );
    const responseRate = allInquiries.length > 0
      ? (responded.length / allInquiries.length) * 100
      : 0;

    // Calculate average response time (in hours)
    const responseTimes = responded
      .filter((i) => i.respondedAt)
      .map((i) => {
        const created = new Date(i.createdAt).getTime();
        const responded = new Date(i.respondedAt!).getTime();
        return (responded - created) / (1000 * 60 * 60); // Hours
      });

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    if (providerType === 'insurance') {
      await this.insuranceProviderService.updateProviderMetrics(providerId, {
        responseRate,
        avgResponseTime: avgResponseTime ?? undefined,
      });
    } else {
      await this.mortgageProviderService.updateProviderMetrics(providerId, {
        responseRate,
        avgResponseTime: avgResponseTime ?? undefined,
      });
    }
  }

  /**
   * Update provider rating after feedback
   */
  private async updateProviderRating(inquiry: any): Promise<void> {
    const providerId = inquiry.insuranceProviderId || inquiry.mortgageProviderId;
    const providerType = inquiry.providerType;

    // Calculate average rating
    const ratedInquiries = await this.prisma.providerInquiry.findMany({
      where: {
        ...(providerType === 'insurance'
          ? { insuranceProviderId: providerId }
          : { mortgageProviderId: providerId }),
        rating: { not: null },
      },
      select: { rating: true },
    });

    const totalReviews = ratedInquiries.length;
    const averageRating = totalReviews > 0
      ? ratedInquiries.reduce((sum, i) => sum + (i.rating || 0), 0) / totalReviews
      : 0;

    if (providerType === 'insurance') {
      await this.insuranceProviderService.updateProviderMetrics(providerId, {
        averageRating,
        totalReviews,
      });
    } else {
      await this.mortgageProviderService.updateProviderMetrics(providerId, {
        averageRating,
        totalReviews,
      });
    }
  }

  private mapToResponseDto(inquiry: any): ProviderInquiryResponseDto {
    const provider = inquiry.insuranceProvider || inquiry.mortgageProvider;

    return {
      id: inquiry.id,
      userId: inquiry.userId,
      insuranceProviderId: inquiry.insuranceProviderId,
      mortgageProviderId: inquiry.mortgageProviderId,
      providerType: inquiry.providerType,
      propertyId: inquiry.propertyId,
      subject: inquiry.subject,
      message: inquiry.message,
      phoneNumber: inquiry.phoneNumber,
      insuranceType: inquiry.insuranceType,
      mortgageType: inquiry.mortgageType,
      loanAmount: inquiry.loanAmount ? Number(inquiry.loanAmount) : undefined,
      downPayment: inquiry.downPayment ? Number(inquiry.downPayment) : undefined,
      creditScore: inquiry.creditScore,
      status: inquiry.status,
      viewedAt: inquiry.viewedAt,
      respondedAt: inquiry.respondedAt,
      response: inquiry.response,
      rating: inquiry.rating,
      feedback: inquiry.feedback,
      feedbackAt: inquiry.feedbackAt,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      provider: provider
        ? {
            id: provider.id,
            companyName: provider.companyName,
            companyLogo: provider.companyLogo,
          }
        : undefined,
    };
  }
}
