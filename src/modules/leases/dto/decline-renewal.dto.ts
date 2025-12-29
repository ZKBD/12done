import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeclineRenewalDto {
  @ApiPropertyOptional({
    description: 'Optional reason for declining the renewal offer',
    example: 'Found a more affordable apartment closer to work.',
  })
  @IsOptional()
  @IsString()
  declineReason?: string;
}
