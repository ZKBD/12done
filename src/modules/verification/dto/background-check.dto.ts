import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsBoolean, IsOptional, IsString } from 'class-validator';
import { BackgroundCheckType } from '@prisma/client';

/**
 * DTO for requesting a background check (PROD-009.2)
 */
export class RequestBackgroundCheckDto {
  @ApiProperty({
    enum: BackgroundCheckType,
    description: 'Type of background check to perform',
    example: 'STANDARD',
  })
  @IsEnum(BackgroundCheckType)
  type: BackgroundCheckType;

  @ApiProperty({
    description: 'User consent to background check (PROD-009.5)',
    example: true,
  })
  @IsBoolean()
  consent: boolean;

  @ApiPropertyOptional({
    description: 'IP address where consent was given',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  consentIpAddress?: string;
}

/**
 * DTO for webhook callback from background check provider (PROD-009.3)
 */
export class BackgroundCheckWebhookDto {
  @ApiProperty({
    description: 'Provider reference ID',
    example: 'checkr-12345',
  })
  @IsString()
  providerReference: string;

  @ApiProperty({
    description: 'Check status from provider',
    example: 'completed',
  })
  @IsString()
  status: 'completed' | 'pending' | 'failed';

  @ApiPropertyOptional({
    description: 'Result summary',
    example: 'CLEAR',
  })
  @IsOptional()
  @IsString()
  resultSummary?: 'CLEAR' | 'REVIEW' | 'FLAGGED';

  @ApiPropertyOptional({
    description: 'URL to full report',
    example: 'https://provider.com/reports/12345',
  })
  @IsOptional()
  @IsString()
  reportUrl?: string;
}
