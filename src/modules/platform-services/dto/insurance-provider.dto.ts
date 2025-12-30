import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsInt,
  IsArray,
  IsEnum,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InsuranceType, PlatformProviderStatus } from '@prisma/client';

// Create Insurance Provider Application (PROD-081.1)
export class CreateInsuranceProviderDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsOptional()
  @IsUrl()
  companyLogo?: string;

  @ApiProperty({ description: 'Insurance license number' })
  @IsString()
  @MinLength(2)
  licenseNumber: string;

  @ApiProperty({ description: 'State where licensed' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  licenseState: string;

  @ApiPropertyOptional({ description: 'License expiry date' })
  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;

  @ApiPropertyOptional({ description: 'Tax ID/EIN' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ description: 'Contact email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Company website' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Office address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country (default: US)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Year company was founded' })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  yearFounded?: number;

  @ApiPropertyOptional({ description: 'Number of employees' })
  @IsOptional()
  @IsInt()
  @Min(1)
  employeeCount?: number;

  @ApiProperty({
    description: 'Types of insurance offered',
    enum: InsuranceType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(InsuranceType, { each: true })
  insuranceTypes: InsuranceType[];

  @ApiPropertyOptional({
    description: 'States/regions where coverage is offered',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageAreas?: string[];

  @ApiPropertyOptional({ description: 'Application notes' })
  @IsOptional()
  @IsString()
  applicationNotes?: string;

  @ApiPropertyOptional({
    description: 'Supporting documents',
    example: [{ type: 'license', url: 'https://...', name: 'License.pdf' }],
  })
  @IsOptional()
  @IsArray()
  documents?: Array<{ type: string; url: string; name: string }>;
}

// Update Insurance Provider (PROD-082.1)
export class UpdateInsuranceProviderDto {
  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsOptional()
  @IsUrl()
  companyLogo?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Company website' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Office address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Year company was founded' })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  yearFounded?: number;

  @ApiPropertyOptional({ description: 'Number of employees' })
  @IsOptional()
  @IsInt()
  @Min(1)
  employeeCount?: number;

  @ApiPropertyOptional({
    description: 'Types of insurance offered',
    enum: InsuranceType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InsuranceType, { each: true })
  insuranceTypes?: InsuranceType[];

  @ApiPropertyOptional({
    description: 'States/regions where coverage is offered',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageAreas?: string[];
}

// Admin Update Status (PROD-081.5)
export class UpdateProviderStatusDto {
  @ApiProperty({
    description: 'New status',
    enum: PlatformProviderStatus,
  })
  @IsEnum(PlatformProviderStatus)
  status: PlatformProviderStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  statusReason?: string;
}

// Query Insurance Providers (PROD-080.2)
export class QueryInsuranceProvidersDto {
  @ApiPropertyOptional({ description: 'Filter by insurance type' })
  @IsOptional()
  @IsEnum(InsuranceType)
  insuranceType?: InsuranceType;

  @ApiPropertyOptional({ description: 'Filter by coverage area (state)' })
  @IsOptional()
  @IsString()
  coverageArea?: string;

  @ApiPropertyOptional({ description: 'Show only platform partners' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  platformPartnersOnly?: boolean;

  @ApiPropertyOptional({ description: 'Minimum average rating' })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['rating', 'responseTime', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'rating' | 'responseTime' | 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// Insurance Provider Response DTO
export class InsuranceProviderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  companyLogo?: string;

  @ApiProperty()
  licenseNumber: string;

  @ApiProperty()
  licenseState: string;

  @ApiPropertyOptional()
  licenseExpiry?: Date;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  yearFounded?: number;

  @ApiPropertyOptional()
  employeeCount?: number;

  @ApiProperty({ enum: InsuranceType, isArray: true })
  insuranceTypes: InsuranceType[];

  @ApiProperty({ type: [String] })
  coverageAreas: string[];

  @ApiProperty({ enum: PlatformProviderStatus })
  status: PlatformProviderStatus;

  @ApiProperty()
  isPlatformPartner: boolean;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  responseRate: number;

  @ApiPropertyOptional()
  avgResponseTime?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Paginated Response
export class PaginatedInsuranceProvidersDto {
  @ApiProperty({ type: [InsuranceProviderResponseDto] })
  items: InsuranceProviderResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
