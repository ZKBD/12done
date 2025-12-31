import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches, MinLength } from 'class-validator';

// ============================================
// MFA SETUP DTOs (NFR-014.1)
// ============================================

/**
 * Response when initiating MFA setup.
 * Contains QR code and backup codes for user to save.
 */
export class SetupMfaResponseDto {
  @ApiProperty({
    description: 'TOTP secret for manual entry',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'QR code image as data URL (base64)',
    example: 'data:image/png;base64,iVBORw0KGgo...',
  })
  qrCodeUrl: string;

  @ApiProperty({
    description: 'Backup codes for account recovery (one-time use)',
    example: ['ABC12345', 'DEF67890', 'GHI11121'],
    type: [String],
  })
  backupCodes: string[];

  @ApiProperty({
    description: 'Message to display to user',
    example: 'Scan QR code with authenticator app and enter code to verify',
  })
  message: string;
}

/**
 * Request to verify MFA setup with TOTP code.
 */
export class VerifyMfaSetupDto {
  @ApiProperty({
    description: 'TOTP code from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

/**
 * Response after successful MFA verification.
 */
export class VerifyMfaSetupResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'MFA enabled successfully',
  })
  message: string;

  @ApiProperty({
    description: 'When MFA was enabled',
    example: '2024-01-15T10:30:00Z',
  })
  enabledAt: Date;
}

// ============================================
// MFA LOGIN DTOs (NFR-014.1)
// ============================================

/**
 * Response when login requires MFA verification.
 * Returned instead of tokens when user has MFA enabled.
 */
export class MfaPendingResponseDto {
  @ApiProperty({
    description: 'Indicates MFA is required',
    example: true,
  })
  mfaPending: boolean;

  @ApiProperty({
    description: 'Temporary token for MFA verification (expires in 5 minutes)',
    example: 'mfa_abc123def456',
  })
  mfaToken: string;

  @ApiProperty({
    description: 'When the MFA token expires',
    example: '2024-01-15T10:35:00Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Message to display',
    example: 'Please enter your authenticator code',
  })
  message: string;
}

/**
 * Request to complete login with MFA code.
 */
export class VerifyMfaLoginDto {
  @ApiProperty({
    description: 'MFA token received after password authentication',
    example: 'mfa_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  mfaToken: string;

  @ApiProperty({
    description: 'TOTP code from authenticator app or backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 8, { message: 'Code must be 6-8 characters' })
  code: string;
}

// ============================================
// MFA STATUS DTOs (NFR-014.1)
// ============================================

/**
 * Response for MFA status query.
 */
export class MfaStatusResponseDto {
  @ApiProperty({
    description: 'Whether MFA is enabled for user',
    example: true,
  })
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'When MFA was enabled',
    example: '2024-01-15T10:30:00Z',
  })
  enabledAt?: Date;

  @ApiProperty({
    description: 'Number of unused backup codes remaining',
    example: 8,
  })
  backupCodesRemaining: number;
}

// ============================================
// MFA BACKUP CODES DTOs (NFR-014.1)
// ============================================

/**
 * Request to regenerate backup codes.
 * Requires password for security.
 */
export class RegenerateBackupCodesDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'CurrentPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}

/**
 * Response containing new backup codes.
 */
export class BackupCodesResponseDto {
  @ApiProperty({
    description: 'New backup codes (save these securely)',
    example: ['ABC12345', 'DEF67890', 'GHI11121'],
    type: [String],
  })
  codes: string[];

  @ApiProperty({
    description: 'Message to display',
    example: 'New backup codes generated. Save these in a secure place.',
  })
  message: string;
}

// ============================================
// MFA DISABLE DTOs (NFR-014.1)
// ============================================

/**
 * Request to disable MFA.
 * Requires both password and TOTP code for security.
 */
export class DisableMfaDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'CurrentPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'TOTP code from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}

/**
 * Response after MFA is disabled.
 */
export class DisableMfaResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'MFA has been disabled',
  })
  message: string;
}
