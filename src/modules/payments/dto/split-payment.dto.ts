import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEmail,
  ValidateNested,
  Min,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SplitPaymentStatus, ParticipantPaymentStatus } from '@prisma/client';

/**
 * Participant in a split payment (PROD-096.2)
 */
export class SplitParticipantDto {
  @ApiProperty({
    description: 'Participant email address',
    example: 'roommate@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Participant name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Amount this participant should pay',
    example: 500,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

/**
 * Create split payment request (PROD-096.1)
 */
export class CreateSplitPaymentDto {
  @ApiPropertyOptional({
    description: 'Rent payment ID to split',
    example: 'rent-payment-123',
  })
  @IsOptional()
  @IsUUID()
  rentPaymentId?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID to split',
    example: 'transaction-123',
  })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiProperty({
    description: 'Total amount to split',
    example: 1500,
  })
  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    default: 'EUR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'List of participants (PROD-096.2)',
    type: [SplitParticipantDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitParticipantDto)
  participants: SplitParticipantDto[];

  @ApiPropertyOptional({
    description: 'Payment deadline',
    example: '2025-02-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * Response for participant payment link (PROD-096.3)
 */
export class ParticipantPaymentLinkDto {
  @ApiProperty({ description: 'Participant ID' })
  participantId: string;

  @ApiProperty({ description: 'Participant email' })
  email: string;

  @ApiProperty({ description: 'Amount to pay' })
  amount: string;

  @ApiProperty({ description: 'Unique payment token' })
  paymentToken: string;

  @ApiProperty({ description: 'Payment link URL' })
  paymentLinkUrl: string;
}

/**
 * Participant status response (PROD-096.4)
 */
export class ParticipantStatusDto {
  @ApiProperty({ description: 'Participant ID' })
  id: string;

  @ApiProperty({ description: 'Email' })
  email: string;

  @ApiPropertyOptional({ description: 'Name' })
  name?: string | null;

  @ApiProperty({ description: 'Amount to pay' })
  amount: string;

  @ApiProperty({ enum: ParticipantPaymentStatus })
  status: ParticipantPaymentStatus;

  @ApiPropertyOptional({ description: 'When paid' })
  paidAt?: Date | null;
}

/**
 * Split payment response
 */
export class SplitPaymentResponseDto {
  @ApiProperty({ description: 'Split payment ID' })
  id: string;

  @ApiProperty({ description: 'Total amount' })
  totalAmount: string;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ enum: SplitPaymentStatus })
  status: SplitPaymentStatus;

  @ApiProperty({ description: 'Amount paid so far' })
  paidAmount: string;

  @ApiProperty({ description: 'Number of participants who paid' })
  paidCount: number;

  @ApiProperty({ description: 'Total participants' })
  totalParticipants: number;

  @ApiPropertyOptional({ description: 'Payment deadline' })
  expiresAt?: Date | null;

  @ApiProperty({ description: 'Participants', type: [ParticipantStatusDto] })
  participants: ParticipantStatusDto[];

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

/**
 * Process participant payment
 */
export class ProcessParticipantPaymentDto {
  @ApiProperty({ description: 'Payment token from link' })
  @IsString()
  paymentToken: string;

  @ApiPropertyOptional({ description: 'Success URL' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel URL' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
