import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  RevenueShareType,
  RevenueShareStatus,
  PayoutStatus,
  UserStatus,
  Prisma,
} from '@prisma/client';
import {
  UpdatePlatformConfigDto,
  PlatformConfigResponseDto,
  WalletResponseDto,
  WalletTransactionResponseDto,
  RevenueDistributionResponseDto,
  CreatePayoutRequestDto,
  PayoutRequestResponseDto,
  RevenueStatsResponseDto,
  UserEarningsStatsDto,
} from '../dto';

@Injectable()
export class RevenueShareService {
  private readonly logger = new Logger(RevenueShareService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Platform Configuration
  // ============================================

  async getActiveConfig(): Promise<PlatformConfigResponseDto> {
    let config = await this.prisma.platformConfiguration.findFirst({
      where: { isActive: true },
    });

    // Create default config if none exists
    if (!config) {
      config = await this.prisma.platformConfiguration.create({
        data: {
          platformOwnerPercent: 30,
          userNetworkTotalPercent: 50,
          allUsersSharePercent: 20,
          buyerRewardPercent: 10,
          directInviterPercent: 20,
          upstreamNetworkPercent: 20,
          maxUpstreamLevels: 10,
          upstreamLevelWeights: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          minPayoutAmount: new Prisma.Decimal(50),
          isActive: true,
          activatedAt: new Date(),
        },
      });
    }

    return this.mapConfigToResponse(config);
  }

  async updateConfig(
    dto: UpdatePlatformConfigDto,
    adminId: string,
  ): Promise<PlatformConfigResponseDto> {
    // Validate percentages
    await this.validateConfigPercentages(dto);

    // Deactivate current config
    await this.prisma.platformConfiguration.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new config with updates
    const currentConfig = await this.getActiveConfig();

    const newConfig = await this.prisma.platformConfiguration.create({
      data: {
        platformOwnerPercent: dto.platformOwnerPercent ?? currentConfig.platformOwnerPercent,
        userNetworkTotalPercent: dto.userNetworkTotalPercent ?? currentConfig.userNetworkTotalPercent,
        allUsersSharePercent: dto.allUsersSharePercent ?? currentConfig.allUsersSharePercent,
        buyerRewardPercent: dto.buyerRewardPercent ?? currentConfig.buyerRewardPercent,
        directInviterPercent: dto.directInviterPercent ?? currentConfig.directInviterPercent,
        upstreamNetworkPercent: dto.upstreamNetworkPercent ?? currentConfig.upstreamNetworkPercent,
        maxUpstreamLevels: dto.maxUpstreamLevels ?? currentConfig.maxUpstreamLevels,
        upstreamLevelWeights: dto.upstreamLevelWeights ?? currentConfig.upstreamLevelWeights,
        minPayoutAmount: dto.minPayoutAmount
          ? new Prisma.Decimal(dto.minPayoutAmount)
          : new Prisma.Decimal(currentConfig.minPayoutAmount),
        isActive: true,
        activatedAt: new Date(),
        createdById: adminId,
      },
    });

    this.logger.log(`Platform config updated by admin ${adminId}`);
    return this.mapConfigToResponse(newConfig);
  }

  private async validateConfigPercentages(dto: UpdatePlatformConfigDto): Promise<void> {
    const current = await this.getActiveConfig();

    const platformOwner = dto.platformOwnerPercent ?? current.platformOwnerPercent;
    const userNetwork = dto.userNetworkTotalPercent ?? current.userNetworkTotalPercent;
    const allUsers = dto.allUsersSharePercent ?? current.allUsersSharePercent;

    const totalMain = platformOwner + userNetwork + allUsers;
    if (Math.abs(totalMain - 100) > 0.01) {
      throw new BadRequestException(
        `%A + %B + %C must equal 100%. Got ${totalMain}%`,
      );
    }

    const buyerReward = dto.buyerRewardPercent ?? current.buyerRewardPercent;
    const directInviter = dto.directInviterPercent ?? current.directInviterPercent;
    const upstreamNetwork = dto.upstreamNetworkPercent ?? current.upstreamNetworkPercent;

    const totalNetwork = buyerReward + directInviter + upstreamNetwork;
    if (Math.abs(totalNetwork - userNetwork) > 0.01) {
      throw new BadRequestException(
        `%D + %E + %F must equal %B (${userNetwork}%). Got ${totalNetwork}%`,
      );
    }
  }

  private mapConfigToResponse(config: any): PlatformConfigResponseDto {
    return {
      id: config.id,
      platformOwnerPercent: config.platformOwnerPercent,
      userNetworkTotalPercent: config.userNetworkTotalPercent,
      allUsersSharePercent: config.allUsersSharePercent,
      buyerRewardPercent: config.buyerRewardPercent,
      directInviterPercent: config.directInviterPercent,
      upstreamNetworkPercent: config.upstreamNetworkPercent,
      maxUpstreamLevels: config.maxUpstreamLevels,
      upstreamLevelWeights: config.upstreamLevelWeights as number[],
      minPayoutAmount: Number(config.minPayoutAmount),
      isActive: config.isActive,
      activatedAt: config.activatedAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  // ============================================
  // Wallet Management
  // ============================================

  async getOrCreateWallet(userId: string): Promise<WalletResponseDto> {
    let wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.userWallet.create({
        data: { userId },
      });
    }

    return this.mapWalletToResponse(wallet);
  }

  async getWalletTransactions(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<WalletTransactionResponseDto[]> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return [];
    }

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      balanceAfter: Number(t.balanceAfter),
      referenceType: t.referenceType || undefined,
      referenceId: t.referenceId || undefined,
      description: t.description || undefined,
      createdAt: t.createdAt,
    }));
  }

  private mapWalletToResponse(wallet: any): WalletResponseDto {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      currency: wallet.currency,
      totalEarnings: Number(wallet.totalEarnings),
      buyerRewardsEarned: Number(wallet.buyerRewardsEarned),
      inviterCommissionsEarned: Number(wallet.inviterCommissionsEarned),
      networkSharesEarned: Number(wallet.networkSharesEarned),
      allUsersShareEarned: Number(wallet.allUsersShareEarned),
      totalPaidOut: Number(wallet.totalPaidOut),
      lastPayoutAt: wallet.lastPayoutAt,
      createdAt: wallet.createdAt,
    };
  }

  // ============================================
  // Revenue Distribution
  // ============================================

  async distributeRevenue(transactionId: string): Promise<RevenueDistributionResponseDto> {
    // Check if already distributed
    const existing = await this.prisma.revenueDistribution.findUnique({
      where: { transactionId },
    });

    if (existing) {
      throw new BadRequestException('Revenue already distributed for this transaction');
    }

    // Get transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        payer: {
          include: {
            invitedBy: true,
          },
        },
        negotiation: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'COMPLETED') {
      throw new BadRequestException('Can only distribute revenue for completed transactions');
    }

    // Get active config
    const config = await this.getActiveConfig();
    const platformFee = Number(transaction.platformFee);

    // Calculate amounts
    const platformAmount = (platformFee * config.platformOwnerPercent) / 100;
    const buyerRewardAmount = (platformFee * config.buyerRewardPercent) / 100;
    const directInviterAmount = (platformFee * config.directInviterPercent) / 100;
    const upstreamNetworkAmount = (platformFee * config.upstreamNetworkPercent) / 100;
    const allUsersShareAmount = (platformFee * config.allUsersSharePercent) / 100;

    // Create distribution record
    const distribution = await this.prisma.revenueDistribution.create({
      data: {
        transactionId,
        totalRevenue: new Prisma.Decimal(platformFee),
        currency: transaction.currency,
        platformAmount: new Prisma.Decimal(platformAmount),
        buyerRewardAmount: new Prisma.Decimal(buyerRewardAmount),
        directInviterAmount: new Prisma.Decimal(directInviterAmount),
        upstreamNetworkAmount: new Prisma.Decimal(upstreamNetworkAmount),
        allUsersShareAmount: new Prisma.Decimal(allUsersShareAmount),
        configSnapshot: config as unknown as Prisma.InputJsonValue,
        status: RevenueShareStatus.PENDING,
      },
    });

    // Create individual shares
    const shares: any[] = [];

    // 1. Buyer reward
    if (buyerRewardAmount > 0) {
      const buyerWallet = await this.getOrCreateWallet(transaction.payerId);
      shares.push({
        distributionId: distribution.id,
        recipientId: buyerWallet.id,
        shareType: RevenueShareType.BUYER_REWARD,
        amount: new Prisma.Decimal(buyerRewardAmount),
        currency: transaction.currency,
        notes: 'Buyer reward for purchase',
      });
    }

    // 2. Direct inviter (if buyer was invited)
    if (directInviterAmount > 0 && transaction.payer.invitedById) {
      const inviterWallet = await this.getOrCreateWallet(transaction.payer.invitedById);
      shares.push({
        distributionId: distribution.id,
        recipientId: inviterWallet.id,
        shareType: RevenueShareType.DIRECT_INVITER,
        amount: new Prisma.Decimal(directInviterAmount),
        currency: transaction.currency,
        notes: `Commission for inviting ${transaction.payer.firstName || transaction.payer.email}`,
      });
    }

    // 3. Upstream network shares
    if (upstreamNetworkAmount > 0 && transaction.payer.invitedById) {
      const upstreamShares = await this.calculateUpstreamShares(
        transaction.payer.invitedById,
        upstreamNetworkAmount,
        transaction.currency,
        distribution.id,
        config,
      );
      shares.push(...upstreamShares);
    }

    // 4. All users share (distributed to active users)
    if (allUsersShareAmount > 0) {
      const allUserShares = await this.calculateAllUsersShare(
        allUsersShareAmount,
        transaction.currency,
        distribution.id,
      );
      shares.push(...allUserShares);
    }

    // Create all shares
    if (shares.length > 0) {
      await this.prisma.revenueShare.createMany({
        data: shares,
      });
    }

    // Process the distribution (add to wallets)
    await this.processDistribution(distribution.id);

    // Return the distribution with shares
    return this.getDistributionById(distribution.id);
  }

  private async calculateUpstreamShares(
    directInviterId: string,
    totalAmount: number,
    currency: string,
    distributionId: string,
    config: PlatformConfigResponseDto,
  ): Promise<any[]> {
    const shares: any[] = [];
    const weights = config.upstreamLevelWeights;
    const maxLevels = Math.min(config.maxUpstreamLevels, weights.length);
    const totalWeight = weights.slice(0, maxLevels).reduce((a, b) => a + b, 0);

    let currentUserId = directInviterId;

    for (let level = 1; level <= maxLevels; level++) {
      // Get the inviter of the current user
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { invitedById: true },
      });

      if (!currentUser?.invitedById) {
        break; // No more upstream
      }

      const levelWeight = weights[level - 1] || 0;
      const shareAmount = (totalAmount * levelWeight) / totalWeight;

      if (shareAmount > 0.01) {
        const wallet = await this.getOrCreateWallet(currentUser.invitedById);
        shares.push({
          distributionId,
          recipientId: wallet.id,
          shareType: RevenueShareType.UPSTREAM_NETWORK,
          amount: new Prisma.Decimal(shareAmount),
          currency,
          upstreamLevel: level,
          notes: `Level ${level} upstream network share`,
        });
      }

      currentUserId = currentUser.invitedById;
    }

    return shares;
  }

  private async calculateAllUsersShare(
    totalAmount: number,
    currency: string,
    distributionId: string,
  ): Promise<any[]> {
    // Get all active users with wallets
    const activeUsers = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        wallet: { isNot: null },
      },
      select: {
        wallet: { select: { id: true } },
      },
    });

    if (activeUsers.length === 0) {
      return [];
    }

    const sharePerUser = totalAmount / activeUsers.length;

    // Only distribute if share is meaningful (> 1 cent)
    if (sharePerUser < 0.01) {
      return [];
    }

    return activeUsers
      .filter((u) => u.wallet)
      .map((u) => ({
        distributionId,
        recipientId: u.wallet!.id,
        shareType: RevenueShareType.ALL_USERS_SHARE,
        amount: new Prisma.Decimal(sharePerUser),
        currency,
        notes: 'Platform success share',
      }));
  }

  private async processDistribution(distributionId: string): Promise<void> {
    const distribution = await this.prisma.revenueDistribution.findUnique({
      where: { id: distributionId },
      include: { shares: true },
    });

    if (!distribution) {
      return;
    }

    // Process each share
    for (const share of distribution.shares) {
      await this.prisma.$transaction(async (tx) => {
        // Get current wallet balance
        const wallet = await tx.userWallet.findUnique({
          where: { id: share.recipientId },
        });

        if (!wallet) return;

        const amount = Number(share.amount);
        const newBalance = Number(wallet.balance) + amount;

        // Update wallet balance and earnings
        const updateData: any = {
          balance: new Prisma.Decimal(newBalance),
          totalEarnings: { increment: amount },
        };

        switch (share.shareType) {
          case RevenueShareType.BUYER_REWARD:
            updateData.buyerRewardsEarned = { increment: amount };
            break;
          case RevenueShareType.DIRECT_INVITER:
            updateData.inviterCommissionsEarned = { increment: amount };
            break;
          case RevenueShareType.UPSTREAM_NETWORK:
            updateData.networkSharesEarned = { increment: amount };
            break;
          case RevenueShareType.ALL_USERS_SHARE:
            updateData.allUsersShareEarned = { increment: amount };
            break;
        }

        await tx.userWallet.update({
          where: { id: wallet.id },
          data: updateData,
        });

        // Create wallet transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: new Prisma.Decimal(amount),
            currency: share.currency,
            balanceAfter: new Prisma.Decimal(newBalance),
            referenceType: 'REVENUE_SHARE',
            referenceId: share.id,
            description: share.notes,
          },
        });

        // Mark share as processed
        await tx.revenueShare.update({
          where: { id: share.id },
          data: {
            status: RevenueShareStatus.PROCESSED,
            processedAt: new Date(),
          },
        });
      });
    }

    // Mark distribution as processed
    await this.prisma.revenueDistribution.update({
      where: { id: distributionId },
      data: {
        status: RevenueShareStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Distribution ${distributionId} processed successfully`);
  }

  async getDistributionById(distributionId: string): Promise<RevenueDistributionResponseDto> {
    const distribution = await this.prisma.revenueDistribution.findUnique({
      where: { id: distributionId },
      include: {
        shares: {
          include: {
            wallet: {
              include: { user: { select: { firstName: true, email: true } } },
            },
          },
        },
      },
    });

    if (!distribution) {
      throw new NotFoundException(`Distribution ${distributionId} not found`);
    }

    return {
      id: distribution.id,
      transactionId: distribution.transactionId,
      totalRevenue: Number(distribution.totalRevenue),
      currency: distribution.currency,
      platformAmount: Number(distribution.platformAmount),
      buyerRewardAmount: Number(distribution.buyerRewardAmount),
      directInviterAmount: Number(distribution.directInviterAmount),
      upstreamNetworkAmount: Number(distribution.upstreamNetworkAmount),
      allUsersShareAmount: Number(distribution.allUsersShareAmount),
      status: distribution.status,
      processedAt: distribution.processedAt || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shares: (distribution as any).shares.map((s: any) => ({
        id: s.id,
        recipientId: s.recipientId,
        recipientName: s.wallet?.user?.firstName || s.wallet?.user?.email,
        shareType: s.shareType,
        amount: Number(s.amount),
        currency: s.currency,
        upstreamLevel: s.upstreamLevel || undefined,
        status: s.status,
        notes: s.notes || undefined,
        createdAt: s.createdAt,
      })),
      createdAt: distribution.createdAt,
    };
  }

  async getDistributions(
    limit = 50,
    offset = 0,
  ): Promise<RevenueDistributionResponseDto[]> {
    const distributions = await this.prisma.revenueDistribution.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        shares: {
          include: {
            wallet: {
              include: { user: { select: { firstName: true, email: true } } },
            },
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return distributions.map((d: any) => ({
      id: d.id,
      transactionId: d.transactionId,
      totalRevenue: Number(d.totalRevenue),
      currency: d.currency,
      platformAmount: Number(d.platformAmount),
      buyerRewardAmount: Number(d.buyerRewardAmount),
      directInviterAmount: Number(d.directInviterAmount),
      upstreamNetworkAmount: Number(d.upstreamNetworkAmount),
      allUsersShareAmount: Number(d.allUsersShareAmount),
      status: d.status,
      processedAt: d.processedAt || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shares: d.shares.map((s: any) => ({
        id: s.id,
        recipientId: s.recipientId,
        recipientName: s.wallet?.user?.firstName || s.wallet?.user?.email,
        shareType: s.shareType,
        amount: Number(s.amount),
        currency: s.currency,
        upstreamLevel: s.upstreamLevel || undefined,
        status: s.status,
        notes: s.notes || undefined,
        createdAt: s.createdAt,
      })),
      createdAt: d.createdAt,
    }));
  }

  // ============================================
  // Payout Management
  // ============================================

  async requestPayout(
    userId: string,
    dto: CreatePayoutRequestDto,
  ): Promise<PayoutRequestResponseDto> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const config = await this.getActiveConfig();
    const balance = Number(wallet.balance);

    if (dto.amount > balance) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance} ${wallet.currency}`,
      );
    }

    if (dto.amount < config.minPayoutAmount) {
      throw new BadRequestException(
        `Minimum payout amount is ${config.minPayoutAmount} ${wallet.currency}`,
      );
    }

    // Check for pending payout
    const pendingPayout = await this.prisma.payoutRequest.findFirst({
      where: {
        walletId: wallet.id,
        status: { in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING] },
      },
    });

    if (pendingPayout) {
      throw new BadRequestException('You already have a pending payout request');
    }

    const payout = await this.prisma.payoutRequest.create({
      data: {
        walletId: wallet.id,
        amount: new Prisma.Decimal(dto.amount),
        currency: wallet.currency,
        payoutMethod: dto.payoutMethod,
        payoutDetails: dto.payoutDetails as unknown as Prisma.InputJsonValue,
        status: PayoutStatus.PENDING,
      },
    });

    // Deduct from balance (held for payout)
    await this.prisma.userWallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: dto.amount },
      },
    });

    // Create wallet transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEBIT',
        amount: new Prisma.Decimal(dto.amount),
        currency: wallet.currency,
        balanceAfter: new Prisma.Decimal(balance - dto.amount),
        referenceType: 'PAYOUT',
        referenceId: payout.id,
        description: `Payout request via ${dto.payoutMethod}`,
      },
    });

    this.logger.log(`Payout request created: ${payout.id} for user ${userId}`);
    return this.mapPayoutToResponse(payout);
  }

  async processPayout(
    payoutId: string,
    adminId: string,
    externalReference?: string,
    notes?: string,
  ): Promise<PayoutRequestResponseDto> {
    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: { wallet: true },
    });

    if (!payout) {
      throw new NotFoundException(`Payout request ${payoutId} not found`);
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Payout is not in PENDING status`);
    }

    const updated = await this.prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.COMPLETED,
        processedAt: new Date(),
        processedBy: adminId,
        externalReference,
        notes,
      },
    });

    // Update wallet payout totals
    await this.prisma.userWallet.update({
      where: { id: payout.walletId },
      data: {
        totalPaidOut: { increment: Number(payout.amount) },
        lastPayoutAt: new Date(),
      },
    });

    this.logger.log(`Payout ${payoutId} processed by admin ${adminId}`);
    return this.mapPayoutToResponse(updated);
  }

  async cancelPayout(
    payoutId: string,
    userId: string,
    reason?: string,
  ): Promise<PayoutRequestResponseDto> {
    const payout = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: { wallet: true },
    });

    if (!payout) {
      throw new NotFoundException(`Payout request ${payoutId} not found`);
    }

    // User can only cancel their own pending payouts
    if (payout.wallet.userId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this payout');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel payout in ${payout.status} status`);
    }

    // Refund to wallet
    const currentBalance = Number(payout.wallet.balance);
    const refundAmount = Number(payout.amount);

    await this.prisma.$transaction([
      this.prisma.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.CANCELLED,
          notes: reason || 'Cancelled by user',
        },
      }),
      this.prisma.userWallet.update({
        where: { id: payout.walletId },
        data: {
          balance: { increment: refundAmount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: payout.walletId,
          type: 'CREDIT',
          amount: new Prisma.Decimal(refundAmount),
          currency: payout.currency,
          balanceAfter: new Prisma.Decimal(currentBalance + refundAmount),
          referenceType: 'PAYOUT',
          referenceId: payoutId,
          description: 'Payout cancelled - refund',
        },
      }),
    ]);

    const updated = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });

    return this.mapPayoutToResponse(updated!);
  }

  async getPayoutRequests(
    status?: PayoutStatus,
    limit = 50,
    offset = 0,
  ): Promise<PayoutRequestResponseDto[]> {
    const where: Prisma.PayoutRequestWhereInput = {};
    if (status) {
      where.status = status;
    }

    const payouts = await this.prisma.payoutRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return payouts.map((p) => this.mapPayoutToResponse(p));
  }

  async getUserPayouts(userId: string): Promise<PayoutRequestResponseDto[]> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return [];
    }

    const payouts = await this.prisma.payoutRequest.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p) => this.mapPayoutToResponse(p));
  }

  private mapPayoutToResponse(payout: any): PayoutRequestResponseDto {
    return {
      id: payout.id,
      walletId: payout.walletId,
      amount: Number(payout.amount),
      currency: payout.currency,
      payoutMethod: payout.payoutMethod,
      status: payout.status,
      processedAt: payout.processedAt || undefined,
      externalReference: payout.externalReference || undefined,
      notes: payout.notes || undefined,
      failureReason: payout.failureReason || undefined,
      createdAt: payout.createdAt,
    };
  }

  // ============================================
  // Statistics
  // ============================================

  async getRevenueStats(): Promise<RevenueStatsResponseDto> {
    const distributions = await this.prisma.revenueDistribution.aggregate({
      _sum: {
        totalRevenue: true,
        platformAmount: true,
        buyerRewardAmount: true,
        directInviterAmount: true,
        upstreamNetworkAmount: true,
        allUsersShareAmount: true,
      },
    });

    const payouts = await this.prisma.payoutRequest.aggregate({
      where: { status: PayoutStatus.COMPLETED },
      _sum: { amount: true },
    });

    const pendingPayouts = await this.prisma.payoutRequest.aggregate({
      where: { status: PayoutStatus.PENDING },
      _sum: { amount: true },
    });

    const walletCount = await this.prisma.userWallet.count({
      where: { balance: { gt: 0 } },
    });

    return {
      totalRevenue: Number(distributions._sum.totalRevenue || 0),
      platformEarnings: Number(distributions._sum.platformAmount || 0),
      totalUserPayouts: Number(payouts._sum.amount || 0),
      pendingPayouts: Number(pendingPayouts._sum.amount || 0),
      activeWallets: walletCount,
      byShareType: {
        buyerRewards: Number(distributions._sum.buyerRewardAmount || 0),
        directInviter: Number(distributions._sum.directInviterAmount || 0),
        upstreamNetwork: Number(distributions._sum.upstreamNetworkAmount || 0),
        allUsersShare: Number(distributions._sum.allUsersShareAmount || 0),
      },
    };
  }

  async getUserEarningsStats(userId: string): Promise<UserEarningsStatsDto> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return {
        totalEarnings: 0,
        currentBalance: 0,
        totalPaidOut: 0,
        pendingPayoutAmount: 0,
        breakdown: {
          buyerRewards: 0,
          directInviter: 0,
          upstreamNetwork: 0,
          allUsersShare: 0,
        },
        referralCount: 0,
        referralEarnings: 0,
      };
    }

    const pendingPayouts = await this.prisma.payoutRequest.aggregate({
      where: {
        walletId: wallet.id,
        status: PayoutStatus.PENDING,
      },
      _sum: { amount: true },
    });

    const referralCount = await this.prisma.user.count({
      where: { invitedById: userId },
    });

    const referralEarnings =
      Number(wallet.inviterCommissionsEarned) + Number(wallet.networkSharesEarned);

    return {
      totalEarnings: Number(wallet.totalEarnings),
      currentBalance: Number(wallet.balance),
      totalPaidOut: Number(wallet.totalPaidOut),
      pendingPayoutAmount: Number(pendingPayouts._sum.amount || 0),
      breakdown: {
        buyerRewards: Number(wallet.buyerRewardsEarned),
        directInviter: Number(wallet.inviterCommissionsEarned),
        upstreamNetwork: Number(wallet.networkSharesEarned),
        allUsersShare: Number(wallet.allUsersShareEarned),
      },
      referralCount,
      referralEarnings,
    };
  }
}
