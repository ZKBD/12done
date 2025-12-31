import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '@/database';
import { MailService } from '@/mail';
import { hashPassword, comparePassword, generateSecureToken } from '@/common/utils';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  CompleteProfileDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AuthTokensDto,
  UserResponseDto,
  MfaPendingResponseDto,
} from './dto';
import { MfaService } from './mfa.service';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresInDays: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private mfaService: MfaService,
  ) {
    this.accessTokenExpiresIn = this.parseExpiresIn(
      this.configService.get<string>('jwt.expiresIn') || '15m',
    );
    this.refreshTokenExpiresInDays = this.parseRefreshExpiresIn(
      this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
    );
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const num = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      case 'd': return num * 86400;
      default: return 900;
    }
  }

  private parseRefreshExpiresIn(value: string): number {
    const match = value.match(/^(\d+)d$/);
    return match ? parseInt(match[1], 10) : 7;
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Handle invitation if token provided
    let inviterId: string | null = null;
    if (dto.invitationToken) {
      const invitation = await this.prisma.invitation.findUnique({
        where: { token: dto.invitationToken },
      });

      if (!invitation) {
        throw new BadRequestException('Invalid invitation token');
      }

      if (invitation.status !== 'PENDING') {
        throw new BadRequestException('This invitation has already been used or expired');
      }

      if (new Date() > invitation.expiresAt) {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
        throw new BadRequestException('This invitation has expired');
      }

      inviterId = invitation.inviterId;
    }

    // Create user
    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: UserStatus.PENDING_VERIFICATION,
        invitedById: inviterId,
      },
    });

    // Update invitation if used
    if (dto.invitationToken && inviterId) {
      await this.prisma.invitation.update({
        where: { token: dto.invitationToken },
        data: {
          status: 'ACCEPTED',
          acceptedUserId: user.id,
          acceptedAt: new Date(),
        },
      });
    }

    // Create verification token
    const verificationToken = generateSecureToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    await this.mailService.sendVerificationEmail(
      user.email,
      user.firstName,
      verificationToken,
    );

    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ user: UserResponseDto; tokens: AuthTokensDto }> {
    const verificationRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!verificationRecord) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationRecord.usedAt) {
      throw new BadRequestException('This token has already been used');
    }

    if (new Date() > verificationRecord.expiresAt) {
      throw new BadRequestException('Verification token has expired');
    }

    // Update user and token
    const user = await this.prisma.user.update({
      where: { id: verificationRecord.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: UserStatus.PENDING_PROFILE,
      },
    });

    await this.prisma.emailVerificationToken.update({
      where: { id: verificationRecord.id },
      data: { usedAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role, user.status);

    return {
      user: this.mapUserToDto(user),
      tokens,
    };
  }

  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<{ user: UserResponseDto; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING_PROFILE) {
      throw new BadRequestException('Profile already completed or email not verified');
    }

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        address: dto.address,
        postalCode: dto.postalCode,
        city: dto.city,
        country: dto.country.toUpperCase(),
        phone: dto.phone,
        status: UserStatus.ACTIVE,
      },
    });

    // Send welcome email
    await this.mailService.sendWelcomeEmail(updatedUser.email, updatedUser.firstName);

    return {
      user: this.mapUserToDto(updatedUser),
      message: 'Profile completed successfully. Welcome to 12done.com!',
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: UserResponseDto; tokens: AuthTokensDto } | MfaPendingResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('This account no longer exists');
    }

    // Check if MFA is enabled (NFR-014)
    if (user.mfaEnabled) {
      return this.mfaService.createPendingSession(user.id);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.status);

    return {
      user: this.mapUserToDto(user),
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshTokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > refreshTokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const { user } = refreshTokenRecord;

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Account is not active');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(user.id, user.email, user.role, user.status);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (tokenRecord && !tokenRecord.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user || user.status === UserStatus.DELETED) {
      return { message: 'If an account exists with this email, you will receive a password reset link' };
    }

    // Invalidate any existing reset tokens
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Create new reset token
    const resetToken = generateSecureToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    await this.mailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

    return { message: 'If an account exists with this email, you will receive a password reset link' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid reset token');
    }

    if (resetRecord.usedAt) {
      throw new BadRequestException('This reset token has already been used');
    }

    if (new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Update password
    const passwordHash = await hashPassword(dto.password);
    await this.prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: resetRecord.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToDto(user);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    status: string,
  ): Promise<AuthTokensDto> {
    const payload = { sub: userId, email, role, status };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
    });

    const refreshToken = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresInDays);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  private mapUserToDto(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    role: string;
    status: string;
    emailVerified: boolean;
    createdAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || undefined,
      address: user.address || undefined,
      postalCode: user.postalCode || undefined,
      city: user.city || undefined,
      country: user.country || undefined,
      role: user.role as UserResponseDto['role'],
      status: user.status as UserResponseDto['status'],
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
