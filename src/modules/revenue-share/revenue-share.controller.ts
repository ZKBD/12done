import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth';
import { RolesGuard, Roles, CurrentUser } from '@/common';
import { UserRole, PayoutStatus } from '@prisma/client';
import { RevenueShareService } from './services';
import {
  UpdatePlatformConfigDto,
  PlatformConfigResponseDto,
  WalletResponseDto,
  WalletTransactionResponseDto,
  DistributeRevenueDto,
  RevenueDistributionResponseDto,
  CreatePayoutRequestDto,
  ProcessPayoutDto,
  PayoutRequestResponseDto,
  RevenueStatsResponseDto,
  UserEarningsStatsDto,
} from './dto';

@ApiTags('Revenue Sharing')
@Controller('revenue-share')
export class RevenueShareController {
  constructor(private readonly revenueShareService: RevenueShareService) {}

  // ============================================
  // Platform Configuration (Admin Only)
  // ============================================

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active platform configuration (Admin)' })
  @ApiResponse({ status: 200, type: PlatformConfigResponseDto })
  async getConfig(): Promise<PlatformConfigResponseDto> {
    return this.revenueShareService.getActiveConfig();
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update platform configuration (Admin)' })
  @ApiResponse({ status: 200, type: PlatformConfigResponseDto })
  async updateConfig(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdatePlatformConfigDto,
  ): Promise<PlatformConfigResponseDto> {
    return this.revenueShareService.updateConfig(dto, adminId);
  }

  // ============================================
  // Wallet Endpoints
  // ============================================

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet' })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  async getMyWallet(@CurrentUser('id') userId: string): Promise<WalletResponseDto> {
    return this.revenueShareService.getOrCreateWallet(userId);
  }

  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiResponse({ status: 200, type: [WalletTransactionResponseDto] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getWalletTransactions(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<WalletTransactionResponseDto[]> {
    return this.revenueShareService.getWalletTransactions(userId, limit, offset);
  }

  @Get('wallet/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user earnings statistics' })
  @ApiResponse({ status: 200, type: UserEarningsStatsDto })
  async getMyEarningsStats(@CurrentUser('id') userId: string): Promise<UserEarningsStatsDto> {
    return this.revenueShareService.getUserEarningsStats(userId);
  }

  // ============================================
  // Revenue Distribution (Admin Only)
  // ============================================

  @Post('distribute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Distribute revenue for a completed transaction (Admin)' })
  @ApiResponse({ status: 201, type: RevenueDistributionResponseDto })
  async distributeRevenue(
    @Body() dto: DistributeRevenueDto,
  ): Promise<RevenueDistributionResponseDto> {
    return this.revenueShareService.distributeRevenue(dto.transactionId);
  }

  @Get('distributions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all revenue distributions (Admin)' })
  @ApiResponse({ status: 200, type: [RevenueDistributionResponseDto] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getDistributions(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<RevenueDistributionResponseDto[]> {
    return this.revenueShareService.getDistributions(limit, offset);
  }

  @Get('distributions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get distribution details (Admin)' })
  @ApiResponse({ status: 200, type: RevenueDistributionResponseDto })
  async getDistribution(@Param('id') id: string): Promise<RevenueDistributionResponseDto> {
    return this.revenueShareService.getDistributionById(id);
  }

  // ============================================
  // Payout Endpoints
  // ============================================

  @Post('payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a payout' })
  @ApiResponse({ status: 201, type: PayoutRequestResponseDto })
  async requestPayout(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePayoutRequestDto,
  ): Promise<PayoutRequestResponseDto> {
    return this.revenueShareService.requestPayout(userId, dto);
  }

  @Get('payouts/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my payout requests' })
  @ApiResponse({ status: 200, type: [PayoutRequestResponseDto] })
  async getMyPayouts(@CurrentUser('id') userId: string): Promise<PayoutRequestResponseDto[]> {
    return this.revenueShareService.getUserPayouts(userId);
  }

  @Delete('payouts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending payout request' })
  @ApiResponse({ status: 200, type: PayoutRequestResponseDto })
  async cancelPayout(
    @CurrentUser('id') userId: string,
    @Param('id') payoutId: string,
    @Query('reason') reason?: string,
  ): Promise<PayoutRequestResponseDto> {
    return this.revenueShareService.cancelPayout(payoutId, userId, reason);
  }

  // Admin payout management
  @Get('payouts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payout requests (Admin)' })
  @ApiResponse({ status: 200, type: [PayoutRequestResponseDto] })
  @ApiQuery({ name: 'status', required: false, enum: PayoutStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAllPayouts(
    @Query('status') status?: PayoutStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<PayoutRequestResponseDto[]> {
    return this.revenueShareService.getPayoutRequests(status, limit, offset);
  }

  @Post('payouts/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a payout request (Admin)' })
  @ApiResponse({ status: 200, type: PayoutRequestResponseDto })
  async processPayout(
    @CurrentUser('id') adminId: string,
    @Param('id') payoutId: string,
    @Body() dto: ProcessPayoutDto,
  ): Promise<PayoutRequestResponseDto> {
    return this.revenueShareService.processPayout(
      payoutId,
      adminId,
      dto.externalReference,
      dto.notes,
    );
  }

  // ============================================
  // Statistics (Admin Only)
  // ============================================

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue sharing statistics (Admin)' })
  @ApiResponse({ status: 200, type: RevenueStatsResponseDto })
  async getStats(): Promise<RevenueStatsResponseDto> {
    return this.revenueShareService.getRevenueStats();
  }
}
