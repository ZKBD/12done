import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';

// DTO for owner to review application
export class ReviewApplicationDto {
  @ApiProperty({
    description: 'New application status',
    enum: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    example: 'APPROVED',
  })
  @IsString()
  @IsIn(['UNDER_REVIEW', 'APPROVED', 'REJECTED'])
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Owner notes about the application',
    example: 'Great references, approved for move-in on requested date.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ownerNotes?: string;
}

// Status values that can be set by owner
export const OWNER_ALLOWED_STATUSES: ApplicationStatus[] = [
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
];
