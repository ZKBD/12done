import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// RESPONSE DTOs
// ============================================

export class LeaseSignatureStatusDto {
  @ApiProperty({ description: 'Lease ID' })
  leaseId: string;

  @ApiProperty({ description: 'Whether landlord has signed' })
  landlordSigned: boolean;

  @ApiPropertyOptional({ description: 'When landlord signed' })
  landlordSignedAt?: Date;

  @ApiProperty({ description: 'Whether tenant has signed' })
  tenantSigned: boolean;

  @ApiPropertyOptional({ description: 'When tenant signed' })
  tenantSignedAt?: Date;

  @ApiProperty({ description: 'Whether lease is fully executed (both signed)' })
  fullyExecuted: boolean;

  @ApiProperty({ description: 'Lease status' })
  leaseStatus: string;
}

export class PaymentLinkDto {
  @ApiProperty({ description: 'Payment ID' })
  paymentId: string;

  @ApiProperty({ description: 'Lease ID' })
  leaseId: string;

  @ApiProperty({ description: 'Amount due' })
  amount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Due date' })
  dueDate: Date;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiPropertyOptional({
    description: 'Payment URL (placeholder for Stripe integration)',
  })
  paymentUrl?: string;

  @ApiProperty({
    description: 'Message about payment availability',
  })
  message: string;
}
