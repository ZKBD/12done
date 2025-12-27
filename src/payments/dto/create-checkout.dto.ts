import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @ApiPropertyOptional({
    description: 'Custom success URL (optional, uses default if not provided)',
    example: 'https://12done.com/payments/success',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom cancel URL (optional, uses default if not provided)',
    example: 'https://12done.com/payments/cancel',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  cancelUrl?: string;
}
