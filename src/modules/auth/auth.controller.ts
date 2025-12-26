import {
  Controller,
  Post,
  Body,
  Get,
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
} from './dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified email' })
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokensDto }> {
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
}
