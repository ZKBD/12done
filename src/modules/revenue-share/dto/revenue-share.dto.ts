import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RevenueShareType, RevenueShareStatus, PayoutStatus } from '@prisma/client';

// ============================================
// Platform Configuration DTOs
// ============================================

export class UpdatePlatformConfigDto {
  @ApiPropertyOptional({ description: 'Platform owner percentage (default 30%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformOwnerPercent?: number;

  @ApiPropertyOptional({ description: 'User network total percentage (default 50%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  userNetworkTotalPercent?: number;

  @ApiPropertyOptional({ description: 'All users share percentage (default 20%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allUsersSharePercent?: number;

  @ApiPropertyOptional({ description: 'Buyer reward percentage (default 10%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  buyerRewardPercent?: number;

  @ApiPropertyOptional({ description: 'Direct inviter percentage (default 20%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  directInviterPercent?: number;

  @ApiPropertyOptional({ description: 'Upstream network percentage (default 20%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  upstreamNetworkPercent?: number;

  @ApiPropertyOptional({ description: 'Maximum upstream levels (default 10)', minimum: 1, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxUpstreamLevels?: number;

  @ApiPropertyOptional({ description: 'Weights for each upstream level', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  upstreamLevelWeights?: number[];

  @ApiPropertyOptional({ description: 'Minimum balance for payout request', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPayoutAmount?: number;
}

export class PlatformConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Platform owner percentage (%A)' })
  platformOwnerPercent: number;

  @ApiProperty({ description: 'User network total percentage (%B)' })
  userNetworkTotalPercent: number;

  @ApiProperty({ description: 'All users share percentage (%C)' })
  allUsersSharePercent: number;

  @ApiProperty({ description: 'Buyer reward percentage (%D)' })
  buyerRewardPercent: number;

  @ApiProperty({ description: 'Direct inviter percentage (%E)' })
  directInviterPercent: number;

  @ApiProperty({ description: 'Upstream network percentage (%F)' })
  upstreamNetworkPercent: number;

  @ApiProperty({ description: 'Maximum upstream levels' })
  maxUpstreamLevels: number;

  @ApiProperty({ description: 'Weights for each upstream level', type: [Number] })
  upstreamLevelWeights: number[];

  @ApiProperty({ description: 'Minimum balance for payout request' })
  minPayoutAmount: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  activatedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================
// Wallet DTOs
// ============================================

export class WalletResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ description: 'Current available balance' })
  balance: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ description: 'Total lifetime earnings' })
  totalEarnings: number;

  @ApiProperty({ description: 'Earnings from buyer rewards' })
  buyerRewardsEarned: number;

  @ApiProperty({ description: 'Earnings from direct inviter commissions' })
  inviterCommissionsEarned: number;

  @ApiProperty({ description: 'Earnings from network shares' })
  networkSharesEarned: number;

  @ApiProperty({ description: 'Earnings from all-users pool' })
  allUsersShareEarned: number;

  @ApiProperty({ description: 'Total amount paid out' })
  totalPaidOut: number;

  @ApiPropertyOptional({ description: 'Last payout date' })
  lastPayoutAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class WalletTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Transaction type: CREDIT, DEBIT, PAYOUT, ADJUSTMENT' })
  type: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ description: 'Balance after this transaction' })
  balanceAfter: number;

  @ApiPropertyOptional()
  referenceType?: string;

  @ApiPropertyOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdAt: Date;
}

// ============================================
// Revenue Distribution DTOs
// ============================================

export class DistributeRevenueDto {
  @ApiProperty({ description: 'Transaction ID to distribute revenue for' })
  @IsUUID()
  transactionId: string;
}

export class RevenueShareResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  recipientId: string;

  @ApiPropertyOptional()
  recipientName?: string;

  @ApiProperty({ enum: RevenueShareType })
  shareType: RevenueShareType;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional({ description: 'Upstream level (for UPSTREAM_NETWORK type)' })
  upstreamLevel?: number;

  @ApiProperty({ enum: RevenueShareStatus })
  status: RevenueShareStatus;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;
}

export class RevenueDistributionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty({ description: 'Total revenue distributed' })
  totalRevenue: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ description: 'Platform share (%A)' })
  platformAmount: number;

  @ApiProperty({ description: 'Buyer reward (%D)' })
  buyerRewardAmount: number;

  @ApiProperty({ description: 'Direct inviter share (%E)' })
  directInviterAmount: number;

  @ApiProperty({ description: 'Upstream network share (%F)' })
  upstreamNetworkAmount: number;

  @ApiProperty({ description: 'All users pool share (%C)' })
  allUsersShareAmount: number;

  @ApiProperty({ enum: RevenueShareStatus })
  status: RevenueShareStatus;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiProperty({ type: [RevenueShareResponseDto] })
  shares: RevenueShareResponseDto[];

  @ApiProperty()
  createdAt: Date;
}

// ============================================
// Payout DTOs
// ============================================

export class BankTransferDetailsDto {
  @ApiProperty()
  @IsString()
  iban: string;

  @ApiProperty()
  @IsString()
  accountHolderName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  swiftBic?: string;
}

export class PayPalDetailsDto {
  @ApiProperty()
  @IsString()
  paypalEmail: string;
}

export class CreatePayoutRequestDto {
  @ApiProperty({ description: 'Amount to withdraw' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Payout method: BANK_TRANSFER, PAYPAL, STRIPE', enum: ['BANK_TRANSFER', 'PAYPAL', 'STRIPE'] })
  @IsString()
  payoutMethod: 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE';

  @ApiProperty({ description: 'Payout details (varies by method)' })
  @IsObject()
  payoutDetails: BankTransferDetailsDto | PayPalDetailsDto | Record<string, any>;
}

export class ProcessPayoutDto {
  @ApiProperty({ description: 'External reference from payment provider' })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiProperty({ description: 'Notes about the payout' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayoutRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  walletId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  payoutMethod: string;

  @ApiProperty({ enum: PayoutStatus })
  status: PayoutStatus;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiPropertyOptional()
  externalReference?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  failureReason?: string;

  @ApiProperty()
  createdAt: Date;
}

// ============================================
// Statistics DTOs
// ============================================

export class RevenueStatsResponseDto {
  @ApiProperty({ description: 'Total revenue distributed' })
  totalRevenue: number;

  @ApiProperty({ description: 'Platform earnings' })
  platformEarnings: number;

  @ApiProperty({ description: 'Total paid to users' })
  totalUserPayouts: number;

  @ApiProperty({ description: 'Pending payouts' })
  pendingPayouts: number;

  @ApiProperty({ description: 'Total active wallets' })
  activeWallets: number;

  @ApiProperty({ description: 'Breakdown by share type' })
  byShareType: {
    buyerRewards: number;
    directInviter: number;
    upstreamNetwork: number;
    allUsersShare: number;
  };
}

export class UserEarningsStatsDto {
  @ApiProperty({ description: 'Total earnings' })
  totalEarnings: number;

  @ApiProperty({ description: 'Current balance' })
  currentBalance: number;

  @ApiProperty({ description: 'Total paid out' })
  totalPaidOut: number;

  @ApiProperty({ description: 'Pending payout requests' })
  pendingPayoutAmount: number;

  @ApiProperty({ description: 'Earnings breakdown by type' })
  breakdown: {
    buyerRewards: number;
    directInviter: number;
    upstreamNetwork: number;
    allUsersShare: number;
  };

  @ApiProperty({ description: 'Number of referrals' })
  referralCount: number;

  @ApiProperty({ description: 'Earnings from referrals' })
  referralEarnings: number;
}
