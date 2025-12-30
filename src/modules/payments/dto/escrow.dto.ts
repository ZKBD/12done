import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EscrowStatus, EscrowMilestoneStatus } from '@prisma/client';

/**
 * Milestone definition for escrow creation (PROD-097.4)
 */
export class EscrowMilestoneInputDto {
  @ApiProperty({
    description: 'Milestone title',
    example: 'Property inspection completed',
  })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({
    description: 'Milestone description',
    example: 'Independent inspector verifies property condition',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Amount to release on completion',
    example: 5000,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Conditions for release',
    example: 'Signed inspection report submitted',
  })
  @IsOptional()
  @IsString()
  conditions?: string;
}

/**
 * Create escrow request (PROD-097.1)
 */
export class CreateEscrowDto {
  @ApiProperty({
    description: 'Transaction ID to put in escrow',
    example: 'transaction-123',
  })
  @IsUUID()
  transactionId: string;

  @ApiPropertyOptional({
    description: 'Escrow threshold - only require for transactions above this amount',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdAmount?: number;

  @ApiPropertyOptional({
    description: 'Release milestones (PROD-097.4)',
    type: [EscrowMilestoneInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscrowMilestoneInputDto)
  milestones?: EscrowMilestoneInputDto[];
}

/**
 * Milestone response
 */
export class EscrowMilestoneResponseDto {
  @ApiProperty({ description: 'Milestone ID' })
  id: string;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiProperty({ description: 'Amount' })
  amount: string;

  @ApiProperty({ description: 'Order index' })
  orderIndex: number;

  @ApiPropertyOptional({ description: 'Conditions for release' })
  conditions?: string | null;

  @ApiProperty({ enum: EscrowMilestoneStatus })
  status: EscrowMilestoneStatus;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Approved at' })
  approvedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Released at' })
  releasedAt?: Date | null;
}

/**
 * Escrow response (PROD-097.3)
 */
export class EscrowResponseDto {
  @ApiProperty({ description: 'Escrow ID' })
  id: string;

  @ApiProperty({ description: 'Transaction ID' })
  transactionId: string;

  @ApiProperty({ description: 'Total amount in escrow' })
  totalAmount: string;

  @ApiProperty({ description: 'Currently held amount' })
  heldAmount: string;

  @ApiProperty({ description: 'Amount already released' })
  releasedAmount: string;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ enum: EscrowStatus })
  status: EscrowStatus;

  @ApiPropertyOptional({ description: 'Threshold amount' })
  thresholdAmount?: string | null;

  @ApiProperty({ description: 'Buyer ID' })
  buyerId: string;

  @ApiProperty({ description: 'Seller ID' })
  sellerId: string;

  @ApiPropertyOptional({ description: 'Provider name' })
  providerName?: string | null;

  @ApiPropertyOptional({ description: 'Funded at' })
  fundedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Released at' })
  releasedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Disputed at' })
  disputedAt?: Date | null;

  @ApiProperty({ description: 'Milestones', type: [EscrowMilestoneResponseDto] })
  milestones: EscrowMilestoneResponseDto[];

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

/**
 * Complete milestone request
 */
export class CompleteMilestoneDto {
  @ApiProperty({
    description: 'Evidence of completion (URL or description)',
    example: 'https://storage.example.com/inspection-report.pdf',
  })
  @IsOptional()
  @IsString()
  evidence?: string;
}

/**
 * Approve milestone release
 */
export class ApproveMilestoneDto {
  @ApiPropertyOptional({
    description: 'Notes for approval',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Raise dispute request
 */
export class RaiseDisputeDto {
  @ApiProperty({
    description: 'Reason for dispute',
    example: 'Property condition does not match listing description',
  })
  @IsString()
  @MinLength(10)
  reason: string;

  @ApiPropertyOptional({
    description: 'Evidence URLs',
    example: 'https://storage.example.com/evidence.jpg',
  })
  @IsOptional()
  @IsString()
  evidence?: string;
}

/**
 * Resolve dispute request
 */
export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Resolution details',
    example: 'After review, 50% refund issued to buyer',
  })
  @IsString()
  @MinLength(10)
  resolution: string;

  @ApiProperty({
    description: 'Action to take',
    example: 'RELEASE_TO_SELLER',
  })
  @IsString()
  action: 'RELEASE_TO_SELLER' | 'REFUND_TO_BUYER' | 'PARTIAL_RELEASE';

  @ApiPropertyOptional({
    description: 'Amount for partial release/refund',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  partialAmount?: number;
}

/**
 * Dispute response
 */
export class EscrowDisputeResponseDto {
  @ApiProperty({ description: 'Dispute ID' })
  id: string;

  @ApiProperty({ description: 'Escrow ID' })
  escrowId: string;

  @ApiProperty({ description: 'Raised by user ID' })
  raisedById: string;

  @ApiProperty({ description: 'Reason' })
  reason: string;

  @ApiPropertyOptional({ description: 'Evidence' })
  evidence?: string | null;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiPropertyOptional({ description: 'Resolution' })
  resolution?: string | null;

  @ApiPropertyOptional({ description: 'Resolved at' })
  resolvedAt?: Date | null;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}
