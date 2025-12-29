import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Amount actually paid',
    example: 1500,
  })
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @ApiPropertyOptional({
    description: 'Payment method used',
    example: 'bank_transfer',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'External transaction reference',
    example: 'TXN-123456',
  })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the payment',
    example: 'Paid on time via bank transfer',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WaivePaymentDto {
  @ApiProperty({
    description: 'Reason for waiving the payment',
    example: 'First month free as move-in incentive',
  })
  @IsString()
  reason: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: ['PENDING', 'PAID', 'OVERDUE', 'WAIVED'],
    example: 'PENDING',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'OVERDUE', 'WAIVED'])
  status?: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
}
