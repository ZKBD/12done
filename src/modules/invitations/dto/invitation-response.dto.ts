import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '@prisma/client';

export class InvitationResponseDto {
  @ApiProperty({
    description: 'Unique invitation ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Email address the invitation was sent to',
    example: 'friend@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Current status of the invitation',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @ApiProperty({
    description: 'Whether this invitation is eligible for kickback when used',
    example: true,
  })
  kickbackEligible: boolean;

  @ApiProperty({
    description: 'When the invitation expires',
    example: '2024-01-15T12:00:00.000Z',
  })
  expiresAt: Date;

  @ApiPropertyOptional({
    description: 'When the invitation was accepted (if applicable)',
    example: '2024-01-10T14:30:00.000Z',
  })
  acceptedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of the user who accepted (if applicable)',
    example: 'user-uuid-here',
  })
  acceptedUserId?: string;

  @ApiPropertyOptional({
    description: 'Basic info about who accepted the invitation',
  })
  acceptedUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({
    description: 'When the invitation was created',
    example: '2024-01-08T10:00:00.000Z',
  })
  createdAt: Date;
}

export class InvitationStatsDto {
  @ApiProperty({
    description: 'Total number of invitations sent',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Number of pending invitations',
    example: 5,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of accepted invitations',
    example: 3,
  })
  accepted: number;

  @ApiProperty({
    description: 'Number of expired invitations',
    example: 2,
  })
  expired: number;

  @ApiProperty({
    description: 'Number of kickback-eligible accepted invitations',
    example: 2,
  })
  kickbackEligible: number;
}
