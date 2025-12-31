import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BiometricDeviceType } from '@prisma/client';

// ============================================
// ENROLLMENT DTOs (PROD-011.1, PROD-011.2)
// ============================================

export class EnrollBiometricDto {
  @ApiProperty({
    description: 'Unique device identifier from the mobile device',
    example: 'device-uuid-12345',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  deviceId: string;

  @ApiProperty({
    description: 'Human-readable device name',
    example: 'iPhone 14 Pro',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  deviceName: string;

  @ApiProperty({
    description: 'Device platform type',
    enum: BiometricDeviceType,
    example: BiometricDeviceType.IOS,
  })
  @IsEnum(BiometricDeviceType)
  deviceType: BiometricDeviceType;

  @ApiProperty({
    description: 'Base64-encoded public key for signature verification',
    example: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
  })
  @IsString()
  @MinLength(1)
  publicKey: string;
}

export class BiometricCredentialResponseDto {
  @ApiProperty({ description: 'Unique credential ID' })
  id: string;

  @ApiProperty({ description: 'Unique device identifier' })
  deviceId: string;

  @ApiProperty({ description: 'Human-readable device name' })
  deviceName: string;

  @ApiProperty({
    description: 'Device platform type',
    enum: BiometricDeviceType,
  })
  deviceType: BiometricDeviceType;

  @ApiProperty({ description: 'Whether the credential is active' })
  isActive: boolean;

  @ApiProperty({ description: 'When the device was enrolled' })
  enrolledAt: Date;

  @ApiPropertyOptional({ description: 'When the device was last used for authentication' })
  lastUsedAt?: Date;
}

// ============================================
// AUTHENTICATION DTOs (PROD-011.1)
// ============================================

export class BiometricChallengeRequestDto {
  @ApiProperty({
    description: 'Device ID requesting authentication',
    example: 'device-uuid-12345',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  deviceId: string;
}

export class BiometricChallengeResponseDto {
  @ApiProperty({
    description: 'Base64-encoded challenge to sign',
    example: 'dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U=',
  })
  challenge: string;

  @ApiProperty({ description: 'When the challenge expires' })
  expiresAt: Date;
}

export class BiometricAuthenticateDto {
  @ApiProperty({
    description: 'Device ID used for authentication',
    example: 'device-uuid-12345',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  deviceId: string;

  @ApiProperty({
    description: 'Unique credential identifier',
    example: 'cred-uuid-12345',
  })
  @IsString()
  @MinLength(1)
  credentialId: string;

  @ApiProperty({
    description: 'Base64-encoded signature of the challenge',
    example: 'SGVsbG8gV29ybGQh...',
  })
  @IsString()
  @MinLength(1)
  signature: string;

  @ApiProperty({
    description: 'The challenge that was signed',
    example: 'dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U=',
  })
  @IsString()
  @MinLength(1)
  challenge: string;
}

// ============================================
// DEVICE MANAGEMENT DTOs (PROD-011.2)
// ============================================

export class UpdateBiometricDeviceDto {
  @ApiPropertyOptional({
    description: 'Updated device name',
    example: 'My Work Phone',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Whether the credential is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BiometricDeviceListResponseDto {
  @ApiProperty({
    description: 'List of enrolled biometric devices',
    type: [BiometricCredentialResponseDto],
  })
  devices: BiometricCredentialResponseDto[];

  @ApiProperty({
    description: 'Whether biometric authentication is enabled for this user',
  })
  biometricEnabled: boolean;
}

// ============================================
// SETTINGS DTOs (PROD-011.3)
// ============================================

export class UpdateBiometricSettingsDto {
  @ApiProperty({
    description: 'Enable or disable biometric authentication',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
}

export class BiometricSettingsResponseDto {
  @ApiProperty({
    description: 'Whether biometric authentication is enabled',
  })
  biometricEnabled: boolean;

  @ApiProperty({
    description: 'Number of enrolled devices',
  })
  enrolledDeviceCount: number;
}

// ============================================
// BIOMETRIC VERIFICATION DTOs (PROD-011.5)
// ============================================

export class BiometricVerificationDto {
  @ApiProperty({
    description: 'Device ID used for verification',
    example: 'device-uuid-12345',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  deviceId: string;

  @ApiProperty({
    description: 'Unique credential identifier',
    example: 'cred-uuid-12345',
  })
  @IsString()
  @MinLength(1)
  credentialId: string;

  @ApiProperty({
    description: 'Base64-encoded signature of the challenge',
    example: 'SGVsbG8gV29ybGQh...',
  })
  @IsString()
  @MinLength(1)
  signature: string;

  @ApiProperty({
    description: 'The challenge that was signed',
    example: 'dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U=',
  })
  @IsString()
  @MinLength(1)
  challenge: string;

  @ApiProperty({
    description: 'The action being verified',
    example: 'payment',
  })
  @IsString()
  @MinLength(1)
  action: string;
}

export class BiometricVerificationResponseDto {
  @ApiProperty({
    description: 'Whether the biometric verification was successful',
  })
  verified: boolean;

  @ApiProperty({
    description: 'Timestamp of verification',
  })
  verifiedAt: Date;

  @ApiProperty({
    description: 'The action that was verified',
  })
  action: string;
}
