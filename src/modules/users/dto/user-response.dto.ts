import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import { SocialProfileResponseDto } from './social-profile.dto';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty({ enum: VerificationStatus })
  idVerificationStatus: VerificationStatus;

  @ApiProperty({ enum: VerificationStatus })
  backgroundCheckStatus: VerificationStatus;

  @ApiPropertyOptional({ type: [SocialProfileResponseDto] })
  socialProfiles?: SocialProfileResponseDto[];

  @ApiPropertyOptional({ description: 'ID of the user who invited this user' })
  invitedById?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserPublicResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty({ enum: VerificationStatus })
  idVerificationStatus: VerificationStatus;

  @ApiPropertyOptional({ type: [SocialProfileResponseDto] })
  socialProfiles?: SocialProfileResponseDto[];

  @ApiProperty()
  createdAt: Date;
}

export class InvitationNetworkNodeDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ description: 'Level in the invitation chain (1 = direct inviter)' })
  level: number;

  @ApiProperty()
  joinedAt: Date;
}

export class InvitationNetworkResponseDto {
  @ApiProperty({ description: 'The user whose network this is' })
  userId: string;

  @ApiProperty({ type: [InvitationNetworkNodeDto], description: 'Upstream invitation chain' })
  upstream: InvitationNetworkNodeDto[];

  @ApiProperty({ type: [InvitationNetworkNodeDto], description: 'Direct invitees' })
  directInvitees: InvitationNetworkNodeDto[];

  @ApiProperty({ description: 'Total count of all downstream invitees' })
  totalDownstreamCount: number;
}
