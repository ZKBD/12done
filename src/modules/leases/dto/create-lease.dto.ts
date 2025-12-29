import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaseDto {
  @ApiProperty({ description: 'Property ID', example: 'uuid-here' })
  @IsString()
  propertyId: string;

  @ApiProperty({ description: 'Tenant user ID', example: 'uuid-here' })
  @IsString()
  tenantId: string;

  @ApiProperty({
    description: 'Lease start date',
    example: '2025-02-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Lease end date',
    example: '2026-01-31',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Monthly rent amount',
    example: 1500,
  })
  @IsNumber()
  @Min(0)
  rentAmount: number;

  @ApiPropertyOptional({
    description: 'Currency for rent (ISO 4217)',
    example: 'EUR',
    default: 'EUR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Day of month when rent is due (1-28)',
    example: 1,
    minimum: 1,
    maximum: 28,
  })
  @IsNumber()
  @Min(1)
  @Max(28)
  dueDay: number;

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
    example: false,
    default: false,
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
