import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, CurrentUserData, Roles } from '@/common/decorators';
import { PaginatedResponseDto } from '@/common/dto';
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

@ApiTags('verification')
@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  // ============================================
  // USER ENDPOINTS
  // ============================================

  @Post('identity')
  @ApiOperation({ summary: 'Submit ID verification request (PROD-008.2)' })
  @ApiResponse({
    status: 201,
    description: 'Verification request submitted successfully',
    type: VerificationRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - already pending or verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitVerification(
    @Body() dto: SubmitVerificationDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<VerificationRequestResponseDto> {
    return this.verificationService.submitVerification(user.id, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current user verification status (PROD-010)' })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved',
    type: UserVerificationStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserVerificationStatusDto> {
    return this.verificationService.getVerificationStatus(user.id);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Get user verification status by ID (public info)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved',
    type: UserVerificationStatusDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getStatusByUserId(
    @Param('userId') userId: string,
  ): Promise<UserVerificationStatusDto> {
    return this.verificationService.getVerificationStatus(userId);
  }

  @Post('background-check')
  @ApiOperation({ summary: 'Request background check (PROD-009.2)' })
  @ApiResponse({
    status: 201,
    description: 'Background check requested',
    type: BackgroundCheckResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - consent required or already pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestBackgroundCheck(
    @Body() dto: RequestBackgroundCheckDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BackgroundCheckResponseDto> {
    return this.verificationService.requestBackgroundCheck(user.id, dto);
  }

  @Get('background-checks')
  @ApiOperation({ summary: 'Get user background check history' })
  @ApiResponse({
    status: 200,
    description: 'Background checks retrieved',
    type: [BackgroundCheckResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBackgroundChecks(
    @CurrentUser() user: CurrentUserData,
  ): Promise<BackgroundCheckResponseDto[]> {
    return this.verificationService.getBackgroundChecks(user.id);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin/pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pending verification queue (PROD-008.5)' })
  @ApiResponse({
    status: 200,
    description: 'Pending verifications retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getPendingVerifications(
    @Query() query: VerificationQueueQueryDto,
  ): Promise<PaginatedResponseDto<PendingVerificationDto>> {
    return this.verificationService.getPendingVerifications(query);
  }

  @Patch('admin/:id/review')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject verification (PROD-008.6)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({
    status: 200,
    description: 'Verification reviewed',
    type: VerificationRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - already reviewed or missing rejection reason' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async reviewVerification(
    @Param('id') id: string,
    @Body() dto: AdminReviewDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<VerificationRequestResponseDto> {
    return this.verificationService.reviewVerification(id, user.id, dto);
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get verification statistics' })
  @ApiResponse({
    status: 200,
    description: 'Verification statistics',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getStats(): Promise<{
    pendingCount: number;
    verifiedCount: number;
    rejectedCount: number;
    totalUsers: number;
  }> {
    const [pendingCount, verifiedCount, rejectedCount, totalUsers] =
      await Promise.all([
        this.verificationService['prisma'].verificationRequest.count({
          where: { status: 'PENDING' },
        }),
        this.verificationService['prisma'].user.count({
          where: { idVerificationStatus: 'VERIFIED' },
        }),
        this.verificationService['prisma'].verificationRequest.count({
          where: { status: 'REJECTED' },
        }),
        this.verificationService['prisma'].user.count(),
      ]);

    return {
      pendingCount,
      verifiedCount,
      rejectedCount,
      totalUsers,
    };
  }
}
