import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  InsuranceType,
  MortgageProductType,
  InquiryStatus,
} from '@prisma/client';

// Create Inquiry to Insurance Provider (PROD-082.3)
export class CreateInsuranceInquiryDto {
  @ApiProperty({ description: 'Insurance provider ID' })
  @IsUUID()
  providerId: string;

  @ApiPropertyOptional({ description: 'Related property ID' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ description: 'Inquiry subject' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  subject: string;

  @ApiProperty({ description: 'Inquiry message' })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Callback phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Type of insurance interested in',
    enum: InsuranceType,
  })
  @IsOptional()
  @IsEnum(InsuranceType)
  insuranceType?: InsuranceType;
}

// Create Inquiry to Mortgage Provider (PROD-082.3)
export class CreateMortgageInquiryDto {
  @ApiProperty({ description: 'Mortgage provider ID' })
  @IsUUID()
  providerId: string;

  @ApiPropertyOptional({ description: 'Related property ID' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ description: 'Inquiry subject' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  subject: string;

  @ApiProperty({ description: 'Inquiry message' })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ description: 'Callback phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Type of mortgage product interested in',
    enum: MortgageProductType,
  })
  @IsOptional()
  @IsEnum(MortgageProductType)
  mortgageType?: MortgageProductType;

  @ApiPropertyOptional({ description: 'Desired loan amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  loanAmount?: number;

  @ApiPropertyOptional({ description: 'Down payment amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  downPayment?: number;

  @ApiPropertyOptional({ description: 'Credit score' })
  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(850)
  creditScore?: number;
}

// Provider Response to Inquiry (PROD-082.4)
export class RespondToInquiryDto {
  @ApiProperty({ description: 'Response message' })
  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  response: string;
}

// User Feedback on Inquiry (PROD-082.5)
export class SubmitInquiryFeedbackDto {
  @ApiProperty({ description: 'Rating (1-5 stars)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Feedback comment' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

// Query User's Inquiries
export class QueryInquiriesDto {
  @ApiPropertyOptional({
    description: 'Filter by provider type',
    enum: ['insurance', 'mortgage'],
  })
  @IsOptional()
  @IsString()
  providerType?: 'insurance' | 'mortgage';

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: InquiryStatus,
  })
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;

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
}

// Inquiry Response DTO
export class ProviderInquiryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  insuranceProviderId?: string;

  @ApiPropertyOptional()
  mortgageProviderId?: string;

  @ApiProperty()
  providerType: string;

  @ApiPropertyOptional()
  propertyId?: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: InsuranceType })
  insuranceType?: InsuranceType;

  @ApiPropertyOptional({ enum: MortgageProductType })
  mortgageType?: MortgageProductType;

  @ApiPropertyOptional()
  loanAmount?: number;

  @ApiPropertyOptional()
  downPayment?: number;

  @ApiPropertyOptional()
  creditScore?: number;

  @ApiProperty({ enum: InquiryStatus })
  status: InquiryStatus;

  @ApiPropertyOptional()
  viewedAt?: Date;

  @ApiPropertyOptional()
  respondedAt?: Date;

  @ApiPropertyOptional()
  response?: string;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  feedback?: string;

  @ApiPropertyOptional()
  feedbackAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Include provider info
  @ApiPropertyOptional()
  provider?: {
    id: string;
    companyName: string;
    companyLogo?: string;
  };
}

// Paginated Response
export class PaginatedInquiriesDto {
  @ApiProperty({ type: [ProviderInquiryResponseDto] })
  items: ProviderInquiryResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
