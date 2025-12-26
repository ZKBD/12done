import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAvailabilitySlotDto {
  @ApiProperty({
    description: 'Start date of availability period',
    example: '2024-03-01',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date of availability period',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Is the property available during this period?',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Price per night for short-term rentals',
    example: '120.00',
  })
  @IsOptional()
  @IsString()
  pricePerNight?: string;

  @ApiPropertyOptional({
    description: 'Notes about this availability period',
    example: 'Minimum 3 nights stay',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAvailabilitySlotDto {
  @ApiPropertyOptional({
    description: 'Is the property available during this period?',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Price per night for short-term rentals',
    example: '120.00',
  })
  @IsOptional()
  @IsString()
  pricePerNight?: string;

  @ApiPropertyOptional({
    description: 'Notes about this availability period',
    example: 'Minimum 3 nights stay',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAvailabilityDto {
  @ApiProperty({
    description: 'List of availability slots to create',
    type: [CreateAvailabilitySlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilitySlotDto)
  slots: CreateAvailabilitySlotDto[];
}

export class AvailabilitySlotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  isAvailable: boolean;

  @ApiPropertyOptional()
  pricePerNight?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;
}

export class AvailabilityQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for availability query',
    example: '2024-03-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for availability query',
    example: '2024-03-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CalculateCostDto {
  @ApiProperty({
    description: 'Check-in date',
    example: '2024-03-10',
  })
  @IsDateString()
  @IsNotEmpty()
  checkIn: string;

  @ApiProperty({
    description: 'Check-out date',
    example: '2024-03-15',
  })
  @IsDateString()
  @IsNotEmpty()
  checkOut: string;
}

export class CostCalculationResponseDto {
  @ApiProperty({ description: 'Check-in date' })
  checkIn: Date;

  @ApiProperty({ description: 'Check-out date' })
  checkOut: Date;

  @ApiProperty({ description: 'Number of nights' })
  nights: number;

  @ApiProperty({ description: 'Base price per night' })
  basePricePerNight: string;

  @ApiProperty({
    description: 'Breakdown by night with applied pricing rules',
    type: 'array',
  })
  breakdown: Array<{
    date: string;
    basePrice: string;
    multiplier: string;
    finalPrice: string;
    appliedRule?: string;
  }>;

  @ApiProperty({ description: 'Subtotal before any fees' })
  subtotal: string;

  @ApiProperty({ description: 'Total cost including all fees' })
  total: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;
}
