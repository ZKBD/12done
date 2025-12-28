import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Negotiation ID to create checkout for' })
  @IsUUID()
  negotiationId: string;

  @ApiPropertyOptional({ description: 'URL to redirect to on success' })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL to redirect to on cancel' })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}

export class RefundRequestDto {
  @ApiProperty({ description: 'Transaction ID to refund' })
  @IsUUID()
  transactionId: string;

  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Amount to refund (for partial refunds)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class CheckoutSessionResponseDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  url: string;
}

export class PaymentIntentResponseDto {
  @ApiProperty()
  clientSecret: string;

  @ApiProperty()
  paymentIntentId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;
}

export class PaymentStatusResponseDto {
  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  transactionId?: string;

  @ApiPropertyOptional()
  amount?: string;

  @ApiPropertyOptional()
  currency?: string;
}

export class PaymentStatsResponseDto {
  @ApiProperty()
  totalEarnings: string;

  @ApiProperty()
  totalSpent: string;

  @ApiProperty()
  pendingPayouts: string;

  @ApiProperty()
  completedTransactions: number;

  @ApiProperty()
  currency: string;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  negotiationId: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  platformFee: string;

  @ApiProperty()
  sellerAmount: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  stripePaymentIntentId?: string;

  @ApiPropertyOptional()
  stripeCheckoutSessionId?: string;

  @ApiPropertyOptional()
  paidAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  negotiation?: {
    id: string;
    property: {
      id: string;
      title: string;
      address: string;
      city: string;
    };
    buyer: {
      id: string;
      firstName: string;
      lastName: string;
    };
    seller: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export class TransactionListResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  data: TransactionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
