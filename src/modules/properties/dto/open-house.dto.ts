import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateOpenHouseDto {
  @ApiProperty({
    description: 'Date for the open house event',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Start time (HH:mm format)',
    example: '10:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time (HH:mm format)',
    example: '14:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Optional description or details about the open house',
    example: 'Refreshments provided. Free parking available.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the open house is visible to all users',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of attendees allowed',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;
}

export class UpdateOpenHouseDto {
  @ApiPropertyOptional({
    description: 'Date for the open house event',
    example: '2024-03-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Start time (HH:mm format)',
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time (HH:mm format)',
    example: '14:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Optional description or details about the open house',
    example: 'Refreshments provided. Free parking available.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the open house is visible to all users',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of attendees allowed',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;
}

export class OpenHouseResponseDto {
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

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isPublic: boolean;

  @ApiPropertyOptional()
  maxAttendees?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OpenHouseQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific date (YYYY-MM-DD)',
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

  @ApiPropertyOptional({
    description: 'Filter to only show upcoming open houses (from today onwards)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  upcomingOnly?: boolean;
}
