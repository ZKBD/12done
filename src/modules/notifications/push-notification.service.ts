import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database';
import { PushPlatform } from '@prisma/client';
import {
  RegisterPushTokenDto,
  PushTokenResponseDto,
  SendPushNotificationDto,
} from './dto/push-notification.dto';

/**
 * Firebase Cloud Messaging response structure
 */
interface FCMResponse {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Push Notification Service (PROD-041.4)
 *
 * Handles device token registration and push notification delivery via FCM.
 * Supports iOS (APNs via FCM), Android (FCM), and Web (FCM).
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly fcmServerKey: string | undefined;
  private readonly fcmEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');
    this.fcmEnabled = !!this.fcmServerKey;

    if (!this.fcmEnabled) {
      this.logger.warn('FCM_SERVER_KEY not configured. Push notifications will be logged but not sent.');
    }
  }

  /**
   * Register a device push token for a user
   */
  async registerToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<PushTokenResponseDto> {
    // Upsert: update existing or create new
    const token = await this.prisma.pushToken.upsert({
      where: {
        userId_token: { userId, token: dto.token },
      },
      create: {
        userId,
        token: dto.token,
        platform: dto.platform,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        isActive: true,
      },
      update: {
        platform: dto.platform,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Registered push token for user ${userId} (${dto.platform})`);
    return this.mapToResponseDto(token);
  }

  /**
   * Get all push tokens for a user
   */
  async getTokensForUser(userId: string): Promise<PushTokenResponseDto[]> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map((t) => this.mapToResponseDto(t));
  }

  /**
   * Unregister a push token
   */
  async unregisterToken(userId: string, tokenId: string): Promise<void> {
    const token = await this.prisma.pushToken.findUnique({
      where: { id: tokenId },
    });

    if (!token || token.userId !== userId) {
      throw new NotFoundException('Push token not found');
    }

    await this.prisma.pushToken.update({
      where: { id: tokenId },
      data: { isActive: false },
    });

    this.logger.log(`Unregistered push token ${tokenId} for user ${userId}`);
  }

  /**
   * Unregister a token by its value (useful for logout)
   */
  async unregisterTokenByValue(userId: string, tokenValue: string): Promise<void> {
    await this.prisma.pushToken.updateMany({
      where: { userId, token: tokenValue },
      data: { isActive: false },
    });
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    notification: SendPushNotificationDto,
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No active push tokens for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const token of tokens) {
      const success = await this.sendToToken(token.token, token.platform, notification);
      if (success) {
        // Update lastUsedAt
        await this.prisma.pushToken.update({
          where: { id: token.id },
          data: { lastUsedAt: new Date() },
        });
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: SendPushNotificationDto,
  ): Promise<{ sent: number; failed: number }> {
    let totalSent = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, notification);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return { sent: totalSent, failed: totalFailed };
  }

  /**
   * Send push notification to a specific token
   */
  private async sendToToken(
    token: string,
    platform: PushPlatform,
    notification: SendPushNotificationDto,
  ): Promise<boolean> {
    if (!this.fcmEnabled) {
      // Log the notification in development/test mode
      this.logger.debug(`[MOCK] Push notification to ${platform}: ${notification.title} - ${notification.body}`);
      return true;
    }

    try {
      const response = await this.sendFCMNotification(token, notification);

      if (response.success) {
        this.logger.debug(`Push notification sent successfully to ${platform} device`);
        return true;
      } else {
        // Handle specific FCM errors
        if (response.error?.code === 'messaging/invalid-registration-token' ||
            response.error?.code === 'messaging/registration-token-not-registered') {
          // Token is invalid, mark as inactive
          await this.prisma.pushToken.updateMany({
            where: { token },
            data: { isActive: false },
          });
          this.logger.warn(`Deactivated invalid push token: ${response.error.code}`);
        }
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error}`);
      return false;
    }
  }

  /**
   * Send notification via Firebase Cloud Messaging HTTP v1 API
   */
  private async sendFCMNotification(
    token: string,
    notification: SendPushNotificationDto,
  ): Promise<FCMResponse> {
    const fcmUrl = 'https://fcm.googleapis.com/fcm/send';

    const payload = {
      to: token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
    };

    try {
      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${this.fcmServerKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success === 1) {
        return { success: true, messageId: result.results?.[0]?.message_id };
      } else {
        const error = result.results?.[0]?.error;
        return {
          success: false,
          error: { code: error || 'unknown', message: error || 'Unknown error' },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'network_error', message: String(error) },
      };
    }
  }

  /**
   * Clean up old inactive tokens (run periodically)
   */
  async cleanupInactiveTokens(daysInactive: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const result = await this.prisma.pushToken.deleteMany({
      where: {
        isActive: false,
        updatedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} inactive push tokens`);
    return result.count;
  }

  private mapToResponseDto(token: {
    id: string;
    platform: PushPlatform;
    deviceId: string | null;
    deviceName: string | null;
    isActive: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
  }): PushTokenResponseDto {
    return {
      id: token.id,
      platform: token.platform,
      deviceId: token.deviceId || undefined,
      deviceName: token.deviceName || undefined,
      isActive: token.isActive,
      lastUsedAt: token.lastUsedAt || undefined,
      createdAt: token.createdAt,
    };
  }
}
