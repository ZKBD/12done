import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenancePriority } from '@prisma/client';

export class UpdateMaintenanceRequestDto {
  @ApiPropertyOptional({
    description: 'Updated title',
    example: 'Leaking faucet in kitchen - urgent',
    minLength: 5,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'The kitchen faucet has been dripping constantly. Now there is water damage.',
    minLength: 20,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated priority level',
    enum: MaintenancePriority,
  })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({
    description: 'Updated preferred date',
    example: '2025-01-20',
  })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({
    description: 'Updated attachment URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}
