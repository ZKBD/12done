import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators';
import { PushNotificationService } from './push-notification.service';
import { RegisterPushTokenDto, PushTokenResponseDto } from './dto/push-notification.dto';

@ApiTags('Push Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push-notifications')
export class PushNotificationController {
  constructor(private pushNotificationService: PushNotificationService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a device push token (PROD-041.4)' })
  @ApiResponse({ status: 201, type: PushTokenResponseDto })
  async registerToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<PushTokenResponseDto> {
    return this.pushNotificationService.registerToken(userId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get registered devices for push notifications' })
  @ApiResponse({ status: 200, type: [PushTokenResponseDto] })
  async getDevices(
    @CurrentUser('id') userId: string,
  ): Promise<PushTokenResponseDto[]> {
    return this.pushNotificationService.getTokensForUser(userId);
  }

  @Delete('devices/:tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a device from push notifications' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async unregisterDevice(
    @CurrentUser('id') userId: string,
    @Param('tokenId') tokenId: string,
  ): Promise<void> {
    await this.pushNotificationService.unregisterToken(userId, tokenId);
  }

  @Post('unregister')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister by token value (useful for logout)' })
  @ApiResponse({ status: 204 })
  async unregisterByToken(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
  ): Promise<void> {
    await this.pushNotificationService.unregisterTokenByValue(userId, token);
  }
}
