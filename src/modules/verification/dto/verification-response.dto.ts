import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType, VerificationStatus, BackgroundCheckType } from '@prisma/client';

/**
 * Response DTO for verification request (PROD-008)
 */
export class VerificationRequestResponseDto {
  @ApiProperty({ description: 'Verification request ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: DocumentType, description: 'Type of document submitted' })
  documentType: DocumentType;

  @ApiProperty({ enum: VerificationStatus, description: 'Current verification status' })
  status: VerificationStatus;

  @ApiPropertyOptional({ description: 'Reason for rejection if rejected' })
  rejectionReason?: string | null;

  @ApiProperty({ description: 'When the verification was submitted' })
  submittedAt: Date;

  @ApiPropertyOptional({ description: 'When the verification was reviewed' })
  reviewedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Document expiration date' })
  expiresAt?: Date | null;
}

/**
 * Response DTO for background check (PROD-009)
 */
export class BackgroundCheckResponseDto {
  @ApiProperty({ description: 'Background check ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: BackgroundCheckType, description: 'Type of background check' })
  type: BackgroundCheckType;

  @ApiProperty({ enum: VerificationStatus, description: 'Current check status' })
  status: VerificationStatus;

  @ApiPropertyOptional({ description: 'High-level result summary' })
  resultSummary?: string | null;

  @ApiProperty({ description: 'When the check was requested' })
  requestedAt: Date;

  @ApiPropertyOptional({ description: 'When the check was completed' })
  completedAt?: Date | null;

  @ApiPropertyOptional({ description: 'When the check expires' })
  expiresAt?: Date | null;
}

/**
 * Combined verification status for a user (PROD-010)
 */
export class UserVerificationStatusDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: VerificationStatus, description: 'ID verification status' })
  idVerificationStatus: VerificationStatus;

  @ApiPropertyOptional({ description: 'When ID was verified' })
  idVerifiedAt?: Date | null;

  @ApiProperty({ enum: VerificationStatus, description: 'Background check status' })
  backgroundCheckStatus: VerificationStatus;

  @ApiPropertyOptional({ description: 'When background check was completed' })
  backgroundCheckAt?: Date | null;

  @ApiProperty({ description: 'Whether user has verified badge (PROD-010.2)' })
  hasVerifiedBadge: boolean;

  @ApiPropertyOptional({ description: 'Most recent verification request' })
  latestVerificationRequest?: VerificationRequestResponseDto | null;

  @ApiPropertyOptional({ description: 'Most recent background check' })
  latestBackgroundCheck?: BackgroundCheckResponseDto | null;
}

/**
 * Admin view of pending verification (PROD-008.5)
 */
export class PendingVerificationDto extends VerificationRequestResponseDto {
  @ApiProperty({ description: 'User email' })
  userEmail: string;

  @ApiProperty({ description: 'User full name' })
  userName: string;

  @ApiProperty({ description: 'Document URL for review (admin only)' })
  documentUrl: string;

  @ApiPropertyOptional({ description: 'Selfie URL for review (admin only)' })
  selfieUrl?: string | null;
}
