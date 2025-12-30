import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enum matching Prisma TenantDocumentType
export enum TenantDocumentTypeEnum {
  LEASE_AGREEMENT = 'LEASE_AGREEMENT',
  SIGNED_LEASE = 'SIGNED_LEASE',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  MOVE_IN_CHECKLIST = 'MOVE_IN_CHECKLIST',
  MOVE_OUT_CHECKLIST = 'MOVE_OUT_CHECKLIST',
  NOTICE = 'NOTICE',
  OTHER = 'OTHER',
}

// ============================================
// CREATE DTO
// ============================================

export class CreateTenantDocumentDto {
  @ApiProperty({
    description: 'Lease ID this document belongs to',
    example: 'uuid-lease-id',
  })
  @IsString()
  @IsNotEmpty()
  leaseId: string;

  @ApiProperty({
    description: 'Document type',
    enum: TenantDocumentTypeEnum,
    example: TenantDocumentTypeEnum.LEASE_AGREEMENT,
  })
  @IsEnum(TenantDocumentTypeEnum)
  type: TenantDocumentTypeEnum;

  @ApiProperty({
    description: 'Document display name',
    example: 'Lease Agreement - January 2025',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Document description',
    example: 'Original lease agreement for apartment 4B',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL to the document',
    example: 'https://storage.example.com/documents/lease-123.pdf',
  })
  @IsUrl()
  documentUrl: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 102400,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'MIME type of the document',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

// ============================================
// QUERY DTO
// ============================================

export class TenantDocumentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by lease ID',
    example: 'uuid-lease-id',
  })
  @IsOptional()
  @IsString()
  leaseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by document type',
    enum: TenantDocumentTypeEnum,
  })
  @IsOptional()
  @IsEnum(TenantDocumentTypeEnum)
  type?: TenantDocumentTypeEnum;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class TenantDocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Lease ID' })
  leaseId: string;

  @ApiProperty({
    description: 'Document type',
    enum: TenantDocumentTypeEnum,
  })
  type: TenantDocumentTypeEnum;

  @ApiProperty({ description: 'Document name' })
  name: string;

  @ApiPropertyOptional({ description: 'Document description' })
  description?: string;

  @ApiProperty({ description: 'Document URL' })
  documentUrl: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  mimeType?: string;

  @ApiProperty({ description: 'User ID who uploaded' })
  uploadedById: string;

  @ApiProperty({ description: 'Upload date' })
  createdAt: Date;

  // Populated in response
  @ApiPropertyOptional({ description: 'Property title (from lease)' })
  propertyTitle?: string;
}

export class TenantDocumentListResponseDto {
  @ApiProperty({
    description: 'List of documents',
    type: [TenantDocumentResponseDto],
  })
  data: TenantDocumentResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
