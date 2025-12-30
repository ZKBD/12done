import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { MailService } from '@/mail';
import {
  VerificationStatus,
  UserRole,
  DocumentType,
  BackgroundCheckType,
} from '@prisma/client';
import {
  SubmitVerificationDto,
  AdminReviewDto,
  VerificationQueueQueryDto,
  RequestBackgroundCheckDto,
  VerificationRequestResponseDto,
  BackgroundCheckResponseDto,
  UserVerificationStatusDto,
  PendingVerificationDto,
} from './dto';
import { PaginatedResponseDto } from '@/common/dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Submit ID verification request (PROD-008.2)
   */
  async submitVerification(
    userId: string,
    dto: SubmitVerificationDto,
  ): Promise<VerificationRequestResponseDto> {
    // Check if user already has a pending verification
    const existingPending = await this.prisma.verificationRequest.findFirst({
      where: {
        userId,
        status: VerificationStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'You already have a pending verification request. Please wait for it to be reviewed.',
      );
    }

    // Check if user is already verified
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.idVerificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Your identity is already verified');
    }

    // Create verification request
    const verificationRequest = await this.prisma.verificationRequest.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentUrl: dto.documentUrl,
        selfieUrl: dto.selfieUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: VerificationStatus.PENDING,
      },
    });

    // Update user status to pending
    await this.prisma.user.update({
      where: { id: userId },
      data: { idVerificationStatus: VerificationStatus.PENDING },
    });

    this.logger.log(`Verification request submitted for user ${userId}`);

    return this.mapToVerificationResponse(verificationRequest);
  }

  /**
   * Get user's verification status (PROD-010)
   */
  async getVerificationStatus(userId: string): Promise<UserVerificationStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const latestVerification = await this.prisma.verificationRequest.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    const latestBackgroundCheck = await this.prisma.backgroundCheck.findFirst({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });

    return {
      userId,
      idVerificationStatus: user.idVerificationStatus,
      idVerifiedAt: user.idVerifiedAt,
      backgroundCheckStatus: user.backgroundCheckStatus,
      backgroundCheckAt: user.backgroundCheckAt,
      hasVerifiedBadge: this.hasVerifiedBadge(user.idVerificationStatus),
      latestVerificationRequest: latestVerification
        ? this.mapToVerificationResponse(latestVerification)
        : null,
      latestBackgroundCheck: latestBackgroundCheck
        ? this.mapToBackgroundCheckResponse(latestBackgroundCheck)
        : null,
    };
  }

  /**
   * Get pending verifications for admin (PROD-008.5)
   */
  async getPendingVerifications(
    query: VerificationQueueQueryDto,
  ): Promise<PaginatedResponseDto<PendingVerificationDto>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where: { status: VerificationStatus.PENDING },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [query.sortBy || 'submittedAt']: query.sortOrder || 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.verificationRequest.count({
        where: { status: VerificationStatus.PENDING },
      }),
    ]);

    const data = requests.map((req) => ({
      id: req.id,
      userId: req.userId,
      documentType: req.documentType,
      documentUrl: req.documentUrl,
      selfieUrl: req.selfieUrl,
      status: req.status,
      rejectionReason: req.rejectionReason,
      submittedAt: req.submittedAt,
      reviewedAt: req.reviewedAt,
      expiresAt: req.expiresAt,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
    }));

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Admin approve/reject verification (PROD-008.6)
   */
  async reviewVerification(
    requestId: string,
    adminId: string,
    dto: AdminReviewDto,
  ): Promise<VerificationRequestResponseDto> {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('This verification request has already been reviewed');
    }

    if (!dto.approved && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting');
    }

    const newStatus = dto.approved
      ? VerificationStatus.VERIFIED
      : VerificationStatus.REJECTED;

    // Update verification request
    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason || null,
      },
    });

    // Update user verification status (PROD-008.7)
    await this.prisma.user.update({
      where: { id: request.userId },
      data: {
        idVerificationStatus: newStatus,
        idVerifiedAt: dto.approved ? new Date() : null,
      },
    });

    // Send notification email (PROD-008.8)
    await this.sendVerificationResultEmail(
      request.user.email,
      request.user.firstName,
      dto.approved,
      dto.rejectionReason,
    );

    this.logger.log(
      `Verification ${requestId} ${dto.approved ? 'approved' : 'rejected'} by admin ${adminId}`,
    );

    return this.mapToVerificationResponse(updatedRequest);
  }

  /**
   * Request background check (PROD-009.2)
   */
  async requestBackgroundCheck(
    userId: string,
    dto: RequestBackgroundCheckDto,
  ): Promise<BackgroundCheckResponseDto> {
    if (!dto.consent) {
      throw new BadRequestException('You must consent to the background check to proceed');
    }

    // Check if user already has a pending check
    const existingPending = await this.prisma.backgroundCheck.findFirst({
      where: {
        userId,
        status: VerificationStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'You already have a pending background check. Please wait for it to complete.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create background check request
    const backgroundCheck = await this.prisma.backgroundCheck.create({
      data: {
        userId,
        type: dto.type,
        status: VerificationStatus.PENDING,
        consentGivenAt: new Date(),
        consentIpAddress: dto.consentIpAddress,
        // In production, would call external provider here and store reference
        providerName: 'Internal', // Placeholder for demo
        providerReference: `internal-${Date.now()}`,
      },
    });

    // Update user status to pending
    await this.prisma.user.update({
      where: { id: userId },
      data: { backgroundCheckStatus: VerificationStatus.PENDING },
    });

    this.logger.log(`Background check requested for user ${userId}`);

    return this.mapToBackgroundCheckResponse(backgroundCheck);
  }

  /**
   * Get user's background checks
   */
  async getBackgroundChecks(userId: string): Promise<BackgroundCheckResponseDto[]> {
    const checks = await this.prisma.backgroundCheck.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });

    return checks.map((check) => this.mapToBackgroundCheckResponse(check));
  }

  /**
   * Process background check webhook (PROD-009.3)
   * This would be called by the external provider
   */
  async processBackgroundCheckWebhook(
    providerReference: string,
    status: 'completed' | 'pending' | 'failed',
    resultSummary?: string,
    reportUrl?: string,
  ): Promise<void> {
    const check = await this.prisma.backgroundCheck.findFirst({
      where: { providerReference },
      include: { user: true },
    });

    if (!check) {
      this.logger.warn(`Background check not found for reference: ${providerReference}`);
      return;
    }

    const newStatus =
      status === 'completed'
        ? VerificationStatus.VERIFIED
        : status === 'failed'
          ? VerificationStatus.REJECTED
          : VerificationStatus.PENDING;

    await this.prisma.backgroundCheck.update({
      where: { id: check.id },
      data: {
        status: newStatus,
        resultSummary,
        reportUrl,
        completedAt: status !== 'pending' ? new Date() : null,
      },
    });

    if (status === 'completed') {
      await this.prisma.user.update({
        where: { id: check.userId },
        data: {
          backgroundCheckStatus: VerificationStatus.VERIFIED,
          backgroundCheckAt: new Date(),
        },
      });
    }

    this.logger.log(`Background check ${check.id} updated to status: ${status}`);
  }

  /**
   * Check if user has verified badge (PROD-010.2)
   */
  hasVerifiedBadge(idVerificationStatus: VerificationStatus): boolean {
    return idVerificationStatus === VerificationStatus.VERIFIED;
  }

  /**
   * Get users by verification filter (PROD-010.3)
   */
  async getVerifiedUsers(onlyVerified: boolean = true): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: onlyVerified
        ? { idVerificationStatus: VerificationStatus.VERIFIED }
        : {},
      select: { id: true },
    });

    return users.map((u) => u.id);
  }

  /**
   * Send verification result email (PROD-008.8)
   */
  private async sendVerificationResultEmail(
    email: string,
    firstName: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<void> {
    try {
      if (approved) {
        await this.mailService.sendMail({
          to: email,
          subject: 'Your ID has been verified - 12done',
          template: 'verification-approved',
          context: {
            firstName,
            verifiedAt: new Date().toLocaleDateString(),
          },
        });
      } else {
        await this.mailService.sendMail({
          to: email,
          subject: 'ID Verification Update - 12done',
          template: 'verification-rejected',
          context: {
            firstName,
            rejectionReason,
            supportEmail: 'support@12done.com',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  /**
   * Map verification request to response DTO
   */
  private mapToVerificationResponse(request: any): VerificationRequestResponseDto {
    return {
      id: request.id,
      userId: request.userId,
      documentType: request.documentType,
      status: request.status,
      rejectionReason: request.rejectionReason,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      expiresAt: request.expiresAt,
    };
  }

  /**
   * Map background check to response DTO
   */
  private mapToBackgroundCheckResponse(check: any): BackgroundCheckResponseDto {
    return {
      id: check.id,
      userId: check.userId,
      type: check.type,
      status: check.status,
      resultSummary: check.resultSummary,
      requestedAt: check.requestedAt,
      completedAt: check.completedAt,
      expiresAt: check.expiresAt,
    };
  }
}
