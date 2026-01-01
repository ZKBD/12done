import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '@/database';
import { hashPassword, comparePassword, generateSecureToken } from '@/common/utils';
import {
  SetupMfaResponseDto,
  VerifyMfaSetupResponseDto,
  MfaPendingResponseDto,
  MfaStatusResponseDto,
  BackupCodesResponseDto,
  DisableMfaResponseDto,
} from './dto';
import { AuthTokensDto } from './dto/auth-response.dto';

// Constants
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const MFA_SESSION_EXPIRY_MINUTES = 5;
const APP_NAME = '12done';

@Injectable()
export class MfaService {
  private readonly encryptionKey: Buffer;
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresInDays: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Get or generate encryption key for MFA secrets
    const keyHex = this.configService.get<string>('MFA_ENCRYPTION_KEY');
    if (keyHex && keyHex.length === 64) {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    } else {
      // Fallback to derived key from JWT secret (not ideal for production)
      const jwtSecret = this.configService.get<string>('jwt.secret') || 'default-jwt-secret';
      this.encryptionKey = crypto.scryptSync(jwtSecret, 'mfa-salt', 32);
    }

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

  // ============================================
  // SECRET ENCRYPTION
  // ============================================

  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decryptSecret(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid encrypted secret format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // ============================================
  // BACKUP CODES
  // ============================================

  private generateBackupCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
      code += chars.charAt(crypto.randomInt(chars.length));
    }
    return code;
  }

  private async generateAndHashBackupCodes(): Promise<{ plainCodes: string[]; hashedCodes: string[] }> {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = this.generateBackupCode();
      plainCodes.push(code);
      hashedCodes.push(await hashPassword(code));
    }

    return { plainCodes, hashedCodes };
  }

  // ============================================
  // MFA SETUP
  // ============================================

  async setupMfa(userId: string): Promise<SetupMfaResponseDto> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if MFA is already enabled and verified
    if (user.mfaEnabled && user.mfaSecret?.isVerified) {
      throw new BadRequestException('MFA is already enabled. Disable it first to set up again.');
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret();
    const encryptedSecret = this.encryptSecret(secret);

    // Generate QR code
    const otpauth = authenticator.keyuri(user.email, APP_NAME, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const { plainCodes, hashedCodes } = await this.generateAndHashBackupCodes();

    // Save or update MFA secret (not verified yet)
    await this.prisma.$transaction(async (tx) => {
      // Delete existing unverified setup if any
      if (user.mfaSecret && !user.mfaSecret.isVerified) {
        await tx.mfaBackupCode.deleteMany({
          where: { mfaSecretId: user.mfaSecret.id },
        });
        await tx.mfaSecret.delete({
          where: { id: user.mfaSecret.id },
        });
      }

      // Create new MFA secret
      const mfaSecret = await tx.mfaSecret.create({
        data: {
          userId,
          encryptedSecret,
          isVerified: false,
        },
      });

      // Create backup codes
      await tx.mfaBackupCode.createMany({
        data: hashedCodes.map((codeHash) => ({
          mfaSecretId: mfaSecret.id,
          codeHash,
        })),
      });
    });

    return {
      secret,
      qrCodeUrl,
      backupCodes: plainCodes,
      message: 'Scan QR code with authenticator app and enter code to verify',
    };
  }

  async verifySetup(userId: string, code: string): Promise<VerifyMfaSetupResponseDto> {
    // Get user with MFA secret
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated. Call setup endpoint first.');
    }

    if (user.mfaSecret.isVerified) {
      throw new BadRequestException('MFA is already verified and enabled.');
    }

    // Decrypt and verify TOTP
    const secret = this.decryptSecret(user.mfaSecret.encryptedSecret);
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Enable MFA
    const enabledAt = new Date();
    await this.prisma.$transaction([
      this.prisma.mfaSecret.update({
        where: { id: user.mfaSecret.id },
        data: { isVerified: true, enabledAt },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      }),
    ]);

    return {
      message: 'MFA enabled successfully',
      enabledAt,
    };
  }

  // ============================================
  // MFA LOGIN
  // ============================================

  async createPendingSession(userId: string): Promise<MfaPendingResponseDto> {
    const token = `mfa_${generateSecureToken()}`;
    const expiresAt = new Date(Date.now() + MFA_SESSION_EXPIRY_MINUTES * 60 * 1000);

    // Clean up expired sessions for this user
    await this.prisma.mfaPendingSession.deleteMany({
      where: {
        OR: [
          { userId, expiresAt: { lt: new Date() } },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });

    // Create new pending session
    await this.prisma.mfaPendingSession.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return {
      mfaPending: true,
      mfaToken: token,
      expiresAt,
      message: 'Please enter your authenticator code',
    };
  }

  async verifyLogin(
    mfaToken: string,
    code: string,
  ): Promise<{ user: { id: string; email: string }; tokens: AuthTokensDto }> {
    // Find pending session
    const session = await this.prisma.mfaPendingSession.findUnique({
      where: { token: mfaToken },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired MFA session');
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.prisma.mfaPendingSession.delete({
        where: { id: session.id },
      });
      throw new UnauthorizedException('MFA session expired. Please login again.');
    }

    // Get user with MFA secret
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { mfaSecret: { include: { backupCodes: true } } },
    });

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('User or MFA configuration not found');
    }

    // Try TOTP verification first
    const secret = this.decryptSecret(user.mfaSecret.encryptedSecret);
    let isValid = authenticator.verify({ token: code, secret });

    // If TOTP fails, try backup codes
    if (!isValid) {
      isValid = await this.verifyBackupCode(user.mfaSecret.id, user.mfaSecret.backupCodes, code);
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Delete the pending session
    await this.prisma.mfaPendingSession.delete({
      where: { id: session.id },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: { id: user.id, email: user.email },
      tokens,
    };
  }

  private async verifyBackupCode(
    mfaSecretId: string,
    backupCodes: Array<{ id: string; codeHash: string; usedAt: Date | null }>,
    code: string,
  ): Promise<boolean> {
    // Normalize code (uppercase, no spaces)
    const normalizedCode = code.toUpperCase().replace(/\s/g, '');

    for (const backupCode of backupCodes) {
      // Skip used codes
      if (backupCode.usedAt) continue;

      const isMatch = await comparePassword(normalizedCode, backupCode.codeHash);
      if (isMatch) {
        // Mark code as used
        await this.prisma.mfaBackupCode.update({
          where: { id: backupCode.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }

    return false;
  }

  // ============================================
  // MFA STATUS & MANAGEMENT
  // ============================================

  async getStatus(userId: string): Promise<MfaStatusResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        mfaSecret: {
          include: {
            backupCodes: {
              where: { usedAt: null },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      enabled: user.mfaEnabled,
      enabledAt: user.mfaSecret?.enabledAt || undefined,
      backupCodesRemaining: user.mfaSecret?.backupCodes.length || 0,
    };
  }

  async regenerateBackupCodes(userId: string, password: string): Promise<BackupCodesResponseDto> {
    // Verify user and password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret?.isVerified) {
      throw new BadRequestException('MFA is not enabled');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate new backup codes
    const { plainCodes, hashedCodes } = await this.generateAndHashBackupCodes();

    // Replace old codes with new ones
    await this.prisma.$transaction([
      this.prisma.mfaBackupCode.deleteMany({
        where: { mfaSecretId: user.mfaSecret.id },
      }),
      this.prisma.mfaBackupCode.createMany({
        data: hashedCodes.map((codeHash) => ({
          mfaSecretId: user.mfaSecret!.id,
          codeHash,
        })),
      }),
    ]);

    return {
      codes: plainCodes,
      message: 'New backup codes generated. Save these in a secure place.',
    };
  }

  async disable(userId: string, password: string, code: string): Promise<DisableMfaResponseDto> {
    // Verify user and password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify TOTP code
    const secret = this.decryptSecret(user.mfaSecret.encryptedSecret);
    const isCodeValid = authenticator.verify({ token: code, secret });

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Disable MFA
    await this.prisma.$transaction([
      this.prisma.mfaBackupCode.deleteMany({
        where: { mfaSecretId: user.mfaSecret.id },
      }),
      this.prisma.mfaSecret.delete({
        where: { id: user.mfaSecret.id },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false },
      }),
    ]);

    // Clean up any pending MFA sessions
    await this.prisma.mfaPendingSession.deleteMany({
      where: { userId },
    });

    return {
      message: 'MFA has been disabled',
    };
  }

  // ============================================
  // TOKEN GENERATION (same pattern as BiometricService)
  // ============================================

  private async generateTokens(userId: string): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, status: user.status };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('jwt.expiresIn') || '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
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

  // ============================================
  // UTILITY: Check if MFA is required for user
  // ============================================

  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    return user?.mfaEnabled ?? false;
  }
}
