import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseStatus, RentPaymentStatus } from '@prisma/client';

export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}

export class PropertySummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  country: string;
}

export class RentPaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  leaseId: string;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: RentPaymentStatus })
  status: RentPaymentStatus;

  @ApiPropertyOptional()
  paidAt?: Date;

  @ApiPropertyOptional()
  paidAmount?: number;

  @ApiPropertyOptional()
  paymentMethod?: string;

  @ApiPropertyOptional()
  transactionRef?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class LeaseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  landlordId: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  rentAmount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ description: 'Day of month when rent is due (1-28)' })
  dueDay: number;

  @ApiPropertyOptional()
  securityDeposit?: number;

  @ApiProperty()
  securityDepositPaid: boolean;

  @ApiProperty({ enum: LeaseStatus })
  status: LeaseStatus;

  @ApiPropertyOptional()
  documentUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: PropertySummaryDto })
  property?: PropertySummaryDto;

  @ApiPropertyOptional({ type: UserSummaryDto })
  tenant?: UserSummaryDto;

  @ApiPropertyOptional({ type: UserSummaryDto })
  landlord?: UserSummaryDto;
}

export class LeaseListResponseDto {
  @ApiProperty({ type: [LeaseResponseDto] })
  data: LeaseResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class PaymentListResponseDto {
  @ApiProperty({ type: [RentPaymentResponseDto] })
  data: RentPaymentResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
