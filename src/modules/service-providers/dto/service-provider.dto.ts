import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ServiceType,
  ServiceProviderStatus,
  ServiceRequestStatus,
} from '@prisma/client';

// ============================================
// SERVICE PROVIDER APPLICATION (PROD-060)
// ============================================

export class CreateServiceProviderDto {
  @ApiProperty({
    description: 'Type of service to provide',
    enum: ServiceType,
    example: ServiceType.LAWYER,
  })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiPropertyOptional({
    description: 'Bio/description about the provider',
    example: 'Experienced real estate lawyer with 10+ years in the field...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Professional qualifications',
    example: 'JD from Harvard Law, licensed in NY and CA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  qualifications?: string;

  @ApiPropertyOptional({
    description: 'Years of experience or experience description',
    example: '10+ years specializing in real estate transactions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  experience?: string;

  @ApiPropertyOptional({
    description: 'Service-specific details as JSON',
    example: { yearsExperience: 10, hourlyRate: 150, specializations: ['residential', 'commercial'] },
  })
  @IsOptional()
  @IsObject()
  serviceDetails?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Service area coverage',
    example: { city: 'Budapest', radius: 25, country: 'HU' },
  })
  @IsOptional()
  @IsObject()
  serviceArea?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Supporting documents (URLs and metadata)',
    example: [{ type: 'license', url: 'https://...', name: 'Law License' }],
  })
  @IsOptional()
  @IsArray()
  documents?: Array<{ type: string; url: string; name: string }>;
}

export class UpdateServiceProviderDto {
  @ApiPropertyOptional({
    description: 'Bio/description about the provider',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Professional qualifications',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  qualifications?: string;

  @ApiPropertyOptional({
    description: 'Experience description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  experience?: string;

  @ApiPropertyOptional({
    description: 'Service-specific details as JSON',
  })
  @IsOptional()
  @IsObject()
  serviceDetails?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Service area coverage',
  })
  @IsOptional()
  @IsObject()
  serviceArea?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Supporting documents',
  })
  @IsOptional()
  @IsArray()
  documents?: Array<{ type: string; url: string; name: string }>;
}

// ============================================
// AVAILABILITY (PROD-062)
// ============================================

