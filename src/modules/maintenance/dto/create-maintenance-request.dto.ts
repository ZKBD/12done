import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceRequestType,
  MaintenancePriority,
} from '@prisma/client';

export class CreateMaintenanceRequestDto {
  @ApiProperty({
    description: 'Lease ID for the property where maintenance is needed',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  leaseId: string;

  @ApiProperty({
    description: 'Type of maintenance required',
    enum: MaintenanceRequestType,
    example: MaintenanceRequestType.PLUMBING,
  })
  @IsEnum(MaintenanceRequestType)
  type: MaintenanceRequestType;

  @ApiPropertyOptional({
    description: 'Priority level of the request',
    enum: MaintenancePriority,
    default: MaintenancePriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiProperty({
    description: 'Brief title describing the issue',
    example: 'Leaking faucet in kitchen',
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the maintenance issue',
    example: 'The kitchen faucet has been dripping constantly for the past two days. Water is pooling under the sink.',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: 'Preferred date for the maintenance visit',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({
    description: 'URLs of photos or documents showing the issue',
    example: ['https://storage.example.com/photo1.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}
