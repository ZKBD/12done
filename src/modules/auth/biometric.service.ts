import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '@/database';
import { generateUuid } from '@/common/utils';
import {
  EnrollBiometricDto,
  BiometricCredentialResponseDto,
  BiometricChallengeRequestDto,
  BiometricChallengeResponseDto,
  BiometricAuthenticateDto,
  UpdateBiometricDeviceDto,
  BiometricDeviceListResponseDto,
  BiometricSettingsResponseDto,
  BiometricVerificationDto,
  BiometricVerificationResponseDto,
} from './dto';
import { AuthTokensDto } from './dto';

// Challenge expiry in minutes
const CHALLENGE_EXPIRY_MINUTES = 5;

// Actions that require biometric verification (PROD-011.5)
const SENSITIVE_ACTIONS = [
  'payment',
  'profile_update',
  'password_change',
  'device_removal',
  'biometric_disable',
];

@Injectable()
export class BiometricService {
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresInDays: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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
    if (!match) return 900;
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

  /**
   * Enroll a new biometric device (PROD-011.1, PROD-011.2)
   */
  async enrollDevice(
    userId: string,
    dto: EnrollBiometricDto,
  ): Promise<BiometricCredentialResponseDto> {
    // Check if device is already enrolled for this user
    const existingCredential = await this.prisma.biometricCredential.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
    });

    if (existingCredential) {
      throw new ConflictException('This device is already enrolled');
    }

    // Validate public key format (basic check)
    if (!this.isValidBase64(dto.publicKey)) {
      throw new BadRequestException('Invalid public key format');
    }

    // Generate unique credential ID
    const credentialId = generateUuid();

    // Create the credential
    const credential = await this.prisma.biometricCredential.create({
      data: {
        userId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        deviceType: dto.deviceType,
        publicKey: dto.publicKey,
        credentialId,
      },
    });

    // Enable biometric for the user if not already enabled (PROD-011.3)
    await this.prisma.user.update({
      where: { id: userId },
      data: { biometricEnabled: true },
    });

    return this.toCredentialResponse(credential);
  }

  /**
   * Generate a challenge for biometric authentication (PROD-011.1)
   */
  async generateChallenge(
    dto: BiometricChallengeRequestDto,
  ): Promise<BiometricChallengeResponseDto> {
    // Check if device is enrolled
    const credential = await this.prisma.biometricCredential.findFirst({
      where: {
        deviceId: dto.deviceId,
        isActive: true,
      },
    });

    if (!credential) {
      throw new NotFoundException('Device not enrolled or inactive');
    }

    // Generate random challenge (32 bytes = 256 bits)
    const challengeBytes = crypto.randomBytes(32);
    const challenge = challengeBytes.toString('base64');

    // Set expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CHALLENGE_EXPIRY_MINUTES);

    // Store challenge
    await this.prisma.biometricChallenge.create({
      data: {
        challenge,
        deviceId: dto.deviceId,
        expiresAt,
      },
    });

    // Cleanup expired challenges (async, don't wait)
    this.cleanupExpiredChallenges().catch(() => {});

    return {
      challenge,
      expiresAt,
    };
  }

  /**
   * Authenticate using biometric signature (PROD-011.1)
   */
  async authenticate(
    dto: BiometricAuthenticateDto,
  ): Promise<{ user: { id: string; email: string }; tokens: AuthTokensDto }> {
    // Find the credential
    const credential = await this.prisma.biometricCredential.findFirst({
      where: {
        deviceId: dto.deviceId,
        credentialId: dto.credentialId,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    if (!credential) {
      throw new UnauthorizedException('Invalid credential');
    }

    // Check if user has biometric enabled
    if (!credential.user.biometricEnabled) {
      throw new UnauthorizedException('Biometric authentication is disabled');
    }

    // Verify challenge exists and is not expired
    const challengeRecord = await this.prisma.biometricChallenge.findUnique({
      where: { challenge: dto.challenge },
    });

    if (!challengeRecord) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    if (challengeRecord.usedAt) {
      throw new UnauthorizedException('Challenge already used');
    }

    if (new Date() > challengeRecord.expiresAt) {
      throw new UnauthorizedException('Challenge expired');
    }

    if (challengeRecord.deviceId !== dto.deviceId) {
      throw new UnauthorizedException('Challenge not issued for this device');
    }

    // Verify signature
    const isValid = this.verifySignature(
      dto.challenge,
      dto.signature,
      credential.publicKey,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Mark challenge as used
    await this.prisma.biometricChallenge.update({
      where: { id: challengeRecord.id },
      data: { usedAt: new Date() },
    });

    // Update last used timestamp
    await this.prisma.biometricCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(credential.user.id);

    return {
      user: {
        id: credential.user.id,
        email: credential.user.email,
      },
      tokens,
    };
  }

  /**
   * Get all enrolled devices for a user (PROD-011.2)
   */
  async getDevices(userId: string): Promise<BiometricDeviceListResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        biometricCredentials: {
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      devices: user.biometricCredentials.map((c) => this.toCredentialResponse(c)),
      biometricEnabled: user.biometricEnabled,
    };
  }

  /**
   * Update a biometric device (PROD-011.2)
   */
  async updateDevice(
    userId: string,
    credentialId: string,
    dto: UpdateBiometricDeviceDto,
  ): Promise<BiometricCredentialResponseDto> {
    const credential = await this.prisma.biometricCredential.findFirst({
      where: {
        credentialId,
        userId,
      },
    });

    if (!credential) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prisma.biometricCredential.update({
      where: { id: credential.id },
      data: {
        ...(dto.deviceName !== undefined && { deviceName: dto.deviceName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.toCredentialResponse(updated);
  }

  /**
   * Remove a biometric device (PROD-011.2)
   */
  async removeDevice(userId: string, credentialId: string): Promise<void> {
    const credential = await this.prisma.biometricCredential.findFirst({
      where: {
        credentialId,
        userId,
      },
    });

    if (!credential) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.biometricCredential.delete({
      where: { id: credential.id },
    });

    // Check if user has any remaining devices
    const remainingDevices = await this.prisma.biometricCredential.count({
      where: { userId },
    });

    // If no devices remain, optionally disable biometric
    if (remainingDevices === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { biometricEnabled: false },
      });
    }
  }

  /**
   * Enable or disable biometric authentication (PROD-011.3)
   */
  async updateBiometricSettings(
    userId: string,
    enabled: boolean,
  ): Promise<BiometricSettingsResponseDto> {
    // If enabling, check if user has enrolled devices
    if (enabled) {
      const deviceCount = await this.prisma.biometricCredential.count({
        where: { userId, isActive: true },
      });

      if (deviceCount === 0) {
        throw new BadRequestException(
          'No enrolled devices. Please enroll a device first.',
        );
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { biometricEnabled: enabled },
    });

    const enrolledDeviceCount = await this.prisma.biometricCredential.count({
      where: { userId },
    });

    return {
      biometricEnabled: enabled,
      enrolledDeviceCount,
    };
  }

  /**
   * Check if an action requires biometric verification (PROD-011.5)
   */
  isBiometricRequired(action: string): boolean {
    return SENSITIVE_ACTIONS.includes(action);
  }

  /**
   * Verify biometric for sensitive actions (PROD-011.5)
   */
  async verifyForSensitiveAction(
    userId: string,
    dto: BiometricVerificationDto,
  ): Promise<BiometricVerificationResponseDto> {
    // Check if user has biometric enabled
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.biometricEnabled) {
      // If biometric is not enabled, verification is not required
      return {
        verified: true,
        verifiedAt: new Date(),
        action: dto.action,
      };
    }

    // Perform the same verification as authenticate
    const credential = await this.prisma.biometricCredential.findFirst({
      where: {
        deviceId: dto.deviceId,
        credentialId: dto.credentialId,
        userId,
        isActive: true,
      },
    });

    if (!credential) {
      throw new UnauthorizedException('Invalid credential');
    }

    // Verify challenge
    const challengeRecord = await this.prisma.biometricChallenge.findUnique({
      where: { challenge: dto.challenge },
    });

    if (!challengeRecord) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    if (challengeRecord.usedAt) {
      throw new UnauthorizedException('Challenge already used');
    }

    if (new Date() > challengeRecord.expiresAt) {
      throw new UnauthorizedException('Challenge expired');
    }

    if (challengeRecord.deviceId !== dto.deviceId) {
      throw new UnauthorizedException('Challenge not issued for this device');
    }

    // Verify signature
    const isValid = this.verifySignature(
      dto.challenge,
      dto.signature,
      credential.publicKey,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Mark challenge as used
    await this.prisma.biometricChallenge.update({
      where: { id: challengeRecord.id },
      data: { usedAt: new Date() },
    });

    return {
      verified: true,
      verifiedAt: new Date(),
      action: dto.action,
    };
  }

  /**
   * Check if user has biometric enabled
   */
  async isUserBiometricEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { biometricEnabled: true },
    });

    return user?.biometricEnabled ?? false;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private isValidBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  private verifySignature(
    challenge: string,
    signature: string,
    publicKey: string,
  ): boolean {
    try {
      // Decode signature from base64
      const signatureBuffer = Buffer.from(signature, 'base64');

      // Create verifier using RSA-SHA256
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(challenge);
      verifier.end();

      // Verify the signature
      // The public key should be in PEM format or we need to construct it
      const publicKeyPem = this.ensurePemFormat(publicKey);
      return verifier.verify(publicKeyPem, signatureBuffer);
    } catch {
      return false;
    }
  }

  private ensurePemFormat(publicKey: string): string {
    // If already in PEM format, return as-is
    if (publicKey.includes('-----BEGIN')) {
      return publicKey;
    }

    // Convert base64 to PEM format
    const formatted = publicKey.match(/.{1,64}/g)?.join('\n') || publicKey;
    return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
  }

  private async generateTokens(userId: string): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d' },
    );

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresInDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
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

  private async cleanupExpiredChallenges(): Promise<void> {
    await this.prisma.biometricChallenge.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  private toCredentialResponse(
    credential: {
      id: string;
      deviceId: string;
      deviceName: string;
      deviceType: string;
      isActive: boolean;
      enrolledAt: Date;
      lastUsedAt: Date | null;
    },
  ): BiometricCredentialResponseDto {
    return {
      id: credential.id,
      deviceId: credential.deviceId,
      deviceName: credential.deviceName,
      deviceType: credential.deviceType as BiometricCredentialResponseDto['deviceType'],
      isActive: credential.isActive,
      enrolledAt: credential.enrolledAt,
      lastUsedAt: credential.lastUsedAt ?? undefined,
    };
  }
}
