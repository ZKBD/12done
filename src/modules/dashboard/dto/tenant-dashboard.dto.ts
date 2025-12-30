import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

// ============================================
// QUERY DTO
// ============================================

export class TenantDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class TenantPropertySummaryDto {
  @ApiProperty({ description: 'Property ID' })
  id: string;

  @ApiProperty({ description: 'Property title' })
  title: string;

  @ApiProperty({ description: 'Property address' })
  address: string;

  @ApiProperty({ description: 'Property city' })
  city: string;

  @ApiPropertyOptional({ description: 'Primary image URL' })
  primaryImageUrl?: string;
}

export class TenantLandlordSummaryDto {
  @ApiProperty({ description: 'Landlord ID' })
  id: string;

  @ApiProperty({ description: 'Landlord first name' })
  firstName: string;

  @ApiProperty({ description: 'Landlord last name' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Landlord email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Landlord phone' })
  phone?: string;
}

export class TenantLeaseSummaryDto {
  @ApiProperty({ description: 'Lease ID' })
  id: string;

  @ApiProperty({ description: 'Property details' })
  property: TenantPropertySummaryDto;

  @ApiProperty({ description: 'Landlord details' })
  landlord: TenantLandlordSummaryDto;

  @ApiProperty({ description: 'Lease start date' })
  startDate: Date;

  @ApiProperty({ description: 'Lease end date' })
  endDate: Date;

  @ApiProperty({ description: 'Monthly rent amount' })
  rentAmount: number;

  @ApiProperty({ description: 'Rent currency' })
  currency: string;

  @ApiProperty({ description: 'Rent due day of month (1-28)' })
  dueDay: number;

  @ApiProperty({ description: 'Lease status' })
  status: string;

  @ApiProperty({ description: 'Security deposit amount' })
  securityDeposit: number | null;

  @ApiProperty({ description: 'Whether security deposit is paid' })
  securityDepositPaid: boolean;

  @ApiProperty({ description: 'Whether landlord has signed' })
  landlordSigned: boolean;

  @ApiProperty({ description: 'Whether tenant has signed' })
  tenantSigned: boolean;

  @ApiPropertyOptional({ description: 'Lease document URL' })
  documentUrl?: string;
}

export class TenantPaymentSummaryDto {
  @ApiProperty({ description: 'Payment ID' })
  id: string;

  @ApiProperty({ description: 'Lease ID' })
  leaseId: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle: string;

  @ApiProperty({ description: 'Payment due date' })
  dueDate: Date;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiPropertyOptional({ description: 'Date when paid' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'Amount paid' })
  paidAmount?: number;
}

export class TenantMaintenanceSummaryDto {
  @ApiProperty({ description: 'Maintenance request ID' })
  id: string;

  @ApiProperty({ description: 'Request title' })
  title: string;

  @ApiProperty({ description: 'Request type' })
  type: string;

  @ApiProperty({ description: 'Request status' })
  status: string;

  @ApiProperty({ description: 'Request priority' })
  priority: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle: string;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  scheduledDate?: Date;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;
}

export class TenantRenewalSummaryDto {
  @ApiProperty({ description: 'Renewal ID' })
  id: string;

  @ApiProperty({ description: 'Lease ID' })
  leaseId: string;

  @ApiProperty({ description: 'Property title' })
  propertyTitle: string;

  @ApiProperty({ description: 'Renewal status' })
  status: string;

  @ApiPropertyOptional({ description: 'Proposed start date' })
  proposedStartDate?: Date | null;

  @ApiPropertyOptional({ description: 'Proposed end date' })
  proposedEndDate?: Date | null;

  @ApiProperty({ description: 'Proposed rent amount' })
  proposedRentAmount: number;

  @ApiPropertyOptional({ description: 'Proposed terms/notes' })
  proposedTerms?: string;

  @ApiPropertyOptional({ description: 'Offer expiration date' })
  offerExpiresAt?: Date;
}

export class TenantDashboardResponseDto {
  // Overview stats
  @ApiProperty({ description: 'Number of active leases' })
  activeLeases: number;

  @ApiProperty({ description: 'Total rent amount across all active leases' })
  totalMonthlyRent: number;

  @ApiProperty({ description: 'Default currency' })
  currency: string;

  @ApiProperty({ description: 'Number of pending maintenance requests' })
  pendingMaintenanceRequests: number;

  @ApiProperty({ description: 'Number of unread messages' })
  unreadMessages: number;

  @ApiProperty({ description: 'Number of pending lease renewal offers' })
  pendingRenewals: number;

  @ApiProperty({ description: 'Total documents count' })
  documentsCount: number;

  // Detail data
  @ApiProperty({
    description: 'List of active leases',
    type: [TenantLeaseSummaryDto],
  })
  leases: TenantLeaseSummaryDto[];

  @ApiProperty({
    description: 'Upcoming payments (next 30 days)',
    type: [TenantPaymentSummaryDto],
  })
  upcomingPayments: TenantPaymentSummaryDto[];

  @ApiProperty({
    description: 'Overdue payments',
    type: [TenantPaymentSummaryDto],
  })
  overduePayments: TenantPaymentSummaryDto[];

  @ApiProperty({
    description: 'Active maintenance requests',
    type: [TenantMaintenanceSummaryDto],
  })
  maintenanceRequests: TenantMaintenanceSummaryDto[];

  @ApiProperty({
    description: 'Pending renewal offers',
    type: [TenantRenewalSummaryDto],
  })
  renewalOffers: TenantRenewalSummaryDto[];
}
