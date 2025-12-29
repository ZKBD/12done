import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MaintenanceRequestStatus,
  MaintenanceRequestType,
  MaintenancePriority,
} from '@prisma/client';

export class MaintenanceQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: MaintenanceRequestStatus,
  })
  @IsOptional()
  @IsEnum(MaintenanceRequestStatus)
  status?: MaintenanceRequestStatus;

  @ApiPropertyOptional({
    description: 'Filter by type',
    enum: MaintenanceRequestType,
  })
  @IsOptional()
  @IsEnum(MaintenanceRequestType)
  type?: MaintenanceRequestType;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: MaintenancePriority,
  })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: ['tenant', 'landlord', 'provider'],
  })
  @IsOptional()
  @IsIn(['tenant', 'landlord', 'provider'])
  role?: 'tenant' | 'landlord' | 'provider';

  @ApiPropertyOptional({
    description: 'Filter by property ID',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by lease ID',
  })
  @IsOptional()
  @IsUUID()
  leaseId?: string;
}
