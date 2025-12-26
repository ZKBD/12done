import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInspectionSlotDto {
  @ApiProperty({
    description: 'Date for the inspection',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Start time (HH:mm format)',
    example: '09:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time (HH:mm format)',
    example: '09:30',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;
}

export class BulkInspectionSlotsDto {
  @ApiProperty({
    description: 'List of inspection slots to create',
    type: [CreateInspectionSlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionSlotDto)
  slots: CreateInspectionSlotDto[];
}

export class BookInspectionDto {
  @ApiPropertyOptional({
    description: 'Optional message to the property owner',
    example: 'Looking forward to seeing the property!',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class InspectionSlotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  isBooked: boolean;

  @ApiPropertyOptional()
  bookedById?: string;

  @ApiPropertyOptional()
  bookedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };

  @ApiPropertyOptional()
  bookedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class InspectionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by date (YYYY-MM-DD)',
    example: '2024-03-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range query',
    example: '2024-03-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range query',
    example: '2024-03-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
