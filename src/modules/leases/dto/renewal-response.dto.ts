import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Note: LeaseRenewalStatus is not yet in the Prisma schema
// Using string type for now until migration is applied
export type LeaseRenewalStatus =
  | 'PENDING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED';

export class RenewalPropertyDto {
  @ApiProperty({ description: 'Property ID' })
  id: string;

  @ApiProperty({ description: 'Property title' })
  title: string;

  @ApiProperty({ description: 'Property address' })
  address: string;

  @ApiProperty({ description: 'Property city' })
  city: string;
}

export class RenewalLeaseDto {
  @ApiProperty({ description: 'Lease ID' })
  id: string;

  @ApiProperty({ description: 'Lease start date' })
  startDate: Date;

  @ApiProperty({ description: 'Lease end date' })
  endDate: Date;

  @ApiProperty({ description: 'Monthly rent amount' })
  rentAmount: number;

  @ApiProperty({ description: 'Associated property' })
  property: RenewalPropertyDto;
}

export class RenewalUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'Email address' })
  email: string;
}

export class LeaseRenewalResponseDto {
  @ApiProperty({ description: 'Renewal ID' })
  id: string;

  @ApiProperty({ description: 'Original lease ID' })
  leaseId: string;

  @ApiProperty({ description: 'Landlord ID' })
  landlordId: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({
    description: 'Renewal status',
    enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'],
  })
  status: LeaseRenewalStatus;

  @ApiPropertyOptional({ description: 'Proposed new lease start date' })
  proposedStartDate: Date | null;

  @ApiPropertyOptional({ description: 'Proposed new lease end date' })
  proposedEndDate: Date | null;

  @ApiPropertyOptional({ description: 'Proposed monthly rent amount' })
  proposedRentAmount: number | null;

  @ApiPropertyOptional({ description: 'Proposed terms and conditions' })
  proposedTerms: string | null;

  @ApiPropertyOptional({ description: 'Offer expiration date' })
  offerExpiresAt: Date | null;

  @ApiPropertyOptional({ description: 'When reminder was sent' })
  reminderSentAt: Date | null;

  @ApiPropertyOptional({ description: 'When offer was sent to tenant' })
  offerSentAt: Date | null;

  @ApiPropertyOptional({ description: 'When tenant responded' })
  respondedAt: Date | null;

  @ApiPropertyOptional({ description: 'Reason for declining (if declined)' })
  declineReason: string | null;

  @ApiPropertyOptional({ description: 'New lease ID (if accepted)' })
  newLeaseId: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Associated lease details' })
  lease?: RenewalLeaseDto;

  @ApiPropertyOptional({ description: 'Landlord details' })
  landlord?: RenewalUserDto;

  @ApiPropertyOptional({ description: 'Tenant details' })
  tenant?: RenewalUserDto;
}

export class RenewalPaginationMetaDto {
  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class RenewalListResponseDto {
  @ApiProperty({ description: 'List of lease renewals', type: [LeaseRenewalResponseDto] })
  data: LeaseRenewalResponseDto[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: RenewalPaginationMetaDto;
}
