import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO for admin to approve/reject verification (PROD-008.6)
 */
export class AdminReviewDto {
  @ApiProperty({
    description: 'Whether to approve the verification',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if not approved)',
    example: 'Document image is blurry and unreadable',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  rejectionReason?: string;
}

/**
 * Query DTO for admin verification queue (PROD-008.5)
 */
export class VerificationQueueQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    default: 'submittedAt',
  })
  @IsOptional()
  sortBy?: 'submittedAt' | 'documentType' = 'submittedAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    default: 'asc',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
