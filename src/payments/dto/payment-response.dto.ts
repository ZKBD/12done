import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '@prisma/client';

export class CheckoutSessionResponseDto {
  @ApiProperty({ description: 'Stripe checkout session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Stripe checkout URL to redirect user to' })
  url: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'Negotiation ID this transaction belongs to' })
  negotiationId: string;

  @ApiProperty({ description: 'Transaction status', enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ description: 'Total payment amount' })
  amount: string;

  @ApiProperty({ description: 'Currency code (e.g., EUR)' })
  currency: string;

  @ApiProperty({ description: 'Platform fee amount' })
  platformFee: string;

  @ApiProperty({ description: 'Platform fee rate (e.g., 0.05 for 5%)' })
  platformFeeRate: string;

  @ApiProperty({ description: 'Amount seller receives after platform fee' })
  sellerAmount: string;

  @ApiPropertyOptional({ description: 'Stripe checkout session ID' })
  stripeSessionId?: string;

  @ApiPropertyOptional({ description: 'Stripe payment intent ID' })
  stripePaymentIntentId?: string;

  @ApiPropertyOptional({ description: 'When payment was completed' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'When payment failed' })
  failedAt?: Date;

  @ApiPropertyOptional({ description: 'When refund was processed' })
  refundedAt?: Date;

  @ApiProperty({ description: 'When transaction was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When transaction was last updated' })
  updatedAt: Date;
}

export class RefundResponseDto {
  @ApiProperty({ description: 'Transaction with updated status' })
  transaction: PaymentResponseDto;

  @ApiProperty({ description: 'Stripe refund ID' })
  refundId: string;

  @ApiProperty({ description: 'Refund status' })
  refundStatus: string | null;
}
