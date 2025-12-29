import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceRequestStatus,
  MaintenanceRequestType,
  MaintenancePriority,
} from '@prisma/client';

// Summary DTOs for related entities
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
}

export class ProviderSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  user: UserSummaryDto;
}

export class LeaseSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  status: string;
}

// Main response DTO
export class MaintenanceRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  leaseId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  landlordId: string;

  @ApiPropertyOptional()
  assignedProviderId?: string;

  @ApiProperty({ enum: MaintenanceRequestType })
  type: MaintenanceRequestType;

  @ApiProperty({ enum: MaintenancePriority })
  priority: MaintenancePriority;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  attachmentUrls: string[];

  @ApiProperty({ enum: MaintenanceRequestStatus })
  status: MaintenanceRequestStatus;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  preferredDate?: Date;

  @ApiPropertyOptional()
  scheduledDate?: Date;

  @ApiPropertyOptional()
  scheduledTimeSlot?: string;

  @ApiPropertyOptional()
  completionNotes?: string;

  @ApiProperty({ type: [String] })
  completionPhotos: string[];

  @ApiPropertyOptional()
  estimatedCost?: number;

  @ApiPropertyOptional()
  actualCost?: number;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  confirmedByTenant: boolean;

  @ApiProperty()
  confirmedByLandlord: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Related entities
  @ApiPropertyOptional({ type: PropertySummaryDto })
  property?: PropertySummaryDto;

  @ApiPropertyOptional({ type: LeaseSummaryDto })
  lease?: LeaseSummaryDto;

  @ApiPropertyOptional({ type: UserSummaryDto })
  tenant?: UserSummaryDto;

  @ApiPropertyOptional({ type: UserSummaryDto })
  landlord?: UserSummaryDto;

  @ApiPropertyOptional({ type: ProviderSummaryDto })
  assignedProvider?: ProviderSummaryDto;
}

// Pagination metadata
export class PaginationMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// List response
export class MaintenanceListResponseDto {
  @ApiProperty({ type: [MaintenanceRequestResponseDto] })
  data: MaintenanceRequestResponseDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;
}
