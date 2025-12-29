import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsUUID,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignProviderDto {
  @ApiProperty({
    description: 'ID of the service provider to assign',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  providerId: string;

  @ApiPropertyOptional({
    description: 'Scheduled date for the maintenance',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Time slot for the maintenance (HH:MM-HH:MM format)',
    example: '09:00-12:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/, {
    message: 'Time slot must be in format HH:MM-HH:MM',
  })
  scheduledTimeSlot?: string;

  @ApiPropertyOptional({
    description: 'Estimated cost of the maintenance work',
    example: 150.00,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;
}
