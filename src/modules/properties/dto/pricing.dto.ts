import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDynamicPricingRuleDto {
  @ApiProperty({
    description: 'Name of the pricing rule',
    example: 'Summer Season',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Start date for date-based rule',
    example: '2024-06-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date-based rule',
    example: '2024-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Day of week for weekly recurring rule (0=Sunday, 6=Saturday)',
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  dayOfWeek?: number;

  @ApiProperty({
    description: 'Price multiplier (e.g., 1.20 = 20% increase, 0.80 = 20% discount)',
    example: '1.20',
  })
  @IsString()
  @IsNotEmpty()
  priceMultiplier: string;

  @ApiPropertyOptional({
    description: 'Is the rule active?',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Priority (higher = applied first)',
    example: 10,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;
}

export class UpdateDynamicPricingRuleDto {
  @ApiPropertyOptional({
    description: 'Name of the pricing rule',
    example: 'Summer Season',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Start date for date-based rule',
    example: '2024-06-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date-based rule',
    example: '2024-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Day of week for weekly recurring rule (0=Sunday, 6=Saturday)',
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Price multiplier (e.g., 1.20 = 20% increase, 0.80 = 20% discount)',
    example: '1.20',
  })
  @IsOptional()
  @IsString()
  priceMultiplier?: string;

  @ApiPropertyOptional({
    description: 'Is the rule active?',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Priority (higher = applied first)',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;
}

export class DynamicPricingRuleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  dayOfWeek?: number;

  @ApiProperty()
  priceMultiplier: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  createdAt: Date;
}
