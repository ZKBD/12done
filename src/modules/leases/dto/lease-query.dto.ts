import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeaseStatus } from '@prisma/client';

export class LeaseQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by lease status',
    enum: LeaseStatus,
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @ApiPropertyOptional({
    description: 'Filter by role (tenant or landlord)',
    enum: ['tenant', 'landlord'],
    example: 'landlord',
  })
  @IsOptional()
  @IsEnum(['tenant', 'landlord'])
  role?: 'tenant' | 'landlord';
}
