import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  postalCode?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class AuthTokensDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Access token expiration time in seconds' })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}