export class SetAvailabilitySlotDto {
  @ApiProperty({
    description: 'Day of the week (0=Sunday, 6=Saturday)',
    minimum: 0,
    maximum: 6,
    example: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '17:00',
  })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Whether this slot is available',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class SetWeeklyAvailabilityDto {
  @ApiProperty({
    description: 'Array of weekly availability slots',
    type: [SetAvailabilitySlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetAvailabilitySlotDto)
  slots: SetAvailabilitySlotDto[];
}

export class CreateAvailabilityExceptionDto {
  @ApiProperty({
    description: 'Date of the exception (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Whether available on this date (false = unavailable)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Reason for the exception',
    example: 'Christmas holiday',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

// ============================================
// SERVICE REQUESTS (PROD-063, PROD-064)
// ============================================

export class CreateServiceRequestDto {
  @ApiProperty({
    description: 'Type of service requested',
    enum: ServiceType,
    example: ServiceType.LAWYER,
  })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiPropertyOptional({
    description: 'Specific provider ID (if targeting a specific provider)',
  })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({
    description: 'Related property ID (if applicable)',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiProperty({
    description: 'Title/summary of the request',
    example: 'Need legal review of purchase contract',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the request',
    example: 'I need a lawyer to review the purchase contract for a property I am buying...',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Preferred date for the service',
    example: '2024-02-15',
  })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({
    description: 'Preferred time slot',
    example: '09:00-12:00',
  })
  @IsOptional()
  @IsString()
  preferredTimeSlot?: string;

  @ApiPropertyOptional({
    description: 'Urgency level',
    enum: ['normal', 'urgent', 'flexible'],
    example: 'normal',
  })
  @IsOptional()
  @IsIn(['normal', 'urgent', 'flexible'])
  urgency?: string;

  @ApiPropertyOptional({
    description: 'Service location address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'City for the service',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Country (ISO 3166-1 alpha-2)',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Budget for the service',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional({
    description: 'Currency for the budget',
    default: 'EUR',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class RespondToRequestDto {
  @ApiProperty({
    description: 'Response action',
    enum: ['accept', 'reject'],
    example: 'accept',
  })
  @IsIn(['accept', 'reject'])
  action: 'accept' | 'reject';

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if rejecting)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class CompleteRequestDto {
  @ApiPropertyOptional({
    description: 'Notes about the completed work',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  completionNotes?: string;
}

// ============================================
// QUERY DTOs (PROD-065)
// ============================================

export class ServiceProviderQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by service type',
    enum: ServiceType,
  })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({
    description: 'Filter by city',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by country (ISO 3166-1 alpha-2)',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Minimum average rating',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Search text for bio/qualifications',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['rating', 'reviews', 'createdAt'],
    default: 'rating',
  })
  @IsOptional()
  @IsIn(['rating', 'reviews', 'createdAt'])
  sortBy?: 'rating' | 'reviews' | 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class ServiceRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ServiceRequestStatus,
  })
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @ApiPropertyOptional({
    description: 'Filter by service type',
    enum: ServiceType,
  })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ============================================
// ADMIN DTOs (PROD-066)
// ============================================

export class AdminReviewDto {
  @ApiProperty({
    description: 'Approval decision',
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @ApiPropertyOptional({
    description: 'Admin notes about the decision',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;
}

export class AdminProviderQueryDto extends ServiceProviderQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by provider status',
    enum: ServiceProviderStatus,
  })
  @IsOptional()
  @IsEnum(ServiceProviderStatus)
  status?: ServiceProviderStatus;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class AvailabilitySlotResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() dayOfWeek: number;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty() isAvailable: boolean;
}

export class AvailabilityExceptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() date: Date;
  @ApiProperty() isAvailable: boolean;
  @ApiPropertyOptional() reason?: string;
}

export class ServiceProviderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: ServiceType }) serviceType: ServiceType;
  @ApiProperty({ enum: ServiceProviderStatus }) status: ServiceProviderStatus;
  @ApiPropertyOptional() bio?: string;
  @ApiPropertyOptional() qualifications?: string;
  @ApiPropertyOptional() experience?: string;
  @ApiPropertyOptional() serviceDetails?: Record<string, unknown>;
  @ApiPropertyOptional() serviceArea?: Record<string, unknown>;
  @ApiPropertyOptional() documents?: Array<{ type: string; url: string; name: string }>;
  @ApiProperty() profileCompleteness: number;
  @ApiProperty() isVerified: boolean;
  @ApiPropertyOptional() verifiedAt?: Date;
  @ApiProperty() averageRating: number;
  @ApiProperty() totalReviews: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  // Populated relations
  @ApiPropertyOptional() user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  @ApiPropertyOptional() availability?: AvailabilitySlotResponseDto[];
}

export class ServiceProviderListResponseDto {
  @ApiProperty({ type: [ServiceProviderResponseDto] })
  data: ServiceProviderResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ServiceRequestResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() requesterId: string;
  @ApiPropertyOptional() providerId?: string;
  @ApiProperty({ enum: ServiceType }) serviceType: ServiceType;
  @ApiPropertyOptional() propertyId?: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional() preferredDate?: Date;
  @ApiPropertyOptional() preferredTimeSlot?: string;
  @ApiPropertyOptional() urgency?: string;
  @ApiPropertyOptional() address?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() country?: string;
  @ApiPropertyOptional() budget?: string;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: ServiceRequestStatus }) status: ServiceRequestStatus;
  @ApiPropertyOptional() respondedAt?: Date;
  @ApiPropertyOptional() rejectionReason?: string;
  @ApiPropertyOptional() completedAt?: Date;
  @ApiPropertyOptional() completionNotes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  // Populated relations
  @ApiPropertyOptional() requester?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  @ApiPropertyOptional() provider?: ServiceProviderResponseDto;
  @ApiPropertyOptional() property?: {
    id: string;
    title: string;
    address: string;
    city: string;
  };
}

export class ServiceRequestListResponseDto {
  @ApiProperty({ type: [ServiceRequestResponseDto] })
  data: ServiceRequestResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// REVIEWS (PROD-068)
// ============================================

export class CreateReviewDto {
  @ApiProperty({
    description: 'Service request ID this review is for',
    example: 'uuid-request-123',
  })
  @IsString()
  serviceRequestId: string;

  @ApiProperty({
    description: 'Rating (1-5 stars)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Review title',
    example: 'Excellent service!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'The lawyer was very professional and thorough...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Whether the review is public',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: 'Rating (1-5 stars)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Review title',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Review comment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Whether the review is public',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ReviewQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by rating',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['rating', 'createdAt', 'helpfulCount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['rating', 'createdAt', 'helpfulCount'])
  sortBy?: 'rating' | 'createdAt' | 'helpfulCount';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class ReviewResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() providerId: string;
  @ApiProperty() reviewerId: string;
  @ApiProperty() serviceRequestId: string;
  @ApiProperty() rating: number;
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional() comment?: string;
  @ApiProperty() helpfulCount: number;
  @ApiProperty() isPublic: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  // Populated relations
  @ApiPropertyOptional() reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  @ApiPropertyOptional() serviceRequest?: {
    id: string;
    title: string;
    serviceType: ServiceType;
  };
}

export class ReviewListResponseDto {
  @ApiProperty({ type: [ReviewResponseDto] })
  data: ReviewResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  @ApiPropertyOptional()
  stats?: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  };
}
