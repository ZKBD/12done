import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLeaseDto {
  @ApiPropertyOptional({
    description: 'Lease start date',
    example: '2025-02-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Lease end date',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Monthly rent amount',
    example: 1500,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentAmount?: number;

  @ApiPropertyOptional({
    description: 'Currency for rent (ISO 4217)',
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Day of month when rent is due (1-28)',
    example: 1,
    minimum: 1,
    maximum: 28,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  dueDay?: number;

  @ApiPropertyOptional({
    description: 'Security deposit amount',
    example: 3000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({
    description: 'Whether security deposit has been paid',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  securityDepositPaid?: boolean;

  @ApiPropertyOptional({
    description: 'URL to lease document',
    example: 'https://storage.example.com/lease.pdf',
  })
  @IsOptional()
  @IsString()
  documentUrl?: string;
}
