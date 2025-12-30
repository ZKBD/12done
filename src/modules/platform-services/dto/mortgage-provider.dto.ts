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
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MortgageProductType, PlatformProviderStatus } from '@prisma/client';

// Create Mortgage Provider Application (PROD-081.2)
export class CreateMortgageProviderDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsOptional()
  @IsUrl()
  companyLogo?: string;

  @ApiProperty({ description: 'NMLS ID (required for mortgage providers)' })
  @IsString()
  @MinLength(4)
  nmlsId: string;

  @ApiPropertyOptional({ description: 'Additional state license number' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ description: 'State where licensed' })
  @IsOptional()
  @IsString()
  licenseState?: string;

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
    description: 'Types of mortgage products offered',
    enum: MortgageProductType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(MortgageProductType, { each: true })
  productTypes: MortgageProductType[];

  @ApiPropertyOptional({ description: 'Minimum loan amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minLoanAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum loan amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxLoanAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum credit score requirement' })
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(850)
  minCreditScore?: number;

  @ApiPropertyOptional({
    description: 'States where lending is available',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lendingAreas?: string[];

  @ApiPropertyOptional({
    description: 'Current interest rates by product type',
    example: { FIXED_30: 6.5, FIXED_15: 5.75 },
  })
  @IsOptional()
  rates?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Application notes' })
  @IsOptional()
  @IsString()
  applicationNotes?: string;

  @ApiPropertyOptional({
    description: 'Supporting documents',
    example: [{ type: 'license', url: 'https://...', name: 'NMLS.pdf' }],
  })
  @IsOptional()
  @IsArray()
  documents?: Array<{ type: string; url: string; name: string }>;
}

// Update Mortgage Provider (PROD-082.2)
export class UpdateMortgageProviderDto {
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
    description: 'Types of mortgage products offered',
    enum: MortgageProductType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MortgageProductType, { each: true })
  productTypes?: MortgageProductType[];

  @ApiPropertyOptional({ description: 'Minimum loan amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minLoanAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum loan amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxLoanAmount?: number;

  @ApiPropertyOptional({ description: 'Minimum credit score requirement' })
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(850)
  minCreditScore?: number;

  @ApiPropertyOptional({
    description: 'States where lending is available',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lendingAreas?: string[];

  @ApiPropertyOptional({
    description: 'Current interest rates by product type',
    example: { FIXED_30: 6.5, FIXED_15: 5.75 },
  })
  @IsOptional()
  rates?: Record<string, number>;
}

// Query Mortgage Providers (PROD-080.3)
export class QueryMortgageProvidersDto {
  @ApiPropertyOptional({ description: 'Filter by product type' })
  @IsOptional()
  @IsEnum(MortgageProductType)
  productType?: MortgageProductType;

  @ApiPropertyOptional({ description: 'Filter by lending area (state)' })
  @IsOptional()
  @IsString()
  lendingArea?: string;

  @ApiPropertyOptional({ description: 'Filter by loan amount (in cents)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  loanAmount?: number;

  @ApiPropertyOptional({ description: 'Filter by credit score' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(300)
  @Max(850)
  creditScore?: number;

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
    enum: ['rating', 'responseTime', 'rates', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'rating' | 'responseTime' | 'rates' | 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// Mortgage Provider Response DTO
export class MortgageProviderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  companyLogo?: string;

  @ApiProperty()
  nmlsId: string;

  @ApiPropertyOptional()
  licenseNumber?: string;

  @ApiPropertyOptional()
  licenseState?: string;

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

  @ApiProperty({ enum: MortgageProductType, isArray: true })
  productTypes: MortgageProductType[];

  @ApiPropertyOptional()
  minLoanAmount?: number;

  @ApiPropertyOptional()
  maxLoanAmount?: number;

  @ApiPropertyOptional()
  minCreditScore?: number;

  @ApiProperty({ type: [String] })
  lendingAreas: string[];

  @ApiPropertyOptional({ description: 'Current rates by product type' })
  rates?: Record<string, number>;

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
export class PaginatedMortgageProvidersDto {
  @ApiProperty({ type: [MortgageProviderResponseDto] })
  items: MortgageProviderResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
