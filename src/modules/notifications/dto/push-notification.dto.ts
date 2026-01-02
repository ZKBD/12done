import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PushPlatform } from '@prisma/client';

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'Device push token from FCM/APNs',
    example: 'dGVzdC1wdXNoLXRva2VuLWZyb20tZmNt',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Platform type',
    enum: PushPlatform,
    example: 'IOS',
  })
  @IsEnum(PushPlatform)
  platform: PushPlatform;

  @ApiPropertyOptional({
    description: 'Device identifier for management',
    example: 'device-uuid-12345',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'User-friendly device name',
    example: 'iPhone 15 Pro',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class PushTokenResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  platform: PushPlatform;

  @ApiPropertyOptional()
  deviceId?: string;

  @ApiPropertyOptional()
  deviceName?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class SendPushNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Notification body' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsOptional()
  data?: Record<string, string>;
}
