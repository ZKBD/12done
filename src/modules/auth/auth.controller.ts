import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { BiometricService } from './biometric.service';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from './guards';
import { Public, CurrentUser, CurrentUserData } from '@/common/decorators';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  CompleteProfileDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AuthResponseDto,
  MessageResponseDto,
  UserResponseDto,
  AuthTokensDto,
  EnrollBiometricDto,
  BiometricCredentialResponseDto,
  BiometricChallengeRequestDto,
  BiometricChallengeResponseDto,
  BiometricAuthenticateDto,
  UpdateBiometricDeviceDto,
  BiometricDeviceListResponseDto,
  UpdateBiometricSettingsDto,
  BiometricSettingsResponseDto,
  // MFA DTOs (NFR-014)
  SetupMfaResponseDto,
  VerifyMfaSetupDto,
  VerifyMfaSetupResponseDto,
  MfaPendingResponseDto,
  VerifyMfaLoginDto,
  MfaStatusResponseDto,
  RegenerateBackupCodesDto,
  BackupCodesResponseDto,
  DisableMfaDto,
  DisableMfaResponseDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly biometricService: BiometricService,
    private readonly mfaService: MfaService,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful, verification email sent',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error or passwords do not match' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto): Promise<MessageResponseDto> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verified, returns user and tokens',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokensDto }> {
    return this.authService.verifyEmail(dto);
  }

  @Post('complete-profile')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete user profile after email verification' })
  @ApiResponse({
    status: 200,
    description: 'Profile completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Profile already completed or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CompleteProfileDto,
  ): Promise<{ user: UserResponseDto; message: string }> {
    return this.authService.completeProfile(userId, dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful (or MFA pending if enabled)',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'MFA required - complete with /auth/mfa/verify-login',
    type: MfaPendingResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified email' })
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokensDto } | MfaPendingResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'New tokens generated',
    type: AuthTokensDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: MessageResponseDto,
  })
  async logout(@Body() dto: RefreshTokenDto): Promise<MessageResponseDto> {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'If account exists, reset email will be sent',
    type: MessageResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid token or passwords do not match' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: CurrentUserData): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }

  // Biometric Authentication Endpoints

  @Post('biometric/enroll')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll a device for biometric authentication' })
  @ApiResponse({
    status: 201,
    description: 'Device enrolled successfully',
    type: BiometricCredentialResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Device already enrolled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enrollBiometric(
    @CurrentUser('id') userId: string,
    @Body() dto: EnrollBiometricDto,
  ): Promise<BiometricCredentialResponseDto> {
    return this.biometricService.enrollDevice(userId, dto);
  }

  @Post('biometric/challenge')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a challenge for biometric authentication' })
  @ApiResponse({
    status: 200,
    description: 'Challenge generated',
    type: BiometricChallengeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getBiometricChallenge(
    @Body() dto: BiometricChallengeRequestDto,
  ): Promise<BiometricChallengeResponseDto> {
    return this.biometricService.generateChallenge(dto);
  }

  @Post('biometric/authenticate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate using biometric signature' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid signature or expired challenge' })
  async authenticateBiometric(
    @Body() dto: BiometricAuthenticateDto,
  ): Promise<{ user: { id: string; email: string }; tokens: AuthTokensDto }> {
    return this.biometricService.authenticate(dto);
  }

  @Get('biometric/devices')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List enrolled biometric devices' })
  @ApiResponse({
    status: 200,
    description: 'List of enrolled devices',
    type: BiometricDeviceListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBiometricDevices(
    @CurrentUser('id') userId: string,
  ): Promise<BiometricDeviceListResponseDto> {
    return this.biometricService.getDevices(userId);
  }

  @Patch('biometric/devices/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a biometric device' })
  @ApiResponse({
    status: 200,
    description: 'Device updated',
    type: BiometricCredentialResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateBiometricDevice(
    @CurrentUser('id') userId: string,
    @Param('id') credentialId: string,
    @Body() dto: UpdateBiometricDeviceDto,
  ): Promise<BiometricCredentialResponseDto> {
    return this.biometricService.updateDevice(userId, credentialId, dto);
  }

  @Delete('biometric/devices/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a biometric device' })
  @ApiResponse({ status: 204, description: 'Device removed' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeBiometricDevice(
    @CurrentUser('id') userId: string,
    @Param('id') credentialId: string,
  ): Promise<void> {
    await this.biometricService.removeDevice(userId, credentialId);
  }

  @Put('biometric/settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update biometric settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated',
    type: BiometricSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateBiometricSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBiometricSettingsDto,
  ): Promise<BiometricSettingsResponseDto> {
    return this.biometricService.updateBiometricSettings(userId, dto.enabled);
  }

  // ============================================
  // MFA Authentication Endpoints (NFR-014)
  // ============================================

  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin MFA setup - generates QR code and backup codes' })
  @ApiResponse({
    status: 201,
    description: 'MFA setup initiated',
    type: SetupMfaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'MFA already enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setupMfa(@CurrentUser('id') userId: string): Promise<SetupMfaResponseDto> {
    return this.mfaService.setupMfa(userId);
  }

  @Post('mfa/verify-setup')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA setup with TOTP code' })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
    type: VerifyMfaSetupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'MFA setup not initiated' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async verifyMfaSetup(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyMfaSetupDto,
  ): Promise<VerifyMfaSetupResponseDto> {
    return this.mfaService.verifySetup(userId, dto.code);
  }

  @Post('mfa/verify-login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with MFA code' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid MFA token or code' })
  async verifyMfaLogin(
    @Body() dto: VerifyMfaLoginDto,
  ): Promise<{ user: { id: string; email: string }; tokens: AuthTokensDto }> {
    return this.mfaService.verifyLogin(dto.mfaToken, dto.code);
  }

  @Get('mfa/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MFA status for current user' })
  @ApiResponse({
    status: 200,
    description: 'MFA status',
    type: MfaStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMfaStatus(@CurrentUser('id') userId: string): Promise<MfaStatusResponseDto> {
    return this.mfaService.getStatus(userId);
  }

  @Post('mfa/backup-codes')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate backup codes (requires password)' })
  @ApiResponse({
    status: 200,
    description: 'New backup codes generated',
    type: BackupCodesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'MFA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async regenerateBackupCodes(
    @CurrentUser('id') userId: string,
    @Body() dto: RegenerateBackupCodesDto,
  ): Promise<BackupCodesResponseDto> {
    return this.mfaService.regenerateBackupCodes(userId, dto.password);
  }

  @Delete('mfa')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA (requires password and TOTP code)' })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled',
    type: DisableMfaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'MFA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid password or code' })
  async disableMfa(
    @CurrentUser('id') userId: string,
    @Body() dto: DisableMfaDto,
  ): Promise<DisableMfaResponseDto> {
    return this.mfaService.disable(userId, dto.password, dto.code);
  }
}
